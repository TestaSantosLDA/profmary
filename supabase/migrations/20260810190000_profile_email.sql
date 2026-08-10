-- Denormalize the auth email onto profiles so email plumbing (student
-- recipients, admin alert lists) never needs the auth admin API.

alter table public.profiles add column email text not null default '';

update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case
      when new.raw_user_meta_data ->> 'locale' in ('pt', 'en')
        then new.raw_user_meta_data ->> 'locale'
      else 'pt'
    end
  );
  return new;
end;
$$;
