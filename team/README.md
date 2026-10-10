# Happy’s Team Portal — workspace upgrade

All application files remain under repository-root `team/`, matching Vercel’s
confirmed Root Directory `./`. Public pages, navigation, clean URLs and redirects are untouched. Root
`vercel.json` adds security headers scoped to `/team/:path*`. There is no build step. The existing browser-safe key and Google
PKCE login configuration in `team.js` are preserved.

## Local preview

From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/team/. The auth redirect uses the current origin plus
`/team/`. Keep both local and production `/team/` URLs in the existing Supabase
Auth redirect allowlist. A signed-in account must still match an active
`team_members` row. No frontend check grants database permission.

## Manual database setup — do this before testing the new live write features

**This hardening pass does not execute SQL or change Supabase. The current
production schema and policies still need an authorized read-only inspection.
Do not infer installation state from these local scripts or rerun the migration
against an existing upgraded schema.**

1. Run `supabase-v2-preflight.sql` in Supabase SQL Editor. This is read-only. Review
   existing status type/checks, task triggers, grants, RLS policies and the definitions
   of the existing no-argument boolean helpers `public.is_active_team_member()` and
   `public.is_team_admin()`. They must identify the current authenticated user, not
   accept user-controlled membership/admin values. Keep those helpers unchanged.
2. Review `supabase-v2-migration.sql`. It expects the existing task/member columns
   described by the current portal, RLS already enabled on both tables, and no
   existing `submissions` table or `team-submissions` bucket. It checks these
   prerequisites and fails instead of silently replacing unfamiliar structures.
3. In a separate SQL Editor execution, select and run **PART 1 only**, from its
   `begin;` through its `commit;`. For an enum status it adds `submitted`; for text
   status it only checks the type. Wait for successful completion. Do not combine
   both parts in one SQL Editor execution: PostgreSQL requires the enum transaction
   to commit before its new value can be used.
4. Select and run **PART 2 only** in another execution. It is transactional. If it
   fails, stop and inspect the error/preflight output; do not remove old policies or
   disable RLS. The enum addition from Part 1 can safely remain if Part 2 rolls back.
5. Refresh the portal, then validate with a real admin, a normal member, and an
   unapproved account. Check that their existing visibility is correct, own-task
   updates work, another member’s updates are denied, and both submission methods
   work. Verify the bucket is private and unauthenticated downloads are denied.

The migration is a one-time installation, not a blanket repeatable reset. If it
finds existing v2 objects, inspect them rather than rerunning by deleting them.
The latest audit rejected anonymous reads of tasks, team_members, and submissions.
Full live constraint/helper definitions could not be read with the browser-safe key;
read-only production policy review is still required.

### Database changes

- Supports `submitted` in enum or text-based task status. Extends status-only checks;
  refuses to rewrite multi-column business constraints. Existing rows are preserved.
- Adds `tasks.submitted_at timestamptz` and
  `tasks.requires_submission boolean not null default false`. Existing assignments
  default to simple tasks; an admin can require a submission for any assignment.
- Creates `public.submissions` with UUID ID, task/member references, submission
  type, Drive URL or private file path/name, optional notes and submission timestamp.
- Adds indexed task/author submission lookups. Submission history cannot be edited
  or deleted through the portal. Tasks with submissions cannot be deleted because
  their references are preserved; mark them Completed instead.
- A before-insert trigger checks ownership and locks the task; an after-insert
  trigger changes its status to Submitted. These run with the caller’s permissions.
  If any step fails, the submission and task change roll back together.
- Task triggers enforce allowed member transitions and reject changes to every
  non-status task field, even if an older table-level UPDATE grant exists.
  Timestamps are server-controlled. Completed sets `completed_at`; reopening clears it.
  `submitted_at` retains the latest submission/review history when returned.

### Permissions and RLS

Existing task/member policies and the existing helper definitions are preserved.
No anonymous grants are added, and RLS is never disabled.

- **Members:** view the tasks existing SELECT policies allow; start their own tasks;
  finish their own simple tasks; submit links/files for their own active tasks.
  They cannot create/delete/reassign tasks or change task contents, and cannot mark
  review-required work Completed. Submitted work waits for admin review.
- **Admins:** existing task creation/edit/deletion permissions remain; they can
  reassign to active members, set dates/status/priority/category, require a
  submission, and mark submitted work Completed or return it to In Progress.
- `team_v2_tasks_member_update` adds the own-assignment status path. Restrictive
  active-member, update-owner/admin, insert-admin and delete-admin policies cap
  permissions from any broader old task policies. Existing SELECT restrictions
  remain authoritative, including any restrictive policies that may need review.
- Submissions are visible to active admins, their authors, and active members who
  can select the related task under the existing task RLS. Inserts require the
  caller’s own active assignment and member ID. No API update/delete rights exist.
- New helpers live in `team_portal_private`, not an exposed API schema. The two
  read-only definer helpers resolve the caller’s member ID without recursive RLS
  and verify ownership of an uploaded object. No data-changing definer function is
  introduced; writes and triggers continue to obey the caller’s existing RLS.

### Storage

Part 2 creates the bucket; **do not create it separately first**.

- Exact bucket name: **`team-submissions`**.
- Private, with a 20 MB limit and an explicit MIME allowlist for PDF, Office
  documents, CSV/text, PNG/JPEG/WebP images and ZIP.
- Paths are `member-id/task-id/submission-id.extension`.
- Active members may upload only under their own active assignment.
- Files can be read by their owner or someone allowed to read the corresponding
  submission. The frontend requests attachment download URLs valid for 60 seconds.
  Anyone given such a signed URL can use it until expiration.
- Submitted files cannot be overwritten or deleted. Owners can remove unlinked
  uploads when retrying a failed submission. Restrictive policies prevent old broad
  Storage policies from widening access to this bucket and leave other buckets alone.
- Upload and database insertion are separate services. On a failed or uncertain
  result, the browser retains a pending ID/path in session storage. Retrying first
  checks whether it committed, avoids a duplicate, and cleans an unlinked upload
  before trying again. Closing the browser can leave an unlinked private upload;
  an administrator may periodically review those in Storage. No files go in Git.

Drive links must use HTTPS on `drive.google.com` or `docs.google.com`. The portal
never changes Google Drive sharing. The submitter must share with intended reviewers.

## Views

The dashboard starts with Needs attention: overdue active assignments, assignments
due within seven days, then undated active assignments. Awaiting review is separate;
Completed is collapsed. Statistics and team activity follow actionable work. The
active count excludes Submitted and Completed. Recent Activity orders submitted/completed tasks by their latest
relevant timestamp. My Assignments retains a collapsed completed section. Team
Assignments includes Submitted work and filters by assignee, status, priority and
category. Only the newest submission for an awaiting-review task offers review actions.

Until the migration is present, the portal still loads the original assignments and
existing admin form. New member status/submission features remain unavailable with
an explanatory message. Backend errors never cause automatic policy changes.

## Admin Team Members

This read-only feature needs **no schema change** and also works with the original
portal schema before the workspace migration. It uses only the existing
`team_members` fields (`id`, `name`, `email`, `role`, `active`) and existing task
fields, including `assignee_id`, `status`, `due_date` and `completed_at`.

In Admin, select **Team Members**. Active members appear alphabetically with their
role and Not Started / In Progress / Submitted / Completed / Overdue counts.
Overdue counts exclude Submitted and Completed because those no longer await member
action. Counts reflect only the tasks returned by existing RLS; no permissions are
expanded and there are no scores, rankings or comparisons.

Each member shows up to three recent completions ordered by `completed_at`
descending. Select their name to open Active Assignments, Submitted / Awaiting
Review, and Completed Assignments. Completed cards say “Completed by [name]” using
the **current assignee**, not the creator or an inferred completion actor. No new
completion-actor field exists. Missing completion dates are labeled and sorted last.
Refresh keeps the selected member open while that member remains active.

## Repeatable local checks

Open `http://localhost:8000/team/tests/browser.html`, choose Desktop (1180px)
or Mobile (390px), and press **Run checks**. Run both widths.
This loads the real UI in an iframe using a local fake Supabase client. It never
contacts Supabase, signs into Google, or uploads real files. It covers admin/member
views, OAuth call options, filters, status actions, submissions, failure recovery,
review, empty/legacy states and sign-out races. For visual inspection:

- `http://localhost:8000/team/tests/fixture.html?mode=admin`
- `http://localhost:8000/team/tests/fixture.html?mode=member`

These are explicitly synthetic fixtures, not production authentication bypasses.
The production portal never imports test code. Root `.vercelignore` excludes these tests, portal SQL and portal documentation
from deployment. `.gitignore` deliberately keeps them eligible for source control.

`tests/database.cjs` exercises the SQL against an isolated PGlite/PostgreSQL
instance for both text and enum schemas. Supply a separately installed PGlite
module path; this project requires no npm dependencies or build system:

```sh
node team/tests/database.cjs /absolute/path/to/@electric-sql/pglite
```

It checks migration execution, own-task field restrictions, forbidden transitions,
atomic submissions, review/resubmission history, private file access, inactive
accounts, immutable records, completion timestamps and denied-write rollback.
These local tests do not certify the unseen production policies or Google OAuth.

Official references:
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://www.postgresql.org/docs/16/sql-altertype.html
- https://supabase.com/docs/guides/storage/buckets/fundamentals

## Focused hardening pass

- Pending submission recovery records the task ID/title and verifies the committed
  submission's task ID. Recovering earlier work never submits or clears a different
  draft, including its selected file. The recovered task is named in the notice.
- Admin edits and deletions compare `updated_at` in the database mutation. A stale
  version changes no row and refreshes the list. This relies on production writers
  maintaining `updated_at`; verify that behavior in production before sign-off.
- View submissions filters Documents to the chosen task. Show all assignments
  clears the filter. Documents read failures have their own retry action and do not
  disable status updates or other assignment features.
- The browser uses Completed for database status `done`. No status/schema changes.
- Portal CSP allows the pinned Supabase SDK, Google Fonts and the configured
  Supabase HTTPS/WebSocket endpoints. Inline scripts, plugins, embedding, and base
  URL overrides are disallowed. `nosniff` and `no-referrer` apply only to the portal.
  OAuth top-level navigation and private attachment downloads remain permitted.
- The exclusions preserve public HTML/CSS/JS and all Images/assets. They protect
  future Git staging and deployment uploads, not past history or files hosted
  elsewhere. Inspect the deployment artifact before the next approved release.

### Verification still required before production sign-off

No live records or policies were changed by local tests. Verify real member/admin
RLS, team_members privilege escalation prevention, private Storage access, inactive
accounts and updated_at maintenance against production. Verify Google OAuth with
`https://www.happysfoundation.org/team/` (the current canonical host), including
Supabase's redirect allowlist. Test an authenticated upload/download and Google
callback with the proposed CSP in an approved preview before production release.
Do not change policies or apply migrations solely to make a local test pass.
