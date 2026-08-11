-- Local `supabase db reset` applies migrations under a role whose default
-- privileges skip the platform's standard table grants, leaving anon /
-- authenticated / service_role without DML on the local stack (the cloud
-- project gets them via default privileges). Re-assert the platform
-- defaults so both environments match; RLS remains the authorization
-- boundary. Function EXECUTE grants are deliberately untouched — the
-- booking RPC migrations manage those explicitly.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
