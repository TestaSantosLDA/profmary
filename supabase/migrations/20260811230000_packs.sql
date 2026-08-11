-- Prepaid lesson packs (design handoff 15).
--
-- A credit is one lesson whatever its length. Packs are per-service
-- templates; a purchase is an account-level balance (a guardian's children
-- share it) that exists only after Maria confirms offline payment. The
-- ledger is the truth: lessons_remaining is a cache maintained by trigger,
-- and no balance ever changes without a ledger row to explain it.

-- ---------------------------------------------------------------------------
-- pack templates

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  lessons integer not null check (lessons > 0),
  price_per_lesson_cents integer not null check (price_per_lesson_cents >= 0),
  validity_months integer check (validity_months > 0), -- null = never expires
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger packs_updated_at
  before update on public.packs
  for each row execute function public.set_updated_at();

create index packs_service_idx on public.packs (service_id) where active;

alter table public.packs enable row level security;

-- The pricing page is public.
create policy "Anyone can read packs"
  on public.packs for select
  using (true);

create policy "Admins insert packs"
  on public.packs for insert
  with check (public.is_admin());

create policy "Admins update packs"
  on public.packs for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- purchases

-- Snapshots (lessons_total, price_per_lesson, validity) are taken at request
-- time so template edits never retroactively change what someone bought.
create table public.pack_purchases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  pack_id uuid not null references public.packs (id),
  service_id uuid not null references public.services (id),
  lessons_total integer not null check (lessons_total > 0),
  lessons_remaining integer not null default 0 check (lessons_remaining >= 0),
  price_per_lesson_cents integer not null,
  price_paid_cents integer not null,
  validity_months integer,
  status text not null default 'requested'
    check (status in ('requested', 'active', 'declined', 'expired')),
  -- Validity counts from the moment Maria confirms payment, not the request.
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pack_purchases_updated_at
  before update on public.pack_purchases
  for each row execute function public.set_updated_at();

create index pack_purchases_account_idx
  on public.pack_purchases (account_id, service_id) where status = 'active';
create index pack_purchases_status_idx on public.pack_purchases (status);

alter table public.pack_purchases enable row level security;

create policy "Owners and admins read purchases"
  on public.pack_purchases for select
  using (account_id = auth.uid() or public.is_admin());

-- Requests are inserted server-side with the service client (the snapshot
-- prices must come from the template, never from the browser); activation
-- and decline are admin updates.
create policy "Admins update purchases"
  on public.pack_purchases for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- ledger

-- One row per movement. 'purchase' opens the balance on activation,
-- 'lesson' spends, 'cancel_refund' returns a cancelled lesson,
-- 'cancel_consume' (delta 0) records Maria's decision to keep it spent,
-- 'manual_adjust' covers offline agreements, 'expiry' zeroes what expired —
-- so a vanished balance is always explainable.
create table public.pack_ledger (
  id uuid primary key default gen_random_uuid(),
  pack_purchase_id uuid not null references public.pack_purchases (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  delta_lessons integer not null,
  reason text not null check (
    reason in ('purchase', 'lesson', 'cancel_refund', 'cancel_consume', 'manual_adjust', 'expiry')
  ),
  note text,
  created_at timestamptz not null default now(),
  check (delta_lessons <> 0 or reason = 'cancel_consume')
);

create index pack_ledger_purchase_idx
  on public.pack_ledger (pack_purchase_id, created_at);
create index pack_ledger_booking_idx
  on public.pack_ledger (booking_id) where booking_id is not null;

alter table public.pack_ledger enable row level security;

create policy "Owners and admins read ledger"
  on public.pack_ledger for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.pack_purchases p
      where p.id = pack_purchase_id and p.account_id = auth.uid()
    )
  );

create policy "Admins insert ledger rows"
  on public.pack_ledger for insert
  with check (public.is_admin());

-- The cache follows the ledger, never the other way around. The purchase's
-- lessons_remaining >= 0 check makes overdraft an insert-time failure here.
create or replace function public.apply_pack_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pack_purchases
  set lessons_remaining = lessons_remaining + new.delta_lessons
  where id = new.pack_purchase_id;
  return new;
end;
$$;

create trigger pack_ledger_apply
  after insert on public.pack_ledger
  for each row execute function public.apply_pack_ledger();

-- Append-only: corrections are new manual_adjust rows, never edits.
create or replace function public.pack_ledger_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pack_ledger is append-only';
end;
$$;

create trigger pack_ledger_no_update
  before update or delete on public.pack_ledger
  for each row execute function public.pack_ledger_immutable();

-- ---------------------------------------------------------------------------
-- bookings

-- When set, the lesson costs no money regardless of duration: price and
-- onsite fee are stored as 0 so every existing money surface stays correct.
alter table public.bookings
  add column paid_with_pack_purchase_id uuid references public.pack_purchases (id);

alter table public.booking_series
  add column paid_with_pack_purchase_id uuid references public.pack_purchases (id);

create index bookings_pack_idx
  on public.bookings (paid_with_pack_purchase_id)
  where paid_with_pack_purchase_id is not null;

-- ---------------------------------------------------------------------------
-- cron: spend credits as lessons occur; expire what lapsed

-- Series occurrences are not reserved up front (a weekly series may outlive
-- the balance); each confirmed pack lesson spends its credit once its start
-- time passes. Singles spend at request time, so their ledger row already
-- exists and the sweep skips them. When the balance is gone the lesson
-- converts back to a money lesson at current rates.
create or replace function public.pack_spend_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_service public.services%rowtype;
  v_settings public.settings%rowtype;
  v_price integer;
  v_fee integer;
  v_minutes integer;
  v_count integer;
  v_spent integer := 0;
begin
  select * into v_settings from public.settings;

  for v_booking in
    select b.*
    from public.bookings b
    where b.status = 'confirmed'
      and b.paid_with_pack_purchase_id is not null
      and b.starts_at <= now()
      and not exists (
        select 1 from public.pack_ledger l
        where l.booking_id = b.id and l.reason = 'lesson'
      )
  loop
    begin
      insert into public.pack_ledger (pack_purchase_id, booking_id, delta_lessons, reason)
      values (v_booking.paid_with_pack_purchase_id, v_booking.id, -1, 'lesson');
      v_spent := v_spent + 1;
    exception
      when check_violation then
        -- Pack exhausted (or expired) before this occurrence: it becomes a
        -- payable lesson at current rates, and shows up in the money totals.
        select * into v_service from public.services where id = v_booking.service_id;
        v_minutes := round(extract(epoch from (v_booking.ends_at - v_booking.starts_at)) / 60);
        v_count := greatest(jsonb_array_length(v_booking.attendee_names), 1);
        v_fee := 0;
        if v_booking.mode = 'onsite' then
          v_fee := coalesce(v_service.onsite_fee_override_cents, v_settings.onsite_fee_cents);
          if v_settings.onsite_fee_mode = 'per_hour' then
            v_fee := round(v_fee * v_minutes / 60.0);
          end if;
        end if;
        v_price := round(v_service.hourly_rate_cents * v_minutes * v_count / 60.0) + v_fee;

        update public.bookings
        set paid_with_pack_purchase_id = null,
            price_estimate_cents = v_price,
            onsite_fee_applied_cents = v_fee
        where id = v_booking.id;
    end;
  end loop;

  return v_spent;
end;
$$;

revoke execute on function public.pack_spend_due() from anon, authenticated;

-- Expiry writes a negative ledger row so the balance is visibly zeroed,
-- never silently vanished.
create or replace function public.pack_expire()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase record;
  v_expired integer := 0;
begin
  for v_purchase in
    select * from public.pack_purchases
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
  loop
    if v_purchase.lessons_remaining > 0 then
      insert into public.pack_ledger (pack_purchase_id, delta_lessons, reason)
      values (v_purchase.id, -v_purchase.lessons_remaining, 'expiry');
    end if;

    update public.pack_purchases
    set status = 'expired'
    where id = v_purchase.id;

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

revoke execute on function public.pack_expire() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_booking_series gains the pack parameter (new signature: drop first)

drop function public.create_booking_series(uuid, date, text, integer, jsonb, text, text, date, integer);

create function public.create_booking_series(
  p_service_id uuid,
  p_first_date date,
  p_start_time text,
  p_duration_minutes integer,
  p_attendee_names jsonb,
  p_address text,
  p_mode text default 'onsite',
  p_end_date date default null,
  p_window_months integer default 3,
  p_pack_purchase_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_service public.services%rowtype;
  v_settings public.settings%rowtype;
  v_purchase public.pack_purchases%rowtype;
  v_series_id uuid;
  v_price integer;
  v_fee integer := 0;
  v_count integer;
  v_address text := coalesce(p_address, '');
  v_date date := p_first_date;
  v_horizon date := (current_date + make_interval(months => p_window_months))::date + 7;
  v_starts timestamptz;
  v_blocked boolean;
begin
  if v_user is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select * into v_service from public.services where id = p_service_id and active;
  if v_service.id is null then
    return jsonb_build_object('error', 'unknown_service');
  end if;

  if p_mode not in ('online', 'onsite')
     or (p_mode = 'online' and not v_service.allows_online)
     or (p_mode = 'onsite' and not v_service.allows_onsite) then
    return jsonb_build_object('error', 'invalid_mode');
  end if;
  if p_mode = 'onsite' and trim(v_address) = '' then
    return jsonb_build_object('error', 'missing_address');
  end if;
  if p_mode = 'online' then
    v_address := '';
  end if;

  v_count := jsonb_array_length(p_attendee_names);
  if v_count = 0 then
    return jsonb_build_object('error', 'missing_attendees');
  end if;
  if v_service.attendee_cap <> -1 and v_count > v_service.attendee_cap then
    return jsonb_build_object('error', 'too_many_attendees');
  end if;
  if p_end_date is not null and p_end_date < p_first_date then
    return jsonb_build_object('error', 'invalid_end_date');
  end if;

  -- Pack lessons cost no money; credits are spent per occurrence by the
  -- hourly job, not reserved for the whole series up front.
  if p_pack_purchase_id is not null then
    select * into v_purchase from public.pack_purchases
    where id = p_pack_purchase_id
      and account_id = v_user
      and service_id = p_service_id
      and status = 'active'
      and lessons_remaining > 0
      and (expires_at is null or expires_at > now());
    if v_purchase.id is null then
      return jsonb_build_object('error', 'pack_empty');
    end if;
    v_price := 0;
    v_fee := 0;
  else
    if p_mode = 'onsite' then
      select * into v_settings from public.settings;
      v_fee := coalesce(v_service.onsite_fee_override_cents, v_settings.onsite_fee_cents);
      if v_settings.onsite_fee_mode = 'per_hour' then
        v_fee := round(v_fee * p_duration_minutes / 60.0);
      end if;
    end if;
    v_price := round(v_service.hourly_rate_cents * p_duration_minutes * v_count / 60.0) + v_fee;
  end if;

  insert into public.booking_series
    (user_id, service_id, weekday, start_time, duration_minutes,
     attendee_names, address, status, end_date, mode, onsite_fee_applied_cents,
     paid_with_pack_purchase_id)
  values
    (v_user, p_service_id, extract(dow from p_first_date)::smallint,
     p_start_time::time, p_duration_minutes, p_attendee_names, v_address,
     'pending', p_end_date, p_mode, v_fee, p_pack_purchase_id)
  returning id into v_series_id;

  while v_date <= v_horizon and (p_end_date is null or v_date <= p_end_date) loop
    v_starts := (v_date::text || ' ' || p_start_time)::timestamp
                at time zone 'Europe/Lisbon';
    v_blocked := exists (
      select 1 from public.blockouts b
      where v_date between b.start_date and b.end_date
    );

    insert into public.bookings
      (user_id, service_id, series_id, starts_at, ends_at, buffered_until,
       attendee_names, address, status, price_estimate_cents,
       mode, onsite_fee_applied_cents, paid_with_pack_purchase_id)
    values
      (v_user, p_service_id, v_series_id, v_starts,
       v_starts + make_interval(mins => p_duration_minutes),
       v_starts + make_interval(mins => p_duration_minutes), -- overwritten by trigger
       p_attendee_names, v_address,
       case when v_blocked then 'skipped_blockout'::public.booking_status
            else 'pending'::public.booking_status end,
       v_price, p_mode, v_fee, p_pack_purchase_id);

    v_date := v_date + 7;
  end loop;

  return jsonb_build_object('series_id', v_series_id);
exception
  when exclusion_violation then
    return jsonb_build_object('error', 'slot_taken');
end;
$$;

grant execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, text, date, integer, uuid) to authenticated;
revoke execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, text, date, integer, uuid) from anon;

-- Materialized occurrences inherit the series' pack reference; when the pack
-- has since died, they materialize as money lessons at current rates.
create or replace function public.materialize_series(p_window_months integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series record;
  v_service public.services%rowtype;
  v_settings public.settings%rowtype;
  v_horizon date := (current_date + make_interval(months => p_window_months))::date + 7;
  v_last date;
  v_date date;
  v_starts timestamptz;
  v_blocked boolean;
  v_price integer;
  v_fee integer;
  v_pack uuid;
  v_pack_live boolean;
  v_count integer;
  v_inserted integer := 0;
begin
  select * into v_settings from public.settings;

  update public.booking_series
  set status = 'ended'
  where status = 'active' and end_date is not null and end_date < current_date;

  for v_series in
    select * from public.booking_series where status = 'active'
  loop
    select max((starts_at at time zone 'Europe/Lisbon')::date),
           max(price_estimate_cents)
    into v_last, v_price
    from public.bookings
    where series_id = v_series.id;

    if v_last is null then
      continue;
    end if;

    v_pack := v_series.paid_with_pack_purchase_id;
    v_fee := v_series.onsite_fee_applied_cents;
    if v_pack is not null then
      v_pack_live := exists (
        select 1 from public.pack_purchases p
        where p.id = v_pack and p.status = 'active'
      );
      if v_pack_live then
        v_price := 0;
        v_fee := 0;
      else
        -- The pack is gone: new occurrences are money lessons again.
        v_pack := null;
        select * into v_service from public.services where id = v_series.service_id;
        v_count := greatest(jsonb_array_length(v_series.attendee_names), 1);
        v_fee := 0;
        if v_series.mode = 'onsite' then
          v_fee := coalesce(v_service.onsite_fee_override_cents, v_settings.onsite_fee_cents);
          if v_settings.onsite_fee_mode = 'per_hour' then
            v_fee := round(v_fee * v_series.duration_minutes / 60.0);
          end if;
        end if;
        v_price := round(v_service.hourly_rate_cents * v_series.duration_minutes * v_count / 60.0) + v_fee;
      end if;
    end if;

    v_date := v_last + 7;
    while v_date <= v_horizon
          and (v_series.end_date is null or v_date <= v_series.end_date) loop
      v_starts := (v_date::text || ' ' || v_series.start_time::text)::timestamp
                  at time zone 'Europe/Lisbon';
      v_blocked := exists (
        select 1 from public.blockouts b
        where v_date between b.start_date and b.end_date
      );

      begin
        insert into public.bookings
          (user_id, service_id, series_id, starts_at, ends_at, buffered_until,
           attendee_names, address, status, price_estimate_cents,
           gcal_sync_pending, mode, onsite_fee_applied_cents,
           paid_with_pack_purchase_id)
        values
          (v_series.user_id, v_series.service_id, v_series.id, v_starts,
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_series.attendee_names, v_series.address,
           case when v_blocked then 'skipped_blockout'::public.booking_status
                else 'confirmed'::public.booking_status end,
           v_price, not v_blocked,
           v_series.mode, v_fee, v_pack);
        v_inserted := v_inserted + 1;
      exception
        when exclusion_violation then
          null; -- a one-off slipped in first; leave that week to it
      end;

      v_date := v_date + 7;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke execute on function public.materialize_series(integer) from anon, authenticated;
