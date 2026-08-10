-- Tighten booking mutations: students must not update rows arbitrarily
-- (they could self-confirm). Admin updates stay on RLS; student cancellation
-- goes through security-definer functions that enforce ownership and the
-- cancellation cutoff at the database level.

drop policy "Users and admins update bookings" on public.bookings;
drop policy "Users and admins update series" on public.booking_series;

create policy "Admins update bookings"
  on public.bookings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins update series"
  on public.booking_series for update
  using (public.is_admin())
  with check (public.is_admin());

-- Cancels one booking (single or series occurrence) as the calling student.
-- Returns 'ok' or an error code the UI can localize.
create or replace function public.cancel_booking(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_cutoff integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null or v_booking.user_id <> auth.uid() then
    return 'not_found';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    return 'not_cancellable';
  end if;

  select cancellation_cutoff_hours into v_cutoff from public.settings;

  -- Pending requests can always be withdrawn; confirmed lessons only
  -- outside the cutoff.
  if v_booking.status = 'confirmed'
     and v_booking.starts_at <= now() + make_interval(hours => v_cutoff) then
    return 'inside_cutoff';
  end if;

  update public.bookings
  set status = 'cancelled_student', gcal_sync_pending = (gcal_event_id is not null)
  where id = p_booking_id;

  return 'ok';
end;
$$;

-- Ends a whole series: cancels the series row plus its future occurrences.
-- Confirmed occurrences inside the cutoff stay confirmed (they still happen).
create or replace function public.cancel_series(p_series_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series public.booking_series%rowtype;
  v_cutoff integer;
begin
  select * into v_series from public.booking_series where id = p_series_id;

  if v_series.id is null or v_series.user_id <> auth.uid() then
    return 'not_found';
  end if;

  if v_series.status not in ('pending', 'active') then
    return 'not_cancellable';
  end if;

  select cancellation_cutoff_hours into v_cutoff from public.settings;

  update public.booking_series
  set status = 'cancelled'
  where id = p_series_id;

  update public.bookings
  set status = 'cancelled_student', gcal_sync_pending = (gcal_event_id is not null)
  where series_id = p_series_id
    and (
      status = 'pending'
      or (status = 'confirmed'
          and starts_at > now() + make_interval(hours => v_cutoff))
    );

  return 'ok';
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.cancel_series(uuid) to authenticated;
revoke execute on function public.cancel_booking(uuid) from anon;
revoke execute on function public.cancel_series(uuid) from anon;
