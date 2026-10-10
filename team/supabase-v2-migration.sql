-- HAPPY'S TEAM PORTAL V2 — MANUAL MIGRATION ONLY
-- First run supabase-v2-preflight.sql and review the existing helpers/policies.
-- Run PART 1 ALONE, wait for success, then run PART 2 ALONE in a second execution.
-- An enum value cannot be used until its adding transaction has committed.
-- No existing policies or helper definitions are removed/replaced.
-- Unknown schemas, existing submissions tables, or an existing bucket stop the
-- transaction for review instead of silently changing existing security.

-- ==================== PART 1: status enum (run separately) ====================
begin;
do $migration$
declare typ record;
begin
  if to_regclass('public.tasks') is null or to_regclass('public.team_members') is null then
    raise exception 'Expected existing public.tasks and public.team_members.';
  end if;
  select t.oid, t.typtype, t.typname, n.nspname into strict typ
    from pg_attribute a join pg_type t on t.oid=a.atttypid
    join pg_namespace n on n.oid=t.typnamespace
    where a.attrelid='public.tasks'::regclass and a.attname='status' and not a.attisdropped;
  if typ.typtype='e' then
    execute format('alter type %I.%I add value if not exists %L',typ.nspname,typ.typname,'submitted');
  elsif typ.oid not in ('text'::regtype,'varchar'::regtype) then
    raise exception 'Unsupported status type %.%. Review preflight before proceeding.',typ.nspname,typ.typname;
  end if;
end $migration$;
commit;
-- ==================== END PART 1 ====================

-- ==================== PART 2: workspace (run separately) ====================
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $migration$
declare c record; status_att smallint; helper text;
begin
  foreach helper in array array['public.is_active_team_member()','public.is_team_admin()'] loop
    if to_regprocedure(helper) is null then raise exception 'Required existing helper % is missing.',helper; end if;
    if (select prorettype from pg_proc where oid=to_regprocedure(helper)) <> 'boolean'::regtype then
      raise exception 'Expected boolean helper %.',helper;
    end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid='public.tasks'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.team_members'::regclass) then
    raise exception 'Expected existing RLS on tasks and team_members. Review setup; this script will not replace it.';
  end if;
  if exists(select 1 from pg_attribute a join pg_type t on t.oid=a.atttypid
      where a.attrelid='public.tasks'::regclass and a.attname='status' and t.typtype='e'
      and not exists(select 1 from pg_enum e where e.enumtypid=t.oid and e.enumlabel='submitted')) then
    raise exception 'Run and commit Part 1 separately before Part 2.';
  end if;
  if exists(select 1 from public.tasks where status is null or status::text not in ('not_started','in_progress','submitted','done')) then
    raise exception 'Unexpected existing task statuses. No task data has been modified.';
  end if;
  if exists(select email from public.team_members where active group by email having count(*)>1) then
    raise exception 'Duplicate active member emails must be resolved before installing identity checks.';
  end if;
  if to_regclass('public.submissions') is not null then
    raise exception 'submissions already exists. Review its schema and policies instead of replacing it.';
  end if;
  if exists(select 1 from storage.buckets where id='team-submissions') then
    raise exception 'team-submissions bucket already exists. Review its security before adapting this migration.';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='storage' and table_name='objects' and column_name='owner_id') then
    raise exception 'Expected storage.objects.owner_id. Review Storage version before adapting.';
  end if;
  select attnum into strict status_att from pg_attribute where attrelid='public.tasks'::regclass and attname='status';
  -- Extend only checks solely about status; never drop multi-column business rules.
  for c in select conname, conkey, pg_get_expr(conbin,conrelid) as expression
           from pg_constraint where conrelid='public.tasks'::regclass and contype='c' and status_att=any(conkey) loop
    if c.conkey <> array[status_att] then
      raise exception 'Status participates in multi-column constraint %. Review it manually.',c.conname;
    end if;
    execute format('alter table public.tasks drop constraint %I',c.conname);
    execute format('alter table public.tasks add constraint %I check ((%s) or status::text = %L)',c.conname,c.expression,'submitted');
  end loop;
end $migration$;

alter table public.tasks add column if not exists submitted_at timestamptz;
alter table public.tasks add column if not exists requires_submission boolean not null default false;
do $migration$
begin
  if not exists(select 1 from pg_attribute where attrelid='public.tasks'::regclass
       and attname='submitted_at' and atttypid='timestamptz'::regtype)
     or not exists(select 1 from pg_attribute where attrelid='public.tasks'::regclass
       and attname='requires_submission' and atttypid='boolean'::regtype and attnotnull) then
    raise exception 'Existing v2 columns have unexpected types/nullability. Review preflight.';
  end if;
end $migration$;
alter table public.tasks add constraint team_v2_task_status check (status::text in ('not_started','in_progress','submitted','done'));

-- Read-only identity helper avoids querying team_members recursively from policies.
-- The schema is not an exposed API schema; no data-changing definer functions exist.
create schema if not exists team_portal_private;
revoke all on schema team_portal_private from public;
grant usage on schema team_portal_private to authenticated;
create function team_portal_private.member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select (select tm.id from public.team_members tm
          where tm.active = true and tm.email = (select auth.jwt()->>'email'));
$$;
revoke all on function team_portal_private.member_id() from public, anon;
grant execute on function team_portal_private.member_id() to authenticated;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  submitted_by_id uuid not null references public.team_members(id) on delete restrict,
  submission_type text not null check (submission_type in ('drive_link','file')),
  drive_url text,
  file_path text unique,
  file_name text,
  notes text check (char_length(notes) <= 10000),
  submitted_at timestamptz not null default clock_timestamp(),
  constraint team_v2_submission_content check (
    (submission_type='drive_link' and drive_url ~ '^https://(drive|docs)\.google\.com/'
      and char_length(drive_url)<=4096 and file_path is null and file_name is null)
    or (submission_type='file' and drive_url is null and file_path is not null
      and file_name is not null and char_length(file_name) between 1 and 255)
  )
);
create index team_v2_submissions_task on public.submissions(task_id,submitted_at desc);
create index team_v2_submissions_author on public.submissions(submitted_by_id,submitted_at desc);
alter table public.submissions enable row level security;
revoke all on public.submissions from public, anon, authenticated;
grant select, insert on public.submissions to authenticated;

-- Existing task SELECT/admin policies remain authoritative. Only the member
-- UPDATE path is added; restrictive guards also constrain any broader old policy.
grant update (status) on public.tasks to authenticated;
create policy team_v2_tasks_active_gate on public.tasks as restrictive for all to authenticated
  using (public.is_active_team_member() and team_portal_private.member_id() is not null)
  with check (public.is_active_team_member() and team_portal_private.member_id() is not null);
create policy team_v2_tasks_member_update on public.tasks for update to authenticated
  using (assignee_id=team_portal_private.member_id())
  with check (assignee_id=team_portal_private.member_id());
create policy team_v2_tasks_update_gate on public.tasks as restrictive for update to authenticated
  using (public.is_team_admin() or assignee_id=team_portal_private.member_id())
  with check (public.is_team_admin() or assignee_id=team_portal_private.member_id());
create policy team_v2_tasks_insert_gate on public.tasks as restrictive for insert to authenticated
  with check (public.is_team_admin() and created_by_id=team_portal_private.member_id());
create policy team_v2_tasks_delete_gate on public.tasks as restrictive for delete to authenticated
  using (public.is_team_admin());

create policy team_v2_submissions_read on public.submissions for select to authenticated
  using (public.is_active_team_member() and team_portal_private.member_id() is not null and
    (public.is_team_admin() or submitted_by_id=team_portal_private.member_id()
      or exists(select 1 from public.tasks t where t.id=task_id)));
create policy team_v2_submissions_insert on public.submissions for insert to authenticated
  with check (public.is_active_team_member() and submitted_by_id=team_portal_private.member_id()
    and exists(select 1 from public.tasks t where t.id=task_id
      and t.assignee_id=team_portal_private.member_id() and t.status::text in ('not_started','in_progress')));
-- No UPDATE/DELETE policy: submission history is immutable through the API.

create function team_portal_private.guard_task() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor uuid; admin boolean;
begin
  if auth.uid() is not null or current_user in ('anon','authenticated') then
    actor := team_portal_private.member_id();
    if actor is null or public.is_active_team_member() is not true then raise exception 'Active team membership required' using errcode='42501'; end if;
    admin := coalesce(public.is_team_admin(),false);
    if tg_op='DELETE' then
      if not admin then raise exception 'Only admins may delete assignments' using errcode='42501'; end if;
      return old;
    end if;
    if tg_op='INSERT' then
      if not admin or new.created_by_id is distinct from actor then raise exception 'Only admins may create assignments as themselves' using errcode='42501'; end if;
    elsif not admin then
      if old.assignee_id is distinct from actor or new.assignee_id is distinct from actor then raise exception 'Only your own assignment may be updated' using errcode='42501'; end if;
      -- RLS alone cannot restrict columns when old table-level grants exist.
      if (to_jsonb(new)-array['status','updated_at','completed_at','submitted_at']) is distinct from
         (to_jsonb(old)-array['status','updated_at','completed_at','submitted_at']) then
        raise exception 'Members may change only assignment status' using errcode='42501';
      end if;
      if not (
        (old.status::text='not_started' and new.status::text='in_progress')
        or (old.status::text='in_progress' and new.status::text='done' and not old.requires_submission)
        or (old.status::text in ('not_started','in_progress') and new.status::text='submitted'
            and pg_trigger_depth()>1
            and exists(select 1 from public.submissions s where s.task_id=old.id and s.submitted_by_id=actor
                       and s.submitted_at>coalesce(old.submitted_at,'-infinity'::timestamptz)))
      ) then raise exception 'This status transition requires submission or admin review' using errcode='42501'; end if;
    end if;
    if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
      if not exists(select 1 from public.team_members tm where tm.id=new.assignee_id and tm.active) then
        raise exception 'Choose an active team member as assignee';
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  new.updated_at := clock_timestamp();
  if new.status::text='done' then
    new.completed_at := case when tg_op='UPDATE' and old.status::text='done' then coalesce(old.completed_at,clock_timestamp()) else clock_timestamp() end;
  else new.completed_at := null; end if;
  if new.status::text='submitted' then
    new.submitted_at := case when tg_op='UPDATE' and old.status::text='submitted' then coalesce(old.submitted_at,clock_timestamp()) else clock_timestamp() end;
  elsif tg_op='UPDATE' then new.submitted_at := old.submitted_at;
  else new.submitted_at := null; end if;
  return new;
end $$;
revoke all on function team_portal_private.guard_task() from public, anon;
-- zz prefix runs after common timestamp triggers. Review preflight for any later
-- or conflicting custom trigger; do not remove existing triggers to force success.
create trigger zz_team_v2_guard_task before insert or update or delete on public.tasks
  for each row execute function team_portal_private.guard_task();

-- Read-only, narrowly scoped existence check for the caller's uploaded object.
create function team_portal_private.upload_exists(object_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_team_member()
    and split_part(object_path,'/',1)=team_portal_private.member_id()::text
    and exists(select 1 from storage.objects o where o.bucket_id='team-submissions'
      and o.name=object_path and o.owner_id=(select auth.uid())::text);
$$;
revoke all on function team_portal_private.upload_exists(text) from public, anon;
grant execute on function team_portal_private.upload_exists(text) to authenticated;

create function team_portal_private.guard_submission() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare t public.tasks%rowtype; actor uuid;
begin
  actor := team_portal_private.member_id();
  if actor is null or public.is_active_team_member() is not true or new.submitted_by_id is distinct from actor then
    raise exception 'Submit only as your active team member account' using errcode='42501';
  end if;
  -- Lock the assignment to serialize submission, reassignment and review.
  select * into t from public.tasks where id=new.task_id for update;
  if not found or t.assignee_id is distinct from actor or t.status::text not in ('not_started','in_progress') then
    raise exception 'Only your own active assignment may receive work' using errcode='42501';
  end if;
  new.submitted_at := clock_timestamp();
  if new.submission_type='file' then
    if new.file_path !~ ('^'||actor::text||'/'||new.task_id::text||'/'||new.id::text||'\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|png|jpg|jpeg|webp|zip)$')
       or not team_portal_private.upload_exists(new.file_path) then
      raise exception 'Upload the file privately under your own assignment before submitting' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function team_portal_private.guard_submission() from public, anon;
create trigger team_v2_guard_submission before insert on public.submissions
  for each row execute function team_portal_private.guard_submission();

create function team_portal_private.submit_task() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  update public.tasks set status='submitted' where id=new.task_id
    and assignee_id=new.submitted_by_id and status::text in ('not_started','in_progress');
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'Task status update was denied; submission rolled back' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function team_portal_private.submit_task() from public, anon;
create trigger team_v2_submit_task after insert on public.submissions
  for each row execute function team_portal_private.submit_task();

-- Private bucket. MIME and size restrictions apply to every upload.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('team-submissions','team-submissions',false,20971520,array[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv','text/plain','image/png','image/jpeg','image/webp','application/zip'
]);

create function team_portal_private.can_upload(object_path text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select public.is_active_team_member() and split_part(object_path,'/',1)=team_portal_private.member_id()::text
    and object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|png|jpg|jpeg|webp|zip)$'
    and exists(select 1 from public.tasks t where t.id::text=split_part(object_path,'/',2)
      and t.assignee_id=team_portal_private.member_id() and t.status::text in ('not_started','in_progress'));
$$;
create function team_portal_private.can_read_file(object_path text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select public.is_active_team_member() and team_portal_private.member_id() is not null
    and (split_part(object_path,'/',1)=team_portal_private.member_id()::text
      or exists(select 1 from public.submissions s where s.file_path=object_path));
$$;
create function team_portal_private.can_remove_upload(object_path text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select public.is_active_team_member() and split_part(object_path,'/',1)=team_portal_private.member_id()::text
    and not exists(select 1 from public.submissions s where s.file_path=object_path);
$$;
revoke all on function team_portal_private.can_upload(text),team_portal_private.can_read_file(text),team_portal_private.can_remove_upload(text) from public,anon;
grant execute on function team_portal_private.can_upload(text),team_portal_private.can_read_file(text),team_portal_private.can_remove_upload(text) to authenticated;

create policy team_v2_files_insert on storage.objects for insert to authenticated
  with check (bucket_id='team-submissions' and team_portal_private.can_upload(name));
create policy team_v2_files_read on storage.objects for select to authenticated
  using (bucket_id='team-submissions' and team_portal_private.can_read_file(name));
create policy team_v2_files_cleanup on storage.objects for delete to authenticated
  using (bucket_id='team-submissions' and team_portal_private.can_remove_upload(name));
-- These restrictive guards neutralize any broader existing storage policy only
-- for this bucket. Policies for other buckets are left unchanged.
create policy team_v2_files_insert_gate on storage.objects as restrictive for insert to authenticated
  with check (bucket_id<>'team-submissions' or team_portal_private.can_upload(name));
create policy team_v2_files_read_gate on storage.objects as restrictive for select to authenticated
  using (bucket_id<>'team-submissions' or team_portal_private.can_read_file(name));
create policy team_v2_files_cleanup_gate on storage.objects as restrictive for delete to authenticated
  using (bucket_id<>'team-submissions' or team_portal_private.can_remove_upload(name));
create policy team_v2_files_no_replace on storage.objects as restrictive for update to authenticated
  using (bucket_id<>'team-submissions') with check (bucket_id<>'team-submissions');
create policy team_v2_files_no_anonymous on storage.objects as restrictive for all to anon
  using (bucket_id<>'team-submissions') with check (bucket_id<>'team-submissions');

notify pgrst, 'reload schema';
commit;
-- ==================== END PART 2 ====================
