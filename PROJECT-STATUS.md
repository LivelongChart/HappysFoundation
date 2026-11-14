# Shared project status

Updated November 9, 2026. Update this file before every computer handoff.

## Current source and locations

- Repository: LivelongChart/HappysFoundation; remote URL unchanged.
- Recovered main: 99a5942b1b910c0dd05d3766eee20a77eee04114, October 28, 2026.
- Shared branch: local work-in-progress tracks origin/work-in-progress at 3a8ebad.
  The current approved release candidate adds the locally reviewed homepage and
  Found an Animal refinements described below; it has not yet been committed at
  the time of this checkpoint.
- Windows primary checkout is the owner's established Codex project folder;
  its machine-specific absolute path is intentionally omitted from shared docs.
- Windows local branch: work-in-progress, created from recovered main.
- The Mac integration commits d805343 and 3a8ebad are present on the shared
  branch. Production remains on main at 99a5942 until the approved release is
  merged through the normal GitHub/Vercel workflow.
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
- The original Mac work is preserved on local branch mac-work-backup at cb647c4.
  A complete verified backup, including .git, hidden files and untracked files,
  is stored outside the active checkout in the dated sibling folder
  HappysFoundation-mac-backup-2026-11-04. The original Codex conversation remains
  intact. Eight raw source images remain local and untracked by design.

## Confirmed architecture and verification

Static HTML/CSS/JavaScript, 29 public HTML pages and a separate team/ portal.
No application npm dependencies or build step. Vercel clean URLs and portal
security headers are defined in vercel.json. Supabase Google PKCE, team member
authorization, assignments and private submissions are implemented in portal
source; live operation is not certified.

Both application JavaScript files passed syntax checks. A November 4 static audit
of 32 HTML files found no missing local href/src targets. Headless browser checks
covered 14 representative public and portal routes at 1280, 853, 427 and 375 px:
all 56 route/viewport combinations loaded without missing images, horizontal
overflow or browser exceptions. The isolated Team Portal fixture passed all 11
assertions at both 1180 and 390 px using mocked data only. These checks did not
connect to Supabase or alter production data.

The November 9 release candidate preserves the approved Atmospheric Field
homepage hero, editorial homepage navigation/features, responsive homepage
layout, and the expanded I Found an Animal safety/resource guidance. Cat, Dog,
and Wildlife choices control one shared expandable guidance region before the
emergency panel; it is collapsed initially, supports keyboard activation, and
never displays more than one species panel at a time. Six optimized, referenced
public image assets and their source records are included. Eight raw source
images in Images/ remain intentionally local and untracked.

Pre-release checks on November 9 covered all 29 public HTML files for missing
local references; 16 representative public/portal routes at 1280, 853, 427 and
375 px for browser exceptions, missing images and overflow; the homepage at
1920, 1600, 1440, 1280, 1024, 768, 430 and 390 px; the animal-guidance controls
at 1440, 1024, 768, 430, 390 and 320 px; and the offline Team Portal fixture at
1180 and 390 px. No material failures were found. The portal fixture passed all
22 assertions at each width using simulated data only. Live Supabase writes,
authentication and migrations were not exercised or changed.

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

The reviewed Mac refinements are now preserved in local integration commit
d805343. They clarify preview-only public form behavior, improve safety and
emergency routing, preserve the public contact email, add the licensed outdoor-cat
asset and responsive Found an Animal refinements, and record its source. The
eight excluded raw source images remain outside Git because some are unoptimized,
have unresolved licensing, or contain metadata that should not be published.

## Next actions

### Local homepage showcase checkpoint — November 11, 2026

- Local, uncommitted homepage work replaces the former Dual-Impact, animal-welfare
  challenges, and coordination sections with four alternating editorial rows for
  services, partnerships, participation, and Foundation support. The approved
  hero, three pathway cards, checkerboard fade, closing statement, and interior
  pages remain unchanged.
- The showcase reuses four tracked images already recorded in `IMAGE-SOURCES.md`
  and links to `/customers`, `/partner`, `/services`, and `/donate`. The donation
  destination continues to state that secure online giving is not active.
- The Help the Animals row now uses the owner-provided Pexels photograph of a
  puppy and cat outdoors, saved as an optimized local asset with its source noted.
- The existing homepage IntersectionObserver handles each row independently;
  reduced-motion behavior remains visible and motion-free. No new dependency or
  observer was added.
- Local Chrome checks at 1280, 853, 427, and 375 px found four rows, correct
  desktop alternation and mobile stacking, no missing images, horizontal
  overflow, or page exceptions. All four destination routes returned HTTP 200.
- Remaining step: owner visual review. Do not commit, push, merge, or deploy this
  checkpoint without explicit approval.

### Animal Resources navigation image checkpoint (2026-11-11)

- Replaced only the Animal Resources mega-menu photograph with the owner-supplied
  black-cat-and-tabby image and stored an optimized 1350 x 1800 JPEG derivative.
- Updated the descriptive alternative text and adjusted the menu-specific focal
  position so both cats remain visible in the existing rectangular crop.
- The compact mobile navigation intentionally remains text-only, preserving its
  established responsive behavior and layout.

### Partner With Us image checkpoint (2026-11-11)

- Replaced only the homepage Partner With Us photograph with the owner-supplied
  dog-and-person image and stored an optimized 1201 x 1800 JPEG derivative.
- Preserved the existing organic frame, alternating layout, dimensions, and
  fade-up animation; updated the alternative text and focal position so the
  dog's face and paw-to-hand contact remain visible.

### Join the Team homepage copy checkpoint (2026-11-11)

- Updated only the Join the Team description and CTA so the section describes
  developing paid local-service opportunities rather than nonprofit volunteering.
- The CTA now links to `/apply`, whose current youth-provider path describes paid
  work while clearly identifying its form as a non-submitting preview and its
  adult/professional paths as future tracks.

### Our Mission hero copy checkpoint (2026-11-11)

- Updated only the Mission hero headline and supporting paragraph to pair the
  Houston starting point with Happy's longer-term global vision.
- The existing eyebrow, cat photograph, hero geometry, and remaining Mission
  page content are unchanged.

### Mission page editorial redesign checkpoint (2026-11-11)

- Rebuilt the local Mission page as an evidence-led story: controlled-chaos
  animal-photo collage, 2025 shelter statistics, four intended priorities,
  Houston coordination boundaries, and research/action pathways.
- The Reality section uses Shelter Animals Count's 2025 estimates of 5.8 million
  U.S. dog/cat community intakes and 597,000 euthanasia outcomes, plus BARC's
  reported 22,445 Houston intake total. Each figure links to its primary report
  and includes geography, year, and a definition note.
- The hero collage reuses five existing local, source-recorded animal images. A
  Mission-scoped IntersectionObserver provides progressive fade-up motion while
  leaving content visible without JavaScript and under reduced motion.
- This work remains local and uncommitted pending owner visual review.
- Refined the collage hero copy geometry after review: the text is now top-anchored
  inside a wider protected reading area with a smaller maximum display size and
  additional hero height, preventing low placement or clipping at intermediate
  widths while leaving the collage photographs unchanged.
- A subsequent owner-directed revision moves the headline into the open left
  field, locks its desktop composition to two lines, and replaces all collage
  photography with six newly supplied, locally optimized animal images. Source
  provenance remains recorded as owner-supplied with creator confirmation pending.

### Sitewide responsive-layout checkpoint (2026-11-12)

- Refined the shared public-page frame after reviewing Harvard's responsive
  behavior: large screens now use a fluid gutter and a 1520 px maximum content
  width, while the header and page shells remain aligned to the same frame.
- Moved the compact navigation transition to 900 px so tablet widths use the
  established menu instead of compressing the full desktop navigation. Compact
  gutters step down again at 620 px; existing page-specific breakpoints remain
  in place for their individual compositions.
- Removed a Mission-page overflow at 768 px by allowing the closing heading to
  wrap at compact widths. No public-page copy, imagery, routes, or functionality
  was changed as part of this responsive pass, and the Team Portal was untouched.
- Automated Chrome checks covered all 29 public routes at 1920, 1440, 1280,
  1024, 768, 500, 390, and 320 px (232 route/viewport combinations): all routes
  returned HTTP 200 with no horizontal overflow or page exceptions. Separate
  scrolled checks confirmed homepage lazy-loaded images at desktop and mobile.
- Interaction checks passed for keyboard-operated desktop dropdown navigation,
  the compact mobile menu, the Found an Animal guidance selector, and 320 px
  contact-form control containment. This work remains local and uncommitted
  pending owner visual review.
- Owner-requested homepage follow-up: the four alternating showcase rows now
  retain the previously approved compact 1120 px desktop frame, tighter row and
  column gaps, and a 56 px display-heading ceiling. The shared sitewide frame
  remains unchanged, as do the established tablet/mobile stacking rules.

### Final pre-production audit checkpoint (2026-11-13)

- Audited all 29 public HTML routes for metadata, internal links and anchors,
  duplicate IDs, image alternative text, and referenced assets; no unresolved
  static-audit errors remain.
- Corrected the homepage Wildlife destination to the current Texas Parks and
  Wildlife rehabilitator path and replaced four unavailable Wix-hosted research
  downloads with public, repository-hosted PDF copies of the same articles.
- Clarified Marketplace, customer-service, and youth-provider pages so planned
  commercial services and non-submitting preview forms are not presented as
  operational services or active hiring.
- JavaScript syntax checks passed. Automated Chrome verification covered all 29
  routes at 1920, 1440, 1280, 1024, 768, 500, 390, and 320 px with no horizontal
  overflow, page exceptions, or non-lazy broken images. Scrolled homepage checks
  confirmed every lazy-loaded image and fade-up reveal.
- Browser interaction checks passed for keyboard desktop navigation, Escape
  handling, compact mobile navigation, Cat/Dog/Wildlife guidance selection,
  preview-form non-submission, reduced-motion visibility, JavaScript-disabled
  Mission content, the Mission gradient and statistic alignment, and all four
  local research PDF routes.
- The existing Supabase project remains inactive. Public pages are unaffected,
  but Team Portal authentication and database-dependent features must be treated
  as unavailable until the owner separately approves project reactivation.

1. Owner reviews these shared documents. Normal-terminal Git browser sign-in
   and repository read access are confirmed; restricted-session credential-store
   access remains unavailable. Do not push merely to test authentication.
2. Production/Preview tracking and Ignored Build Step have been verified by the
   owner; API team access and production domain/deployment identity are verified.
   Recheck settings if they change before a future release.
3. Review the two local integration commits and obtain explicit approval before
   pushing work-in-progress. A push may trigger a Vercel preview; it must not be
   treated as approval to merge main or deploy production.
4. Public forms, account creation, newsletter signup and shop behavior remain
   intentionally unconnected or incomplete and require separate implementation.
5. Investigate inactive Supabase with the owner; reactivation and live write tests
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
