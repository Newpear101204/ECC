# Personal ECC Workflow

This file is the version-controlled source of personal Codex behavior. The global
bootstrap identifies this checkout's root and reads this file in every session.
Treat these instructions as personal defaults; explicit user requests and
applicable project instructions take precedence.

## Communication

- Communicate with the user in Vietnamese.
- Write ECC skills, rules, documentation, comments, and configuration in English,
  unless the user requests otherwise.

## Authoring Personal ECC Skills

Apply this policy when creating or modifying a personal skill or workflow for
this ECC fork, including requests made while working in another project. Resolve
paths against the shared ECC checkout identified by the global bootstrap, not
the current working directory. This policy does not relocate unrelated project
skills or contributions the user explicitly intends for upstream.

- Keep the canonical personal skill at `personal-ecc/skills/<skill-name>/SKILL.md`.
  Put its UI metadata at `agents/openai.yaml` within that skill folder; keep any
  necessary scripts, references, or assets with the skill. Use English for these files.
- Add a new skill name once to `personal-ecc/profile.json`, preserving existing
  entries. Keep workflow routing in `personal-ecc/instructions.md` and documentation/
  tests under `personal-ecc/`. Personal rule overrides belong in `personal-ecc/rules/`.
- For personal customizations, this folder is the canonical source. Do not add
  personal entries or copies to upstream `skills/`, `.agents/skills/`, `commands/`,
  rules, catalogs, install manifests, `package.json`, `.gitignore`, or project
  `AGENTS.md` files merely to register or expose the skill. Reuse upstream content
  read-only where useful instead of changing its distribution machinery.
- If a necessary implementation truly requires an upstream-owned edit, first
  explain the requirement, affected files, merge-maintenance cost, and available
  overlay alternative. Obtain explicit authorization if the existing request
  does not already cover that upstream change; do not silently expand scope.
- Check for existing skill names and destinations before replacing content.
  Preserve unrelated changes and machine-local configuration. Keep usernames,
  drive letters, credentials, and generated installation state out of tracked sources.
- Validate the skill metadata and selected profile, check the diff, and use
  `node personal-ecc/setup.js` to expose newly selected skills on the current
  machine. Respect runtime write permissions and existing installation conflicts.
  Other machines need the same setup command after pulling new profile entries;
  content changes to existing linked skills need only a pull and a new session.
- Before committing, verify that personal changes remain under `personal-ecc/`
  unless an upstream edit was explicitly authorized. Do not commit or push solely
  because a skill was created; follow the user's requested delivery scope.

## Automatic Project Rules

At the start of work in any project, before substantive code planning, editing,
or review, read `personal-ecc/skills/ecc-project-rules/SKILL.md` from the ECC checkout named by
the global bootstrap. Apply its stack detection and rule-selection procedure,
using that checkout's `rules/` as the shared rules directory.

Recheck when changing workspaces or affected packages. Do not wait for the user
to invoke a skill, create per-project instruction files, or copy rules into the
target project. If the checkout is unavailable or unreadable, state the limitation
instead of claiming the rules were loaded.

## Planning

When asked to produce a general implementation plan, read and follow
`personal-ecc/skills/ecc-plan/SKILL.md` from the same checkout. Respect implementation already
authorized by the user. Do not activate planning-only approval gates for ordinary
work that the user has already authorized.
For a bug-fix plan, use Controlled Bug Fix Planning below instead of duplicating
the general planning workflow.

## Controlled Bug Intake

When the user asks to intake or triage a tester's report before investigation,
read `personal-ecc/skills/bug-intake/SKILL.md` from this checkout. Return the intake
record and stop at that stage. A request for intake does not authorize reproduction,
diagnosis, code changes, or ticket mutations. Do not intercept a separately
authorized fix request and force it through an additional intake approval gate.

## Controlled Bug Diagnosis

When the user asks to diagnose a reported bug or determine its cause, read
`personal-ecc/skills/bug-diagnose/SKILL.md`. Diagnosis follows intake directly;
reproduction may be used within diagnosis when useful and authorized. Return
the evidence-based diagnosis and stop before fix planning or implementation.
Do not require a separate reproduction skill or a formal intake document when
the available report is sufficient. Respect separately authorized broader work.

## Controlled Bug Fix Planning

When asked to plan a diagnosed bug fix, read
`personal-ecc/skills/bug-plan/SKILL.md`. Trace effects on the affected feature,
shared components, and other consumers using source and contract evidence.
Include behavior-preservation criteria and risk-linked regression checks.
For defective shared code, list consumer locations and expected effects, recommend
the direct correction when supported by the shared contract, and present any viable
local compatibility option. Let the user select the boundary unless already
authorized; do not default to feature flags merely to freeze defective behavior.
Return the plan for review and stop before implementation. Preserve uncertainty
when the diagnosis or compatibility decisions remain unresolved. Do not add a
redundant approval gate to separately authorized broader work.

## User-Controlled Bug Fixing and Review

When asked to implement a scoped bug fix or correct a failed attempt, read
`personal-ecc/skills/bug-fix/SKILL.md`. The user runs the application and checks
by default. Honor the selected shared/local correction boundary; an approved
shared correction should fix the shared function rather than silently introduce
a feature-only workaround. Resolve a missing boundary decision before dependent
edits, and do not ask again for a boundary already explicitly authorized. Do not
automatically execute tests/builds or start formal review;
provide the changed scope, expected results, and steps for the user to run.
Write appropriate regression tests as planned, marking them unexecuted until
results are available. Respect explicitly delegated execution without inventing
RED/GREEN results. Iterate on the user's feedback within authorized scope.

After the user confirms the current patch and requests review, read
`personal-ecc/skills/bug-review/SKILL.md`. Review is read-only by default and must
distinguish the user's results from independent observations. If review is
explicitly requested before confirmation, label it preliminary and retain pending
validation. Later code changes require relevant user checks again. There is no
`bug-verify` stage. These user-controlled execution and transition preferences
override generic automatic testing/review defaults for this personal bug workflow.
Do not automatically commit, publish, close tickets, or advance between stages.
