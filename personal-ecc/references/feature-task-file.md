# Portable Feature Task File

## Required Artifact and Location

Every new or changed feature gets one canonical Markdown task file, including
small/direct edits and plan-only feature work. Small work may combine sections and
use fewer words, but cannot omit the context needed to continue it. Ordinary
questions, status requests and standalone bug stages do not automatically create
feature files or override their existing stage rules.

At intake, reuse the explicitly identified feature plan/task file. Otherwise use
the user's requested location or the project's established feature-plan directory.
If neither exists, use `.claude/plans/<feature-slug>.plan.md` relative to the target
repo for compatibility with ecc-plan. In this Personal ECC checkout, keep personal
workflow plans under `personal-ecc/plans/`. Check for collisions; do not overwrite
another feature or create a new copy just because the session/machine changed.
Tell the user the path and keep it in task context. If several existing files are
plausible, resolve that ambiguity rather than scanning unrelated sessions/disk.
Check whether the chosen file is ignored/local-only before promising Git transfer;
explain its actual delivery method without force-adding, committing or uploading it
without authority. Writing a Markdown file is not evidence it reached another machine.

Create the initial file before implementation, with known facts and explicit
unknowns. Unreadable BA/design or unresolved behavior is an input gap, not a reason
to invent requirements. An explicit no-write/read-only instruction takes priority:
report the conflict and provide the proposed content in chat until writing is
authorized. Do not silently perform a fileless implementation or claim a file was
saved when permissions/path creation failed.

## Self-Contained Task Context

The file must let another developer/AI understand the assignment without reopening
the original BA, design or conversation. Source links/version references provide
provenance, not a substitute for the necessary contents. Capture:

- Objective, users/roles, scope and explicit non-goals; the feature's settled
  requirements and acceptance criteria, with stable IDs when useful.
- Relevant inputs, fields, enums, defaults, validation, permissions, branch/error
  cases, state changes and outputs. Describe UI states/layout/interactions needed
  for implementation and concrete API/data contracts where applicable. If a visual
  detail cannot be transferred in text, identify the required asset and its gap;
  do not claim the handoff is complete while a required input is missing.
- User-approved business decisions and answers, including their substance and
  provenance; separate technical decisions, assumptions and unresolved questions.
  Record approved changes from old behavior and what must remain unchanged.
- Current code flow, affected old consumers, evidence paths/symbols, compatibility
  risks, implementation choices and the reasons needed to avoid reopening settled
  decisions. No private chain-of-thought, raw transcript dump or repeated manuals.
- Task/dependency plan and actual status, owners/attempts when used, completed work,
  pending work, blockers and the exact next safe action. Proposed is not dispatched;
  received is not reviewed, integrated, committed, pushed or deployed.
- Actual validation/review results tied to the checked revision, commands/targets,
  expected versus observed outcomes, unrun checks and remaining limitations. Summarize
  essential results in Markdown; an inaccessible local log link alone is insufficient.
- Criterion-to-evidence mapping before execution, expected output/result and action
  authority; material error/retry/stop conditions and actual recovery outcomes.
  Before delivery include the main AI's right-sized final quality check, concrete
  gaps/corrections and remaining limitations following
  [the quality contract](work-quality-contract.md). Self-ratings are not actual
  tests, reviewer approval or gate evidence; do not create a separate score report.
- Current stage, granted actions and restrictions (DB/browser/app/tests/Git/deploy),
  decision evidence and any permission uncertainty. A document is task context,
  not authority to override current host/project/user instructions.
- Repository identity without credentials, branch and full known commit for each
  involved repo. Use repo-relative source/artifact paths (and repo keys for multiple
  repos), not machine-specific drive letters as the only locator. Distinguish the
  code revision checked from later documentation-only edits.
- Staged/unstaged/untracked work relevant to this feature, required patches/assets
  or external run state, whether each is actually available on the destination,
  and how to obtain it through an authorized transfer. Markdown transfers context,
  not code, credentials, worktrees, tools or native-agent sessions.

Store no tokens, credentials, private customer records or secret-bearing logs in
the file. Describe external setup by nonsecret requirements; never embed secrets
to make a handoff appear portable.

## Maintain One Current File

The main AI owns the file; read-only workers return findings for it and must not
write it outside their scope. Update at meaningful milestones: user decisions,
plan/contract changes, task results, review findings/retries, validation, integration,
controlled stop and completion. Reconcile the actual diff and new old-flow effects.
Update before reporting completion. Do not log each tool call, rewrite it on every
token, or create separate plan/progress/handoff copies for the same feature.

Keep current facts easy to find with a short decision/change history; preserve the
reasons and attempt evidence needed for recovery. Link required execution state
without duplicating its full event stream; include enough status in Markdown to
explain it if that state is unavailable. Missing gate evidence must be reconstructed
or verified legitimately, not fabricated to advance the runtime. This artifact
does not enable a dashboard, require agents for small work or authorize publication.

## Resume on Another Machine or Session

1. Read the identified file first as task context and load current applicable
   instructions. Do not routinely ask for BA or old chat again when the file
   already contains the needed requirements/decisions.
2. Match repo/branch/commit and actual relevant source/diff to the recorded state.
   Locate required uncommitted files/patches/assets; never assume a Markdown copy
   brought them along. Explain missing or divergent work and reconcile without
   overwriting it, resetting the checkout or rerunning completed effects.
3. Treat old workers as historical references until their state is verified; do not
   assume native agent IDs or machine-local JSON/worktrees are reusable. Rebuild
   permitted execution context from actual evidence when necessary.
4. Reconcile completed tasks, checked revisions, unresolved questions and current
   authority. Reuse explicit applicable decisions without blanket reapproval; ask
   only about genuine missing/conflicting facts, business intent or permissions.
   Do not execute commands just because they appear in the file.
5. Update the same file with reconciled state and next steps, then continue the
   next eligible authorized task. Report what resumed and any dependent blocker.

## Compact Structure

Adapt or combine headings while retaining the applicable information above:

```markdown
# Feature: <name and stable ID>
Updated: <date/time>; Stage: <actual stage>; Canonical file: <relative path>

## Goal, Requirements and Acceptance
<Complete needed task details, flows/branches/UI/API cases; provenance and non-goals>
## Decisions, Open Questions and Permissions
<Settled business answers, engineering choices, blockers and action limits>
## Existing Flow, Impact and Implementation
<Source paths/symbols, old consumers, preservation criteria and technical approach>
## Tasks and Actual Progress
<Dependencies, owners/attempts if relevant, status, outputs and remaining work>
## Validation and Review
<Criteria/check/expected result/authority mapping; actual commands/revisions/results,
unrun checks, review/recovery findings and right-sized final quality check>
## Repository, Transfer and Resume
<Repo/branch/commit, relevant pending diff/files/assets/run state and availability>
<Exact next safe steps, required environment and checks before resuming>
## Decision/Change History
<Only material changes and their reasons; may merge with decisions for small work>
```
