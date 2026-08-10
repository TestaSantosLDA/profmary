-- Recurring series and bookings, with the database-level double-booking guarantee.

create type public.series_status as enum ('pending', 'active', 'ended', 'cancelled');

create type public.booking_status as enum (
  'pending', 'confirmed', 'declined',
  'cancelled_student', 'cancelled_admin', 'skipped_blockout'
);

create table public.booking_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes % 30 = 0),
  attendee_names jsonb not null default '[]'::jsonb,
  address text not null,
  status public.series_status not null default 'pending',
  end_date date, -- null = open-ended
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger booking_series_updated_at
  before update on public.booking_series
  for each row execute function public.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id),
  series_id uuid references public.booking_series (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- ends_at + the buffer that was configured when the hold was created;
  -- set by trigger so the exclusion constraint has a concrete range.
  buffered_until timestamptz not null,
  attendee_names jsonb not null default '[]'::jsonb,
  address text not null,
  status public.booking_status not null default 'pending',
  price_estimate_cents integer not null check (price_estimate_cents >= 0),
  travel_fee_applied boolean not null default false,
  admin_note text,
  gcal_event_id text,
  gcal_sync_pending boolean not null default false,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create index bookings_user_idx on public.bookings (user_id, starts_at desc);
create index bookings_series_idx on public.bookings (series_id) where series_id is not null;
create index bookings_status_start_idx on public.bookings (status, starts_at);

create or replace function public.set_buffered_until()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buffer integer;
begin
  select buffer_minutes into buffer from public.settings;
  new.buffered_until := new.ends_at + make_interval(mins => coalesce(buffer, 0));
  return new;
end;
$$;

create trigger bookings_set_buffered_until
  before insert on public.bookings
  for each row execute function public.set_buffered_until();

-- The double-booking guarantee: no two holds (pending or confirmed) may
-- overlap, buffer included. Everything else (declined/cancelled/skipped)
-- releases the slot by leaving the constraint's scope.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    tstzrange(starts_at, buffered_until) with &&
  )
  where (status in ('pending', 'confirmed'));

-- RLS
alter table public.booking_series enable row level security;
alter table public.bookings enable row level security;

create policy "Users see own series"
  on public.booking_series for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users create own series"
  on public.booking_series for insert
  with check (user_id = auth.uid());

create policy "Users and admins update series"
  on public.booking_series for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Users see own bookings"
  on public.bookings for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users create own bookings"
  on public.bookings for insert
  with check (user_id = auth.uid());

create policy "Users and admins update bookings"
  on public.bookings for update
  using (user_id = auth.uid() or public.is_admin());
