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

Work inline. Delegate only when requested by the user or required by applicable
project instructions; do not depend on runtime-specific agent names or tools.

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
