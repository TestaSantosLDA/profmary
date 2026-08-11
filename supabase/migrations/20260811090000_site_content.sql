-- Admin-editable site content (About page) + public storage for site images.

create table public.site_content (
  key text primary key,
  photo_url text,
  tagline_pt text not null default '',
  tagline_en text not null default '',
  intro_pt text not null default '',
  intro_en text not null default '',
  updated_at timestamptz not null default now()
);

create trigger site_content_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

insert into public.site_content (key) values ('about');

alter table public.site_content enable row level security;

create policy "Anyone can read site content"
  on public.site_content for select
  using (true);

create policy "Admins update site content"
  on public.site_content for update
  using (public.is_admin())
  with check (public.is_admin());

-- Public bucket for site images (About photo). Public read via bucket flag;
-- writes restricted to admins. Guarded: the local dev stack runs without the
-- storage service, so the storage schema only exists in the cloud project.
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('site', 'site', true)
  on conflict (id) do nothing;

  create policy "Admins upload site images"
    on storage.objects for insert
    with check (bucket_id = 'site' and public.is_admin());

  create policy "Admins update site images"
    on storage.objects for update
    using (bucket_id = 'site' and public.is_admin());

  create policy "Admins delete site images"
    on storage.objects for delete
    using (bucket_id = 'site' and public.is_admin());
end;
$$;
