# Shared project status

Updated November 4, 2026. Update this file before every computer handoff.

## Current source and locations

- Repository: LivelongChart/HappysFoundation; remote URL unchanged.
- Recovered main: 99a5942b1b910c0dd05d3766eee20a77eee04114, October 28, 2026.
- Recovered history: 23 commits. A fresh GitHub branch-list check on November 4
  returned only main at the recovered SHA; work-in-progress exists locally only.
- Windows primary folder: C:\Users\aryas\Documents\Codex\Projects\HappysFoundation.
- Windows local branch: work-in-progress, created from recovered main.
- Preparation snapshot before the first documentation commit: this branch and
  these documents are not yet on GitHub or the Mac. No commit or push has been made.
- Repository-local Git identity is configured with the owner's approval:
  Arya Shah <180571270+LivelongChart@users.noreply.github.com>. The supplied
  noreply address matches the linked GitHub account ID and login. No global
  identity settings were changed.
- Git Credential Manager 2.9.1 is installed and configured as the credential
  helper, but credential enumeration in the restricted session returns access
  denied. The owner's normal PowerShell browser login completed: a supplied
  screenshot shows Credential Manager listing LivelongChart and ls-remote
  returning main at the recovered SHA. Saved sign-in and repository read access
  are verified from that terminal. The repository is public, so this read does
  not prove authenticated write permission. No push or write-permission test ran.
- Original recovery checkout remains intact in the dated migration workspace.
  Use the primary folder above for future Windows editing; avoid parallel copies.
- Mac path, working tree, branches, stashes and original Codex conversation have
  not been accessed or changed. Their latest state is unknown.

## Confirmed architecture and verification

Static HTML/CSS/JavaScript, 29 public HTML pages and a separate team/ portal.
No application npm dependencies or build step. Vercel clean URLs and portal
security headers are defined in vercel.json. Supabase Google PKCE, team member
authorization, assignments and private submissions are implemented in portal
source; live operation is not certified.

Both application JavaScript files passed syntax checks. Static audit of the 29
public pages and portal found 224 literal local HTML/CSS references with no
missing files. This does not verify runtime or dynamic links. Local preview
process started, but automated loopback requests timed out or were denied.
Browser verification stopped because the tool could not determine Chrome's URL
reliably. Visual, navigation and responsive tests remain incomplete.

Public forms, newsletter signup, shop and public account flows include deliberate
unfinished behavior. Do not describe them as connected or repair them during
migration without a separate request.

## Connected services

- GitHub plugin reports owner account LivelongChart with repository read/push
  permissions. This does not authenticate terminal Git automatically.
- Vercel team API access now works. Project happys-foundation has READY production
  deployment dpl_7dd8pwU4RhuyeoDYpDyggAfBq1eQ, sourced from GitHub repository
  LivelongChart/HappysFoundation, main, commit 99a5942b1b910c0dd05d3766eee20a77eee04114.
  Both happysfoundation.org and www.happysfoundation.org are verified on this
  project and assigned as deployment aliases. The apex redirects to www with 308.
- The owner verified the following dashboard settings on November 4, 2026:
  Production Branch Tracking: main; Preview: All unassigned Git branches;
  Ignored Build Step: Automatic. The supplied screenshot corroborates Production
  and Preview tracking; Ignored Build Step was confirmed in the owner's message.
  vercel.json contains no explicit git.deploymentEnabled rule.
- An approved push solely to work-in-progress is expected to use Preview rather
  than update production. Automatic skipping may omit a redundant build; a
  documentation-only commit is not a guarantee of no preview deployment. Do not
  push main, merge, promote or otherwise deploy production without approval.
  No Vercel settings, deployment skipping rules or aliases were changed.
- Supabase happys-team-portal reports INACTIVE on Free. Portal API URL matches.
  Inactivity auto-pausing is plausible but not proven by retrieved logs. No
  resume, migrations, configuration changes, data writes or deployments occurred.
- team/README.md lists outstanding RLS, OAuth redirect, storage and migration
  installation checks. Never assume checked-in SQL was applied in production.

## Context recovered from the owner's November 4 handoff

The handoff describes the intended editorial identity, a developing animal-welfare
coordination nonprofit, separate commercial activities, and preservation of the
Wix-derived appearance. These preferences are authoritative design constraints,
but described features are not proof of implementation in the recovered code.

Unverified proposals include an ivory reading panel for homepage progress content,
two Found an Animal photographs and responsive layout refinements. Do not apply
them during migration. The handoff may describe newer Mac-only work: compare
that checkout with GitHub before concluding it is recovered or missing.

## Next actions

1. Owner reviews these shared documents. Normal-terminal Git browser sign-in
   and repository read access are confirmed; restricted-session credential-store
   access remains unavailable. Do not push merely to test authentication.
2. Production/Preview tracking and Ignored Build Step have been verified by the
   owner; API team access and production domain/deployment identity are verified.
   Recheck settings if they change before a future release.
3. Resolve local browser connectivity, then test public pages, navigation and
   portal fixtures. Do not change appearance to fix environment problems.
4. Obtain explicit approval for a documentation commit/push to work-in-progress,
   including any automatic preview that push may trigger.
5. On the Mac, use the original conversation to inspect and preserve local-only
   work before checking out/pulling the shared branch and documentation.
6. Investigate inactive Supabase with the owner; reactivation and live write tests
   require separate approval. Do not replace or reset the project.

## Handoff template for future sessions

- Computer and branch:
- Latest pushed commit:
- Completed work / files:
- Decisions and reasons:
- Checks passed:
- Checks not run / known issues:
- Local-only work or secrets requiring separate transfer (names only):
- Exact next action:
- Approval still required:
