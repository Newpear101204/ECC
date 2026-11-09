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

## Bug Database Evidence and Permissions

For each bug, carry the user's environment across intake, diagnosis, planning,
fixing, feedback, and review. First establish that the affected application/project
uses the user's `mysql_live` / `mysql_beta` connection pair, using explicit user
context or nonsecret project connection evidence. Within that application, route
live/production to `mysql_live` and beta to `mysql_beta`. These names do not select
databases for unrelated projects. Resolve an unknown application-to-MCP mapping
before querying. Use the conversation's explicit mapping for other environments;
do not assume every staging/test environment is this beta database. If the target
is missing or conflicting, clarify before querying while continuing useful source
inspection. Re-establish the target for a different bug or an environment change.
Never switch databases because the selected connection fails or is unavailable.
Discover the tools actually callable in the session; configuration alone does not
prove access. Do not read credentials to bypass missing tools or permissions.

Live is strictly read-only, including when a requested action would write through
an API, script, procedure, or another connection. Beta is read-only by default;
creating, updating, or deleting records requires the user's proactive explicit
request for that operation and a clear target and change. "Fix the bug", test
execution permission, and plan approval are not requests to mutate beta data.
Authorization cannot grant an unavailable capability or override a read-only tool;
report that limitation instead of finding a bypass. These permissions do not grant
schema changes, migrations, or administrative operations. Skill instructions do
not enforce database grants; those remain external configuration.

During diagnosis, planning, fixing, or review, bounded read-only MCP inspection is
allowed within the established bug scope without separate application/test-running
permission. When a reachable branch depends on unknown stored values, inspect the
matching data if the correct MCP is available and access is authorized. Do not stop
at a plausible code explanation. DB-independent bugs need no database query.
Read `personal-ecc/skills/bug-diagnose/references/database-evidence.md` before DB
inspection or handling a request to mutate beta records. Intake only records the
environment, identifiers, and supplied evidence; it does not start DB investigation.

Explain the causal chain with source locations, actual inputs and transformations,
relevant stored values, the failing operation, and the expected-behavior basis.
Keep missing evidence explicit. Reading DB data and tracing branches is not running
the API, reproducing the incident, or verifying a patch. Preserve the user's
ownership of application/test execution and each stage's stopping boundary.

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
