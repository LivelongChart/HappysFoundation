// Offline PostgreSQL/RLS regression tests. No connection to Supabase.
// node team/tests/database.cjs /absolute/path/to/@electric-sql/pglite
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const migration = fs.readFileSync(path.join(__dirname,'../supabase-v2-migration.sql'),'utf8');
const split = migration.indexOf('-- ==================== PART 2: workspace');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
(async()=>{
 for(const type of ['text','enum']) {
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email',current_setting('test.email',true))$$;
    grant usage on schema auth,storage to anon,authenticated;
    create table public.team_members(id uuid primary key,email text unique,name text,role text,active boolean,is_admin boolean);
    ${type==='enum'?"create type public.task_status as enum('not_started','in_progress','done');":''}
    create table public.tasks(id uuid primary key default gen_random_uuid(),title text not null,description text,assignee_id uuid references public.team_members(id),created_by_id uuid references public.team_members(id),due_date date,status ${type==='enum'?'public.task_status':"text check(status in ('not_started','in_progress','done'))"} not null default 'not_started',priority text default 'normal',category text,created_at timestamptz default now(),updated_at timestamptz default now(),completed_at timestamptz);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text);
    alter table public.team_members enable row level security; alter table public.tasks enable row level security; alter table storage.objects enable row level security;
    create function public.is_active_team_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.team_members where active and email=auth.jwt()->>'email')$$;
    create function public.is_team_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.team_members where active and is_admin and email=auth.jwt()->>'email')$$;
    grant select on public.team_members to authenticated;
    grant select,insert,update,delete on public.tasks to authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    create policy existing_team_read on public.team_members for select to authenticated using (public.is_active_team_member());
    create policy existing_task_read on public.tasks for select to authenticated using (public.is_active_team_member());
    create policy existing_admin_tasks on public.tasks for all to authenticated using(public.is_team_admin()) with check(public.is_team_admin());
    create policy existing_broad_storage on storage.objects for all to authenticated using(true) with check(true);
    insert into public.team_members values
      ('${id(1)}','member@example.test','Member','Team',true,false),
      ('${id(2)}','other@example.test','Other','Team',true,false),
      ('${id(3)}','admin@example.test','Admin','Admin',true,true),
      ('${id(4)}','inactive@example.test','Inactive','Team',false,false);
    insert into public.tasks(id,title,assignee_id,created_by_id) values
      ('${id(11)}','Simple','${id(1)}','${id(3)}'),
      ('${id(12)}','Needs submission','${id(1)}','${id(3)}'),
      ('${id(13)}','Other assignment','${id(2)}','${id(3)}'),
      ('${id(14)}','For rollback','${id(1)}','${id(3)}');
  `);
  await db.exec(migration.slice(0,split)); await db.exec(migration.slice(split));
  await db.exec(`update public.tasks set requires_submission=true where id='${id(12)}'`);
  async function as(who){await db.exec('reset role');await db.query("select set_config('test.uid',$1,false),set_config('test.email',$2,false)",[id(who+100),({1:'member',2:'other',3:'admin',4:'inactive'})[who]+'@example.test']);await db.exec('set role authenticated');}
  async function owner(){await db.exec("reset role;select set_config('test.uid','',false),set_config('test.email','',false)");}
  async function blocked(sql){let failed=false;try{const r=await db.query(sql);failed=r.affectedRows===0;}catch(e){failed=true;}assert(failed,'Expected denied/zero-row mutation: '+sql);}
  await owner();await db.exec(`create or replace function public.is_team_admin() returns boolean language sql stable security definer set search_path='' as $$select is_admin from public.team_members where active and email=auth.jwt()->>'email'$$;update public.team_members set is_admin=null where id='${id(1)}'`);
  await as(1);
  await db.exec(`update public.tasks set status='in_progress' where id='${id(11)}';update public.tasks set status='done' where id='${id(11)}';`);
  let r=await db.query(`select completed_at from public.tasks where id='${id(11)}'`);assert(r.rows[0].completed_at);
  await blocked(`update public.tasks set title='Tampered' where id='${id(12)}'`);
  await blocked(`update public.tasks set assignee_id='${id(2)}' where id='${id(12)}'`);
  await blocked(`update public.tasks set requires_submission=false where id='${id(12)}'`);
  await blocked(`update public.tasks set status='in_progress' where id='${id(13)}' returning id`);
  await blocked(`delete from public.tasks where id='${id(12)}' returning id`);
  await blocked(`insert into public.tasks(title,assignee_id,created_by_id) values('Unauthorized','${id(1)}','${id(1)}')`);
  await db.exec(`update public.tasks set status='in_progress' where id='${id(12)}'`);
  await blocked(`update public.tasks set status='done' where id='${id(12)}'`);
  await blocked(`update public.tasks set status='submitted' where id='${id(12)}'`);
  await blocked(`insert into public.submissions(task_id,submitted_by_id,submission_type,drive_url) values('${id(13)}','${id(1)}','drive_link','https://docs.google.com/document/d/test')`);
  await blocked(`insert into public.submissions(task_id,submitted_by_id,submission_type,drive_url) values('${id(12)}','${id(2)}','drive_link','https://docs.google.com/document/d/test')`);
  await blocked(`insert into public.submissions(task_id,submitted_by_id,submission_type,drive_url) values('${id(12)}','${id(1)}','drive_link','https://docs.google.com.attacker.test/test')`);
  await db.exec(`insert into public.submissions(id,task_id,submitted_by_id,submission_type,drive_url) values('${id(21)}','${id(12)}','${id(1)}','drive_link','https://docs.google.com/document/d/test')`);
  r=await db.query(`select status,submitted_at,completed_at from public.tasks where id='${id(12)}'`);assert.equal(r.rows[0].status,'submitted');assert(r.rows[0].submitted_at);assert.equal(r.rows[0].completed_at,null);
  await blocked(`update public.submissions set notes='tamper' where id='${id(21)}'`);
  await blocked(`delete from public.submissions where id='${id(21)}'`);
  await as(3);await db.exec(`update public.tasks set status='in_progress' where id='${id(12)}'`);
  await as(1);await blocked(`update public.tasks set status='submitted' where id='${id(12)}'`);
  const file=`${id(1)}/${id(12)}/${id(22)}.pdf`;
  await blocked(`insert into storage.objects(bucket_id,name,owner_id) values('team-submissions','${id(2)}/${id(13)}/${id(22)}.pdf','${id(1)}')`);
  await db.query("insert into storage.objects(bucket_id,name,owner_id) values('team-submissions',$1,$2)",[file,id(101)]);
  await db.query("insert into public.submissions(id,task_id,submitted_by_id,submission_type,file_path,file_name) values($1,$2,$3,'file',$4,'final.pdf')",[id(22),id(12),id(1),file]);
  await blocked(`delete from storage.objects where name='${file}' returning id`);
  await blocked(`update storage.objects set name='replacement' where name='${file}' returning id`);
  r=await db.query(`select count(*)::int n from public.submissions where task_id='${id(12)}'`);assert.equal(r.rows[0].n,2);
  await as(2);r=await db.query('select id from public.submissions');assert.equal(r.rows.length,2);r=await db.query('select name from storage.objects');assert.equal(r.rows.length,1);
  await as(4);r=await db.query('select id from public.tasks');assert.equal(r.rows.length,0);r=await db.query('select id from public.submissions');assert.equal(r.rows.length,0);r=await db.query('select name from storage.objects');assert.equal(r.rows.length,0);
  await as(3);await db.exec(`update public.tasks set status='done' where id='${id(12)}'`);await blocked(`delete from public.tasks where id='${id(12)}'`);
  await db.exec(`update public.tasks set status='in_progress' where id='${id(12)}'`);r=await db.query(`select completed_at from public.tasks where id='${id(12)}'`);assert.equal(r.rows[0].completed_at,null);
  await owner();await db.exec(`create policy test_deny_update on public.tasks as restrictive for update to authenticated using (true) with check(id<>'${id(14)}' or status::text<>'submitted')`);
  await as(1);await blocked(`insert into public.submissions(id,task_id,submitted_by_id,submission_type,drive_url) values('${id(24)}','${id(14)}','${id(1)}','drive_link','https://drive.google.com/file/d/test')`);
  await owner();r=await db.query(`select id from public.submissions where id='${id(24)}'`);assert.equal(r.rows.length,0);
  r=await db.query(`select public,file_size_limit from storage.buckets where id='team-submissions'`);assert.equal(r.rows[0].public,false);assert.equal(Number(r.rows[0].file_size_limit),20971520);
  console.log(`PASS ${type} status schema: migration, member field/transition guards, ownership, atomic submission, review/resubmit history, private file policies, inactive denial, timestamp rules, rollback`);
  await db.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});
