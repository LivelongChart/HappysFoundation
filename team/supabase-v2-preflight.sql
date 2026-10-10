-- READ ONLY. Run in Supabase SQL Editor before reviewing/running the migration.
-- Keep the results private; they describe your access controls.
select table_name, column_name, data_type, udt_schema, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('tasks','team_members','submissions')
order by table_name, ordinal_position;

select c.conrelid::regclass as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c where c.conrelid in ('public.tasks'::regclass, 'public.team_members'::regclass);

select n.nspname, t.typname, e.enumlabel
from pg_attribute a join pg_type t on t.oid = a.atttypid
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where a.attrelid = 'public.tasks'::regclass and a.attname = 'status' order by e.enumsortorder;

select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('is_active_team_member','is_team_admin');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where (schemaname = 'public' and tablename in ('tasks','team_members','submissions'))
   or (schemaname = 'storage' and tablename = 'objects');

select t.tgrelid::regclass as table_name, t.tgname, pg_get_triggerdef(t.oid) as definition,
       pg_get_functiondef(t.tgfoid) as function_definition
from pg_trigger t where not t.tgisinternal and t.tgrelid in ('public.tasks'::regclass,'public.team_members'::regclass);

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated','PUBLIC') and
 ((table_schema='public' and table_name in ('tasks','team_members','submissions')) or (table_schema='storage' and table_name='objects'));

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'team-submissions';
