-- Recurring series: atomic creation, approve-once, rolling materialization,
-- and blockout precedence. All multi-row transitions live here so a series
-- can never end up half-created or half-approved.

-- Occurrences are materialized to window + 7 days so series rows always
-- exist before the public booking window (window months, no lookahead)
-- reaches those dates — one-off requests can then never race a series slot.

create or replace function public.create_booking_series(
  p_service_id uuid,
  p_first_date date,
  p_start_time text,
  p_duration_minutes integer,
  p_attendee_names jsonb,
  p_address text,
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
  v_series_id uuid;
  v_price integer;
  v_count integer;
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

  v_price := round(v_service.hourly_rate_cents * p_duration_minutes * v_count / 60.0);

  insert into public.booking_series
    (user_id, service_id, weekday, start_time, duration_minutes,
     attendee_names, address, status, end_date)
  values
    (v_user, p_service_id, extract(dow from p_first_date)::smallint,
     p_start_time::time, p_duration_minutes, p_attendee_names, p_address,
     'pending', p_end_date)
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
       attendee_names, address, status, price_estimate_cents)
    values
      (v_user, p_service_id, v_series_id, v_starts,
       v_starts + make_interval(mins => p_duration_minutes),
       v_starts + make_interval(mins => p_duration_minutes), -- overwritten by trigger
       p_attendee_names, p_address,
       case when v_blocked then 'skipped_blockout'::public.booking_status
            else 'pending'::public.booking_status end,
       v_price);

    v_date := v_date + 7;
  end loop;

  return jsonb_build_object('series_id', v_series_id);
exception
  when exclusion_violation then
    return jsonb_build_object('error', 'slot_taken');
end;
$$;

create or replace function public.approve_series(p_series_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return 'forbidden';
  end if;

  update public.booking_series
  set status = 'active'
  where id = p_series_id and status = 'pending';

  if not found then
    return 'not_pending';
  end if;

  update public.bookings
  set status = 'confirmed', gcal_sync_pending = true
  where series_id = p_series_id and status = 'pending';

  return 'ok';
end;
$$;

create or replace function public.decline_series(p_series_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return 'forbidden';
  end if;

  update public.booking_series
  set status = 'cancelled'
  where id = p_series_id and status = 'pending';

  if not found then
    return 'not_pending';
  end if;

  update public.bookings
  set status = 'declined'
  where series_id = p_series_id and status = 'pending';

  return 'ok';
end;
$$;

-- Called by the scheduled job with the service role. Extends every active
-- series to the materialization horizon; idempotent (starts after the
-- latest existing occurrence, per-occurrence conflicts are skipped).
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
           gcal_sync_pending)
        values
          (v_series.user_id, v_series.service_id, v_series.id, v_starts,
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_starts + make_interval(mins => v_series.duration_minutes),
           v_series.attendee_names, v_series.address,
           case when v_blocked then 'skipped_blockout'::public.booking_status
                else 'confirmed'::public.booking_status end,
           v_price, not v_blocked);
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

-- Blockout precedence: creating a blockout silently skips overlapping
-- series occurrences (no emails, dashboard-visible). One-off bookings are
-- untouched — Maria cancels those explicitly with a note. Deleting a
-- blockout does NOT un-skip: skipped rows stay skipped.
create or replace function public.apply_blockout_to_series()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'skipped_blockout',
      gcal_sync_pending = (gcal_event_id is not null)
  where series_id is not null
    and status in ('pending', 'confirmed')
    and (starts_at at time zone 'Europe/Lisbon')::date
        between new.start_date and new.end_date;
  return new;
end;
$$;

create trigger blockouts_skip_series
  after insert on public.blockouts
  for each row execute function public.apply_blockout_to_series();

grant execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, date, integer) to authenticated;
grant execute on function public.approve_series(uuid) to authenticated;
grant execute on function public.decline_series(uuid) to authenticated;
revoke execute on function public.create_booking_series(uuid, date, text, integer, jsonb, text, date, integer) from anon;
revoke execute on function public.approve_series(uuid) from anon;
revoke execute on function public.decline_series(uuid) from anon;
revoke execute on function public.materialize_series(integer) from anon, authenticated;
