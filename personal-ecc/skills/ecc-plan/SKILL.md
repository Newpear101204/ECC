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

## Inputs

- **Free-form requirements:** use the request and conversation context; return an inline plan.
- **Ordinary Markdown file:** read it as reference material; return an inline plan.
- **`*.prd.md` file:** read the PRD and follow PRD mode below.
- **No requirements:** use prior context; if the objective remains unknown, ask
  one concise question to identify it.

If a path is missing, report it and ask for the correct path when no corresponding
workspace file can be found. Never claim to have read an unavailable file.

## Planning Workflow

1. Restate the objective, expected behavior, and acceptance criteria. Preserve the
   user's scope boundaries. Label assumptions and open questions; ask immediately
   only about gaps that materially affect the approach or scope.
2. Read project instructions and locate relevant code with `rg` or an equivalent
   tool. Find applicable naming, error handling, logging, data access, and test
   patterns. Cite paths and line numbers for examples to follow. State when no
   comparable code exists or repository access is unavailable; do not invent files,
   APIs, dependencies, or validation results.
3. Break work into dependency-ordered tasks. For each, identify the concrete
   change, expected files/modules, existing patterns to follow, and completion
   checks. Distinguish verified files from proposed new paths.
4. Identify dependencies, material risks, mitigations, and low/medium/high
   complexity. Avoid precise time estimates without supporting evidence.
5. Select validation appropriate to the change and project rules. Include behavior
   tests for code changes; when TDD is required, plan a failing test before
   implementation. Use verified repository commands or label commands that need
   confirmation. Planned validation is not evidence that tests have run.
6. Present enough detail to begin work, proportional to task size. If approval is
   still required before implementation, state that the next step is approval or
   revision and stop at the plan artifact.

## Executable Task Handoff for Parallel Work

When independent work warrants orchestration, use
`skills/team-agent-orchestration/SKILL.md` from the shared ECC checkout. Keep an
ordinary inline plan for simpler work instead of generating a run file by default.
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
- Write `.claude/plans/{kebab-case-name}.plan.md` for compatibility with `/plan`.
  Prefer a different plan directory when specified by the project or user. Avoid
  overwriting unrelated plans; update the intended plan or use a milestone-specific
  filename.
- After creating the plan, update only the selected `Delivery Milestones` row:
  change `pending` to `in-progress` and set its `Plan` cell to the plan path.
  Preserve all other rows. Do not add a table when none exists. Respect any
  user-imposed read-only boundary.
- Report the artifact path and any status update. Creating a plan or updating a
  milestone does not itself authorize implementation.

## Output Template

Adapt to task size; omit empty sections:

```markdown
# Plan: {task name}

Objective: {expected outcome}
Source PRD / milestone: {if applicable}
Complexity: {low / medium / high}

## Scope and Acceptance Criteria
{Requirements, agreed boundaries, necessary assumptions}

## Patterns to Follow
{Path:line references and how they apply}

## Implementation Tasks
1. {Change, files/modules, dependencies, validation}

## Validation
{Check commands and expected results}

## Risks and Open Questions
{Concrete risks, mitigations, questions affecting implementation}
```
