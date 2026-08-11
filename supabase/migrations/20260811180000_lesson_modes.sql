-- Lesson formats (design handoff 10): each service declares whether it is
-- taught online and/or at the student's home; the student picks a mode when
-- booking; at-home lessons add a travel fee (global setting, per-service
-- override) snapshotted on the booking so later changes never rewrite
-- history.

alter table public.services
  add column allows_online boolean not null default true,
  add column allows_onsite boolean not null default true,
  add column onsite_fee_override_cents integer
    check (onsite_fee_override_cents >= 0),
  add constraint services_at_least_one_mode
    check (allows_online or allows_onsite);

alter table public.settings
  add column onsite_fee_cents integer not null default 500
    check (onsite_fee_cents >= 0),
  add column onsite_fee_mode text not null default 'per_lesson'
    check (onsite_fee_mode in ('per_lesson', 'per_hour'));

alter table public.bookings
  add column mode text not null default 'onsite'
    check (mode in ('online', 'onsite')),
  add column onsite_fee_applied_cents integer not null default 0
    check (onsite_fee_applied_cents >= 0);

alter table public.booking_series
  add column mode text not null default 'onsite'
    check (mode in ('online', 'onsite')),
  add column onsite_fee_applied_cents integer not null default 0
    check (onsite_fee_applied_cents >= 0);

-- Non-admin surfaces read settings through this function; the return type
-- grows, which requires a drop + recreate.
drop function public.get_public_settings();

create function public.get_public_settings()
returns table (
  buffer_minutes integer,
  cancellation_cutoff_hours integer,
  booking_notice_hours integer,
  travel_fee_cents integer,
  travel_fee_threshold_km integer,
  onsite_fee_cents integer,
  onsite_fee_mode text
)
language sql
stable
security definer
set search_path = public
as $$
  select buffer_minutes, cancellation_cutoff_hours, booking_notice_hours,
         travel_fee_cents, travel_fee_threshold_km,
         onsite_fee_cents, onsite_fee_mode
  from public.settings;
$$;

grant execute on function public.get_public_settings() to anon, authenticated;

-- Series creation gains the mode parameter and computes the fee snapshot
-- authoritatively (override ?? global, ×hours when per_hour). New signature,
-- so the old overload must go.
drop function public.create_booking_series(uuid, date, text, integer, jsonb, text, date, integer);

create function public.create_booking_series(
  p_service_id uuid,
  p_first_date date,
  p_start_time text,
  p_duration_minutes integer,
  p_attendee_names jsonb,
  p_address text,
  p_mode text default 'onsite',
  p_end_date date default null,
  p_window_months integer default 3
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

  if p_mode = 'onsite' then
    select * into v_settings from public.settings;
    v_fee := coalesce(v_service.onsite_fee_override_cents, v_settings.onsite_fee_cents);
    if v_settings.onsite_fee_mode = 'per_hour' then
      v_fee := round(v_fee * p_duration_minutes / 60.0);
    end if;
  end if;

  v_price := round(v_service.hourly_rate_cents * p_duration_minutes * v_count / 60.0) + v_fee;

  insert into public.booking_series
    (user_id, service_id, weekday, start_time, duration_minutes,
     attendee_names, address, status, end_date, mode, onsite_fee_applied_cents)
  values
    (v_user, p_service_id, extract(dow from p_first_date)::smallint,
     p_start_time::time, p_duration_minutes, p_attendee_names, v_address,
     'pending', p_end_date, p_mode, v_fee)
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
       mode, onsite_fee_applied_cents)
    values
      (v_user, p_service_id, v_series_id, v_starts,
       v_starts + make_interval(mins => p_duration_minutes),
       v_starts + make_interval(mins => p_duration_minutes), -- overwritten by trigger
       p_attendee_names, v_address,
       case when v_blocked then 'skipped_blockout'::public.booking_status
            else 'pending'::public.booking_status end,
       v_price, p_mode, v_fee);

    v_date := v_date + 7;
  end loop;

  return jsonb_build_object('series_id', v_series_id);
exception
  when exclusion_violation then
    return jsonb_build_object('error', 'slot_taken');
end;
$$;

grant execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, text, date, integer) to authenticated;
revoke execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, text, date, integer) from anon;

-- Materialized occurrences inherit the series' mode and fee snapshot.
create or replace function public.materialize_series(p_window_months integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series record;
  v_horizon date := (current_date + make_interval(months => p_window_months))::date + 7;
  v_last date;
  v_date date;
  v_starts timestamptz;
  v_blocked boolean;
  v_price integer;
  v_inserted integer := 0;
begin
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
           gcal_sync_pending, mode, onsite_fee_applied_cents)
        values
          (v_series.user_id, v_series.service_id, v_series.id, v_starts,
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_series.attendee_names, v_series.address,
           case when v_blocked then 'skipped_blockout'::public.booking_status
                else 'confirmed'::public.booking_status end,
           v_price, not v_blocked,
           v_series.mode, v_series.onsite_fee_applied_cents);
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
