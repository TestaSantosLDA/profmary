-- Service catalog, weekly availability, blockouts, and the settings singleton.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title_pt text not null,
  title_en text not null,
  description_pt text not null default '',
  description_en text not null default '',
  hourly_rate_cents integer not null check (hourly_rate_cents >= 0),
  min_duration_minutes integer not null default 60
    check (min_duration_minutes > 0 and min_duration_minutes % 30 = 0),
  max_duration_minutes integer not null default 120
    check (max_duration_minutes % 30 = 0),
  attendee_cap integer not null default -1 check (attendee_cap = -1 or attendee_cap > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_duration_minutes >= min_duration_minutes)
);

create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.blockouts (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- Singleton: exactly one row, enforced by the constant primary key.
create table public.settings (
  id boolean primary key default true check (id),
  buffer_minutes integer not null default 10 check (buffer_minutes >= 0),
  cancellation_cutoff_hours integer not null default 24 check (cancellation_cutoff_hours >= 0),
  booking_notice_hours integer not null default 24 check (booking_notice_hours >= 0),
  travel_fee_cents integer not null default 0 check (travel_fee_cents >= 0),
  travel_fee_threshold_km integer not null default 0 check (travel_fee_threshold_km >= 0),
  gcal_refresh_token text,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (true);

-- RLS: catalog and scheduling parameters are world-readable (they drive the
-- public pricing page and slot grid); only admins write. The GCal token
-- column is protected by a dedicated policy-free view pattern: non-admin
-- reads go through public.public_settings instead.
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blockouts enable row level security;
alter table public.settings enable row level security;

create policy "Anyone can read active services"
  on public.services for select
  using (active or public.is_admin());

create policy "Admins manage services"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins read availability rules"
  on public.availability_rules for select
  using (public.is_admin());

create policy "Admins manage availability rules"
  on public.availability_rules for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins read blockouts"
  on public.blockouts for select
  using (public.is_admin());

create policy "Admins manage blockouts"
  on public.blockouts for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins read settings"
  on public.settings for select
  using (public.is_admin());

create policy "Admins update settings"
  on public.settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- Non-admin surfaces (booking form, pricing page) need the numeric settings
-- but must never see the GCal token: expose them via a security-definer function.
create or replace function public.get_public_settings()
returns table (
  buffer_minutes integer,
  cancellation_cutoff_hours integer,
  booking_notice_hours integer,
  travel_fee_cents integer,
  travel_fee_threshold_km integer
)
language sql
stable
security definer
set search_path = public
as $$
  select buffer_minutes, cancellation_cutoff_hours, booking_notice_hours,
         travel_fee_cents, travel_fee_threshold_km
  from public.settings;
$$;
