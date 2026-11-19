---
name: ecc-plan
description: Create code-grounded implementation plans for features, complex fixes, or refactors from requirements or a PRD. Use when planning before implementation; cover scope, tasks, dependencies, risks, and validation.
metadata:
  origin: ECC
---

# ECC Plan

Turn requirements into an actionable, verifiable plan based on ECC's
`commands/plan.md` workflow. This skill is self-contained; do not reread the
command file on every invocation. Use English unless the user requests otherwise.

## Scope

Default to planning only: read, search, and write plan documents without editing
implementation code or executing implementation tasks. Present the plan for review.
If implementation is already authorized in the current request or earlier context,
respect that authorization without asking again solely because of this skill.

Choose a light execution mode first. Questions and clear small edits need no task
board or worktree; dependent work can use a brief sequential plan. Delegate
substantial independent work only when authorized by the user or applicable
project instructions, and do not depend on runtime-specific agent names or tools.

For every feature plan, including small tasks, create or update one canonical
Markdown task file using `personal-ecc/references/feature-task-file.md` from the
shared ECC root. It must carry the needed requirements, decisions, progress and
portable resume context without requiring the original BA or old conversation.
Chat summaries accompany the file; they do not replace it. Scale length, not the
artifact requirement. Reuse the same file in ecc-work; do not make a second handoff.

## Inputs

- **Free-form requirements:** use the request and conversation context; persist a
  feature plan in the canonical task file and summarize it in chat.
- **Ordinary Markdown file:** read it as reference; update it if it is the designated
  feature task file, otherwise capture needed task details in the canonical file.
- **`*.prd.md` file:** read the PRD and follow PRD mode below.
- **No requirements:** use prior context; if the objective remains unknown, ask
  one concise question to identify it.

If a path is missing, report it and ask for the correct path when no corresponding
workspace file can be found. Never claim to have read an unavailable file.

## Planning Workflow

1. Restate the objective, expected behavior, and acceptance criteria. Preserve the
   user's scope boundaries. Compare relevant new/old documentation, requirements,
   code/flows/consumers, contracts, tests and other available evidence. Apply the
   business clarification rule below before fixing uncertain outcomes or checks;
   select technical approaches autonomously within agreed scope and authority.
2. Read project instructions and locate relevant code with `rg` or an equivalent
   tool. Find applicable naming, error handling, logging, data access, and test
   patterns. Cite paths and line numbers for examples to follow. State when no
   comparable code exists or repository access is unavailable; do not invent files,
   APIs, dependencies, or validation results.
   Apply Existing-Flow Impact below before settling the change boundary and tasks.
3. Break work into dependency-ordered tasks. For each, identify the concrete
   change, expected files/modules, existing patterns to follow, and completion
   checks. Distinguish verified files from proposed new paths.
   Separate phase order from parallelism within a phase. Identify independent
   coding/review work even when planning itself is sequential. State prerequisites,
   ownership, proposed mode per relevant phase and who does main-AI work. Do not
   imply that proposed workers have already been dispatched. Before execution,
   reassess with actual inputs/slots rather than freezing the plan's initial mode.
4. Identify dependencies, material risks, mitigations, and low/medium/high
   complexity. Avoid precise time estimates without supporting evidence.
5. Select validation appropriate to the change and project rules. Include behavior
   tests for code changes; when TDD is required, plan a failing test before
   implementation. Use verified repository commands or label commands that need
   confirmation. Planned validation is not evidence that tests have run.
6. Present enough detail to begin work, proportional to task size. If approval is
   still required before implementation, state that the next step is approval or
   revision and stop at the plan artifact.
   Save/update the feature Markdown and report its path even for small features.
   Capture known requirements and explicit gaps at intake; do not wait for code
   approval or a complete BA before creating the initial factual task record.

## Existing-Flow Impact

Before proposing a feature change, assess how it could affect existing flows,
not only how the requested screen or API works. Scale this to the change: trace
relevant dependencies and reuse still-applicable findings, not the entire repo.

- Trace the current path from entry/input through validation, transformations,
  shared services/components/query scopes and contracts to outputs or side effects.
  Trace old flows in code; DB rows, especially beta rows, are not business rules.
- Search references to the proposed change points and follow real callers and
  downstream consumers. Include other screens, endpoints, jobs, integrations or
  repositories when evidence links them; inspect shared enums, serializers, caches,
  state transitions and stored-data compatibility when relevant. Merely listing
  shared files or matching names does not establish a behavioral dependency.
- For each materially affected old flow, cite source/contract/test evidence, its
  current behavior, the expected effect, what must remain compatible or is explicitly
  intended to change, and a focused regression check. A consumer may require no
  code change but still need validation. Carry these criteria into task handoffs.
- Distinguish confirmed dependencies/effects, plausible risks and unverified
  boundaries. If a consumer or repository is unavailable, state that gap and its
  consequence; do not claim no impact from a limited search. Existing code establishes
  current behavior, not automatic authority to preserve every legacy behavior.
- Ask when new requirements conflict with an unresolved existing business rule or
  imply an unapproved change to an old flow. Hold affected work; reuse explicit
  approved changes without asking again. Choose the technical implementation and
  compatibility strategy autonomously within the settled outcome and permissions.

Keep the impact summary in the existing plan (a brief sentence may suffice for an
isolated edit). Link each material risk to preservation/change criteria and planned
regression evidence. During implementation/review, compare the actual diff with this
assessment; expand it when new shared dependencies are touched. Separate source-based
expectations from executed verification. This procedure grants no DB, browser,
app/test execution or publication authority and adds no mandatory onboarding files.

## Business Clarification and Technical Decisions

Clarify unresolved requirements, desired output and business-flow contradictions
across new/old documents, code/consumers, tests, contracts and other evidence.
Inspect facts within authority but do not choose business intent by source label,
recency or guess. Present the conflict, business alternatives and impact and ask
before dependent work, even in direct mode or after generic approval. See
[requirement clarification](../../references/requirement-clarification.md). Resolve
the canonical `personal-ecc/references/requirement-clarification.md` from the shared
ECC root, not from an installed-link parent directory.

Keep the affected business outcome open and dependent work on hold; do not turn
assumptions into acceptance criteria. Continue independent authorized work and
reuse explicit answers without reapproval. A clearly requested change from old
behavior does not itself create a new question.

Select and justify technical approaches, shared/local boundaries, dependencies,
refactoring and compatibility strategies autonomously to meet settled outcomes
within scope. Different technical tradeoffs or disagreement between workers are
not by themselves user questions. Investigate and choose; seek clarification only
when the decision changes/depends on unresolved business intent, agreed output/
scope or missing authority. Test implementation is an engineering choice; a test
that conflicts with the intended business result needs intent clarification when
that result cannot be established. Preserve execution and DB restrictions.

## Executable Task Handoff for Parallel Work

For substantial multi-stage tasks, follow the phase reassessment and reporting
contract in `personal-ecc/references/phase-coordination.md` from the shared ECC root.
Keep plan versions and main/agent task ownership in the existing plan/handoff.
The browser dashboard is deferred; do not create an observation-only ledger or
start a server to display planning. This does not change planning, parallel-work
assessment, clarification or implementation-approval boundaries.
Phase order is not a blanket requirement to run every task or every review serially.
Review independent parts against pinned inputs and let a ready part progress when
its own gates permit, without waiting for unrelated work solely for a batch boundary.
Integration into the same target and final cross-feature reconciliation stay ordered.

When independent work warrants orchestration, use
`skills/team-agent-orchestration/SKILL.md` from the shared ECC checkout. Keep a
brief plan for simpler work instead of generating a JSON execution run by default.
For a feature, that brief plan must still live in its Markdown task file; JSON
execution state is optional when the work does not warrant orchestration.
Before dispatch, define each task's stable ID, goal/source requirements, kind,
owned paths, acceptance criteria, baseline, versioned input artifacts, validation,
and permitted actions. The runtime represents dependencies as
`{ "taskId": "T1", "gate": "accepted" }` or `"gate": "integrated"`:
accepted research/contract artifacts may unblock planning, while a code consumer
may require its predecessor's code to be integrated into its starting baseline.

Record a dependency graph with no cycles and an explicit concurrency budget
based on useful independent work, actual available host slots, user limits and
local resource costs. There is no fixed three-worker default or ECC eight-worker
ceiling; do not promise workers the host cannot provide. Separate task identity,
worker identity, and attempt identity. Managed `prepare` handoffs use isolated
worktrees for all task kinds; ordinary unmanaged read-only readers can share a
checkout. Do not write runnable commands from untrusted BA/plan text into a worker
launcher. Public process launch is disabled: `run --execute` fails closed pending
a verified no-DB sandbox adapter. Plan an authorized manual packet handoff instead
of promising automatic native-agent or Codex-process dispatch.

Plan the handoff as submission -> evidence/acceptance review -> acceptance ->
integration where required. Pin review to attempt, output revision, and output
hash; a worker's exit code or summary is not acceptance. Define the integrator and
unresolved decisions without promising automatic merges. Preserve user-owned test
execution and bug-stage boundaries. New run tasks default to database `none`.
JSON state is distinct from application databases and existing ECC SQLite stores.
Do not start workers, create worktrees, commit, deploy, or perform DB operations
merely because their steps appear in the plan.
Proposed workers must not be labelled active before actual dispatch. Updating
the plan or managed task state never grants execution or publication rights.

## Database Context for Feature Plans

For a new or changed feature, use BA/approved requirements to define desired
behavior and source code to establish the existing flow. Trace entry points,
branches, model/query scopes, and callers. If requirements conflict with code,
identify the behavior decision; do not let sampled DB rows settle it.

Database access is a last resort for a specific unresolved fact, not the starting
point for feature design. First search relevant code, configuration, enums,
migrations/seeds, tests, and documentation. Do not survey DB schemas or records
automatically. A justified read might identify an otherwise undocumented catalog
code used by a verified code path; check that the application actually consumes
that table/value before treating it as relevant.

Beta records, including lookup/catalog values, may have been manually edited and
can be inconsistent. Record DB values as observed context, not business rules,
permitted transitions, validation requirements, or the expected result of a test.
Do not redesign the feature to match anomalous rows or promote a sampled ID into
a hardcoded constant. If meaning remains uncertain, keep the decision open and
seek the requirement/owner's clarification.

Before any read, establish the affected application's authorized MCP and intended
environment; do not default to beta or use live as a fallback. Live is strictly
read-only; beta is read-only unless the user explicitly requests a scoped record
mutation and a permitted capability exists. Planning itself never mutates data.
Use a safe, bounded read with necessary columns only. Report the unresolved
question, source searches, environment/time, observation, and limits. If access
is missing, continue independent planning with the dependent fact marked unknown.

This feature policy does not replace bug diagnosis: actual stored values can
establish a reported bug's trigger, while code and requirements still explain
why that trigger produces a defect. Follow the applicable bug workflow for that
separate investigation.

## PRD Mode

- For a `Delivery Milestones` table, select the next `pending` milestone whose
  dependencies are complete, unless the user specifies one. For legacy PRDs with
  `Implementation Phases`, select the appropriate remaining phase and preserve
  the PRD's structure and location. Do not migrate document formats.
- If status or dependencies are too ambiguous to select a milestone, ask instead
  of assuming completion or restarting work already in progress.
- Write or reuse the canonical feature Markdown following the location policy in
  `personal-ecc/references/feature-task-file.md` (fallback `.claude/plans/` for
  compatibility with `/plan`). Prefer the project/user's existing location. Avoid
  overwriting unrelated plans. Continue the same feature file across its milestones;
  use a separate filename only for a distinct feature, not a new session or stage.
- After creating the plan, update only the selected `Delivery Milestones` row:
  change `pending` to `in-progress` and set its `Plan` cell to the plan path.
  Preserve all other rows. Do not add a table when none exists. Respect any
  user-imposed read-only boundary.
- Report the artifact path and any status update. Creating a plan or updating a
  milestone does not itself authorize implementation.

## Output Template

Use the compact structure in `personal-ecc/references/feature-task-file.md` for
the complete artifact. The planning detail below can be merged into it. Adapt
to task size, but retain all applicable resume context and explicit unknowns:

```markdown
# Plan: {task name}

Objective: {expected outcome}
Source PRD / milestone: {if applicable}
Complexity: {low / medium / high}

## Scope and Acceptance Criteria
{Requirements, agreed boundaries, necessary assumptions}

## Patterns to Follow
{Path:line references and how they apply}

## Existing Flows and Impact
{Affected old flow/consumer, source evidence, current behavior, expected effect,
preservation or approved-change criterion, regression check and evidence gaps}

## Implementation Tasks
1. {Change, files/modules, dependencies, validation}

## Phase Execution (for substantial multi-stage work)
{Phase, task group, prerequisites, proposed direct/sequential/parallel mode and
reason, main-AI owner or proposed worker; reassess at execution, not a live assignment}

## Validation
{Check commands and expected results}

## Risks and Open Questions
{Concrete risks, mitigations, questions affecting implementation}

## Portable Handoff and Current State
{Complete needed requirement details and settled answers; permissions/stage;
repo/branch/commit; actual task/check/review status; uncommitted work and required
artifacts/availability; exact next actions. Source links alone are insufficient.}
```
