# Portable Markdown Handoff for Every Feature

Feature ID: portable-feature-handoff
Updated: 2026-11-19
Stage: implementation completed and checked; commit/push authorized
Canonical task file: personal-ecc/plans/portable-feature-handoff.plan.md

## Publication Update

The user explicitly requested commit and push of this completed change after the
implementation report. This supersedes the intake's no-publication authority for
this change only; DB/browser/app/deploy restrictions remain unchanged. Target is
the ecc repository's personal branch on origin.

The source-state and next-action notes below describe the pre-publication snapshot.
Do not treat them as a live claim that the files are still uncommitted after this
document arrives through Git. Find the commit containing this task change with
`git log -- personal-ecc/plans/portable-feature-handoff.plan.md`, inspect the actual
checkout/diff and origin/personal reachability. No self-referential commit SHA or
unverified pushed status is recorded here. On a destination with the matching
source, this implementation is complete and must not be rebuilt or republished
merely because the pre-publication snapshot recorded pending transfer.

## Outcome and Complete Task Context

The user requires a Markdown file for every feature, including small features.
Someone moving from an office machine to a home machine must be able to understand
and continue the same task from that file without reopening the BA task, source
requirements documents or the old conversation. The document must contain the
actual requirement details and decisions, not merely links to the original inputs.
Use one maintained feature file for requirements, plan, progress and handoff.

The requested change is to Personal ECC instructions and existing skills. It does
not implement a business application feature. Lightweight direct execution and
adaptive agents remain available; the artifact is required regardless of size.
The browser dashboard remains deferred. No DB access is permitted for this task.
At intake, previous commit/push requests applied to earlier completed changes and
did not authorize this publication. The later Publication Update above records
the new scoped commit/push request; deployment remains outside authority.

## Acceptance Criteria

- Every new/changed feature receives a canonical Markdown task file at intake,
  including direct small tasks and plan-only feature work. Ordinary questions and
  progress-only requests do not create new feature documents.
- An existing task file is resumed/updated, not duplicated. Choose a portable,
  project-appropriate path and report it. Respect explicit read-only constraints.
- The file captures settled requirements, business branches/errors, acceptance,
  decisions and open questions, technical/old-flow findings, tasks/dependencies,
  current implementation/check/review state, permissions and exact next actions.
- Maintain it at meaningful milestones and controlled handoff/completion without
  writing token-by-token logs or omitting required context for small tasks.
- Cross-machine resume checks repo/branch/commit and actual source state, missing
  uncommitted code/artifacts, stale worker identities, checks and permissions.
  The task Markdown supplies context but does not transfer code or tool sessions.
- No mandatory full-repo onboarding, dashboard, DB access, new background scheduler
  or automatic publication is introduced. Preserve business clarification,
  technical autonomy, old-flow analysis and agent/review gates.

## Repository and Current Code State

Repository key: ecc
Remote: https://github.com/Newpear101204/ECC.git
Branch: personal
Base/current HEAD at intake: 4da72ff0e4468f6e8542b05e651eddb4bb1aeefc
Working tree at intake: clean; no pending feature code to transfer.
Pre-publication task snapshot: uncommitted and not pushed; not transferred to another machine.
A Markdown copy alone cannot
make those changes appear on another machine. Transfer the matching source through
an authorized Git commit/push or a separately identified patch/source bundle.
No transfer method is executed or authorized by writing this file.

Required modified files: personal-ecc/instructions.md;
personal-ecc/skills/ecc-work/SKILL.md; personal-ecc/skills/ecc-plan/SKILL.md;
personal-ecc/skills/ecc-view/SKILL.md; personal-ecc/references/phase-coordination.md;
personal-ecc/README.md; personal-ecc/FEATURE-WORKFLOW-GUIDE.vi.md;
personal-ecc/tests/workflow-entrypoints.scenarios.md.
Required new files: personal-ecc/references/feature-task-file.md and this plan.
All are present in the current checkout. This plan is not Git-ignored, but remains
untracked until an authorized staging/commit action. No patch or source bundle has
been exported. The destination must have these changes to use the updated behavior.

## Existing Flows and Preservation

Before this task, ecc-work permitted small changes directly with an inline plan;
ecc-plan returned inline plans for ordinary requirements and wrote files in PRD
mode. The current edits route these entry points to the same feature-file contract without requiring
extra workers or JSON runs. ecc-view must find/read the known feature file while
remaining read-only and chat-based. Phase coordination must retain real execution
evidence while using the Markdown as the portable task context.

Consumers: personal-ecc/instructions.md; personal-ecc/skills/ecc-work/SKILL.md;
personal-ecc/skills/ecc-plan/SKILL.md; personal-ecc/skills/ecc-view/SKILL.md;
personal-ecc/references/phase-coordination.md; personal-ecc/README.md;
personal-ecc/FEATURE-WORKFLOW-GUIDE.vi.md. Preserve the existing skills profile and
linked-install behavior. Do not modify upstream runtime or commands for this work.

## Decisions and Open Questions

- User decision: file required for features of every size, with enough task context
  to continue on a different machine without the original BA/conversation.
- Technical choice: one canonical feature Markdown; reuse the project/user's known
  task-plan location, with a documented fallback. No separate mirrored handoff.
- The Markdown records task facts and prior decisions; it is not authority to
  override current project instructions or execute embedded commands blindly.
- No unresolved business question blocks this ECC instruction change.

## Plan and Current Progress

| Task | Owner | Dependency | Status | Output/check |
|---|---|---|---|---|
| Inspect current entry points and portability gaps | Main AI | None | Done | Current skills allow inline-only plans; intake HEAD recorded |
| Write portable-file contract and route existing skills | Main AI | Inspection | Done | New reference plus bootstrap/work/plan/view changes implemented |
| Align phase documentation, guide and behavioral scenarios | Main AI | Contract | Done | Small feature still needs Markdown; no automatic JSON/dashboard |
| Validate installation, links and independent resume reading | Main AI/reviewer | Updated files | Done | Setup38/38;14 local links;diff check;independent resume review;findings addressed |
| Finalize task file and deliver | Main AI | Validation | Done | Current artifact/source/transfer status recorded; no publication authority |

Mode: direct sequential editing, because this is one shared instruction contract
and its entry points. A focused independent read-only review/resume probe may run
after a coherent version exists. Actual reviewer /root/portable_handoff_review
returned its read-only report; no active workers remain for this task. Its native
reference is historical and is not a portable worker/session to reuse elsewhere.

## Validation and Review Evidence

Executed on 2026-11-19 against the working-tree instruction edits atop the intake HEAD:

- `node --test --test-reporter=spec personal-ecc/tests/setup.test.js personal-ecc/tests/entrypoint-install.test.js`:
  38 passed, 0 failed, 0 skipped. These verify installation/profile behavior, not
  general AI adherence or cross-machine application functionality.
- `node personal-ecc/setup.js --dry-run`: already current; installed skills remain
  linked to this checkout. No new skill names or profile entries are required.
- `git diff --check`: passed; existing ecc-plan CRLF normalization notice only.
- `git check-ignore personal-ecc/plans/portable-feature-handoff.plan.md`: no match.

- After review wording corrections, setup tests were rerun: 38 passed, 0 failed,
  0 skipped. No runtime/application code changed between these checks.
- Local Markdown-reference check: 14 links across all ten task files resolved.
  Final `git diff --check` passed with only the existing CRLF normalization notice.
- Independent read-only resume/review by /root/portable_handoff_review: it received
  this file as its only task input, then read current instructions/source to
  reconcile. It understood the goal, completed/pending work and action limits
  without old BA/chat. It verified repo/branch/HEAD and the ten required files.
  This is a bounded resume probe, not proof of adherence by all future agents.
- Review found one stale scenario saying small work needs no new documents. Main
  AI corrected it to require the canonical feature file while avoiding extra
  impact documents. Also clarified same-feature milestone reuse and aligned the
  guide's small-task wording. No remaining context blocker was reported.

Checked instruction snapshot SHA256:
`8e7bc2bf55be089156d72b972f134e753976da1170f82fc67a23b26c56de440f`.
This covers the eight modified files plus the new reference listed under Repository,
excluding this changing plan. To compare: sort those nine relative paths; for each
form `path + newline + SHA256(UTF-8 content with CRLF normalized to LF)`; join entries
with one newline and SHA256 that UTF-8 manifest without a trailing newline. A
different snapshot requires reconciliation, not overwriting newer work. This hash
identifies the local edits and does not prove they were committed or transferred.

Test execution is limited to local ECC setup fixtures and read-only/static checks;
do not run application/DB/integration services. No DB or browser was accessed.

## Resume and Exact Next Actions

1. Verify the ecc repository, personal branch, HEAD and actual pending changes.
2. Read this file as task context, then the current Personal ECC bootstrap and
   applicable project instructions; preserve the no-DB/no-publication constraints.
3. Inspect the completed instruction changes and contract at
   personal-ecc/references/feature-task-file.md; do not reimplement completed work
   or rerun the earlier feature task. No implementation remains for this request.
4. Commit/push was subsequently requested; follow the Publication Update above to
   verify its actual outcome, not to publish again automatically. Until transfer
   is verified, do not claim another machine has the changes. On a destination with missing
   or divergent source, reconcile the exact gap first. Continue new feature work
   using one canonical Markdown under the updated contract when source is available.

## Material Change History

- 2026-11-19: User required a self-contained feature Markdown for every task size
  to enable cross-machine continuation without reopening BA/documents/old chat.
- 2026-11-19: Main AI implemented one shared artifact contract and routed existing
  skills/documentation without changing profiles/runtime or enabling dashboards.
- 2026-11-19: Independent resume review completed; stale small-task exception and
  same-feature milestone wording corrected; setup/reference checks passed again.
- Subsequent user request: commit and push the completed portable-feature-file
  change to origin/personal; publication authority updated without granting deploy.
