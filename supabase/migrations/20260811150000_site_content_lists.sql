-- About page: editable teacher name plus the two item lists (audience
-- highlight cards and how-lessons-work steps) that were fixed in the i18n
-- copy until now. Lists hold [{title_pt, title_en, body_pt, body_en}].
alter table public.site_content
  add column display_name text not null default '',
  add column highlights jsonb not null default '[]',
  add column steps jsonb not null default '[]';
