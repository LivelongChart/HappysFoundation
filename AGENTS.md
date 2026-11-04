# Happy's Foundation project instructions

## Start here
- Repository: LivelongChart/HappysFoundation.
- Read PROJECT-STATUS.md and DEVELOPMENT.md before working.
- Check Git status, branch, and remote history before editing.
- Treat the user's handoff as context; verify implementation claims against code.
- Never overwrite, discard, or automatically stash existing work.

## Preserve the website
- No redesign or visual/content changes unless explicitly requested.
- Preserve the Wix-derived identity, fonts, typography, colors, spacing, layouts,
  imagery, animations, navigation, and responsive behavior.
- Preserve any existing checkerboard/color progression; do not implement proposed
  handoff designs merely because they are described there.
- Keep the static HTML/CSS/JavaScript architecture and working features.
- Make targeted changes; avoid broad rewrites and new dependencies.

## Content and backend
- Do not invent achievements, partnerships, legal status, or capabilities.
- Keep nonprofit and commercial activities clearly distinct.
- Do not imply emergency dispatch, guaranteed placement, or tax deductibility.
- Use real, appropriately licensed photography; record sources.
- Preserve Supabase Auth, RLS, private storage, existing data, and configuration.
- Never expose secrets or commit environment files.
- Do not resume, migrate, reset, or alter production services without approval.

## Two-computer workflow
- GitHub shares committed code and documentation, not local chat history.
- Preserve the original Mac conversation. Never access or change the Mac remotely.
  Update its checkout only in the owner's Mac session after inspecting local work.
- Use one active computer at a time on the same shared development branch.
- Stop on a dirty tree, divergence, or conflicts; explain before resolving.
- Do not force-push, reset destructively, or change main without approval.
- Ask before committing, pushing, merging, or deploying.
- A push may trigger Vercel; verify deployment behavior before publishing.

## Verify and hand off
- Run checks appropriate to the change; do not claim untested behavior works.
- For approved visual edits, test relevant widths and provide screenshots.
- Update PROJECT-STATUS.md with decisions, work completed, tests, blockers, and
  the next step; distinguish planned work from implemented work.
- Report modified files and material limitations.
