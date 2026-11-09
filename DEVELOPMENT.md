# Working from Mac and Windows

GitHub is the shared copy of committed code and project documentation. Each
computer keeps its own checkout and its own Codex conversation. Continue the
original Mac conversation when traveling; no conversation migration is needed.
Neither conversation automatically knows the other conversation's latest work.

## Simple branch rule

Use one shared branch named `work-in-progress` for ongoing work on either
computer. Use only one computer at a time. Reserve `main` for reviewed releases.
Saving to GitHub and publishing the live website are separate intentions, but
Vercel can automatically deploy a push. Verify Vercel's production branch,
preview behavior and any automatic Supabase integrations before the first push.
Do not assume a development branch means no deployment at all.

The owner verified on November 4, 2026 that Production tracks main, Preview
tracks all unassigned Git branches, and Ignored Build Step is Automatic.
With those settings, work-in-progress is a preview branch. An approved push may
create a preview or be skipped automatically; documentation-only changes do not
guarantee no deployment. Do not merge or push to main to synchronize computers.
See PROJECT-STATUS.md for evidence and current verification limits.

See PROJECT-STATUS.md for the current publication state. The first commit and
push require the owner's approval. These instructions become shared only after
that approved push and a subsequent pull on the Mac. The existing Mac files are
not changed by this Windows setup.

## Before starting a session

Open the correct project folder, then ask Codex:

> Read AGENTS.md, PROJECT-STATUS.md and DEVELOPMENT.md. Check this checkout for
> unsaved or uncommitted work and compare its branch with GitHub. Do not discard,
> reset, automatically stash, merge, push or deploy anything. If it is clean,
> help me bring work-in-progress up to date with a fast-forward pull before we
> edit. Preserve the website's existing appearance and behavior.

The commands below are for an already-published branch with configured tracking:

```sh
git status --short --branch
git branch --show-current
git remote -v
git fetch origin
git switch work-in-progress
git pull --ff-only
```

Do not switch or pull over local modifications. If Git says a branch has
diverged, or if a command reports conflicts, stop and ask Codex to inspect both
histories. Do not resolve it with force-push, reset --hard, checkout --ours,
checkout --theirs, or blanket replacement of files.

## Before switching computers

1. Save open files and test the changes that are ready to preserve.
2. Ask Codex to update PROJECT-STATUS.md with what changed, decisions, tests,
   unfinished work and the exact next step. Do not include credentials or
   personal team data: this is a public repository.
3. Review `git status` and `git diff`; include new/untracked files in the review.
4. Explicitly authorize a commit and push of only the reviewed files to
   `work-in-progress`. A clearly labeled unfinished-work checkpoint is acceptable
   on this branch once preview deployment behavior is approved; never release it
   to main merely to transfer it.
5. Confirm the push succeeded and local HEAD matches origin/work-in-progress.
   Changes committed but not pushed are still only on that computer.
6. Stop editing there. On the other computer, follow Before starting a session.

Ask Codex:

> Prepare a handoff for the other computer. Update PROJECT-STATUS.md, show me
> the changed files and test results, and wait for my approval to commit and
> push this checkpoint to work-in-progress. Do not merge or deploy production.

After approval, stage exact reviewed paths rather than `git add .` blindly:

```sh
git add AGENTS.md DEVELOPMENT.md PROJECT-STATUS.md
git commit -m "Document shared Mac and Windows workflow"
git push -u origin work-in-progress
git status --short --branch
git rev-parse HEAD
git rev-parse origin/work-in-progress
```

For later changes, substitute the actual reviewed filenames and commit message.
Never paste tokens into commands or chat. Each computer authenticates separately.
Use the owner's chosen Git name and GitHub-associated or GitHub noreply email;
do not infer identity from the operating-system account.

## First use on the Mac (owner-assisted, not performed remotely)

Keep the existing folder and original Codex conversation. Open that conversation
and give it the Before starting a session prompt plus the repository and branch
names. Before changing the Mac checkout, ask it to inspect local changes,
branches, stashes and unpushed commits. Back up that folder, including hidden
files, before reconciling any differences. A GitHub clone cannot contain changes
that were never pushed from the Mac.

From the existing project folder on the Mac, save any editor buffers and run
these inspection commands first (they do not change website files):

```sh
git rev-parse --show-toplevel
git remote -v
git status --short --branch
git diff --stat
git diff
git diff --cached
git ls-files --others --exclude-standard
git stash list
git branch -vv
```

Inspect untracked files separately; ordinary git diff does not show their
contents. Never put secret files or private team data in chat or GitHub. If the
working tree has changes, stop before switching or pulling. Back up the complete
folder including hidden .git and ignored files, then ask the original Mac
conversation to help preserve and reconcile the work. Do not auto-stash it.

After confirming the correct remote, `git fetch origin` updates remote-tracking
references without changing website files. Then inspect local-only commits:

```sh
git log --oneline --branches --not --remotes
```

Any output may represent Mac-only committed work. Review that history and any
stashes even if the working tree is clean. Do not assume switching branches
automatically incorporates it. Do not pull or reconcile until that work is safe.

Once the Mac is safe and the shared branch has been published, the usual first
checkout is `git fetch origin` followed by
`git switch --track origin/work-in-progress` when no local branch of that name
exists. If it already exists, inspect it and use `git switch work-in-progress`
instead. Have Codex check first; do not blindly run branch commands.

On the shared branch, use `git pull --ff-only`, then ask the original conversation
to read AGENTS.md, PROJECT-STATUS.md and DEVELOPMENT.md. If the branch has not
been published yet, stop; do not create an unrelated replacement on the Mac.

Confirm the Mac's origin is https://github.com/LivelongChart/HappysFoundation.git.
If it differs, inspect why before changing it. Pulling the shared documentation
does not replace or erase the original conversation. Ask the old conversation
to read the new files explicitly; do not assume it reloads instructions mid-chat.

## Release to the live website

Use a pull request from work-in-progress to main after the intended changes are
complete. Review the diff and relevant local/preview tests. Ask for approval
before merging; a merge into the configured production branch may deploy.
Do not run `vercel --prod` or push main as a shortcut. Verify the deployed SHA
and live behavior after an approved release. Before the next work session,
reconcile the shared branch with main in a reviewed operation; never force it.

## Prevent common mistakes

- Never work on the same branch on both computers simultaneously.
- Do not sync live checkout folders with iCloud/OneDrive/Dropbox; use Git for
  code exchange. Keep backups separate from the active checkout.
- Pull before editing; push an approved checkpoint before leaving.
- An offline edit remains local until pushed; tell the other conversation.
- Do not copy one checkout over the other to resolve conflicts.
- Keep .env files, credentials, browser sessions and service keys out of Git.
- Store decisions and progress in PROJECT-STATUS.md, lasting rules in AGENTS.md,
  and detailed technical behavior near the code (for example team/README.md).
- Important chat-only decisions must be written into these shared files and
  included in the approved commit before switching machines.
