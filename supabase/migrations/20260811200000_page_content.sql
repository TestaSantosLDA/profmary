-- Admin-editable content for the public Home and Sobre pages (replaces the
-- About-only site_content), plus the media slots those pages display.

create table public.page_content (
  page text primary key check (page in ('home', 'about')),
  -- One bilingual JSON blob per page ({section: {field_pt, field_en, items}}).
  content jsonb not null default '{}',
  -- Section visibility is a real boolean per section — never an empty-string
  -- check — so a section can be hidden with its copy intact. Only Home has
  -- toggleable sections; the 'about' row keeps the defaults.
  show_formats boolean not null default true,
  show_audiences boolean not null default true,
  show_steps boolean not null default true,
  show_price boolean not null default true,
  show_testimonials boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger page_content_updated_at
  before update on public.page_content
  for each row execute function public.set_updated_at();

alter table public.page_content enable row level security;

create policy "Anyone can read page content"
  on public.page_content for select
  using (true);

create policy "Admins update page content"
  on public.page_content for update
  using (public.is_admin())
  with check (public.is_admin());

-- One row per photo slot (home_hero, home_how, about_portrait,
-- about_strip_1..3, testimonial_<id>). Where no row exists the front end
-- renders the Photo placeholder frame — never a broken image.
create table public.media (
  slot text primary key,
  url text not null,
  alt_pt text not null default '',
  alt_en text not null default '',
  updated_at timestamptz not null default now()
);

create trigger media_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

alter table public.media enable row level security;

create policy "Anyone can read media"
  on public.media for select
  using (true);

create policy "Admins insert media"
  on public.media for insert
  with check (public.is_admin());

create policy "Admins update media"
  on public.media for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete media"
  on public.media for delete
  using (public.is_admin());

-- Seed both pages, carrying over whatever was written in the old Sobre
-- editor: audience cards and steps now live on Home, the presentation fields
-- on Sobre. The reply line is seeded because for that field empty means
-- hidden rather than "fall back to the default copy".
insert into public.page_content (page, content)
values ('home', jsonb_build_object(
  'hero', jsonb_build_object(
    'reply_pt', 'Respondo normalmente no próprio dia.',
    'reply_en', 'I usually reply the same day.'),
  'audiences', jsonb_build_object('items', coalesce(
    (select highlights from public.site_content where key = 'about'), '[]'::jsonb)),
  'steps', jsonb_build_object('items', coalesce(
    (select steps from public.site_content where key = 'about'), '[]'::jsonb))));

insert into public.page_content (page, content)
select 'about', coalesce((
  select jsonb_build_object('hero', jsonb_build_object(
    'name', sc.display_name,
    'tagline_pt', sc.tagline_pt, 'tagline_en', sc.tagline_en,
    'p1_pt', sc.intro_pt, 'p1_en', sc.intro_en))
  from public.site_content sc where sc.key = 'about'), '{}'::jsonb);

insert into public.media (slot, url)
select 'about_portrait', sc.photo_url
from public.site_content sc
where sc.key = 'about' and coalesce(sc.photo_url, '') <> '';

drop table public.site_content;
