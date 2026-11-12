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

## Right-Sized Task Orchestration

`$ecc-work` is the short personal entry point for starting or continuing development;
read `personal-ecc/skills/ecc-work/SKILL.md` when it applies. A long bootstrap prompt
is not required for each task. Natural requests to show progress route to
`personal-ecc/skills/ecc-view/SKILL.md` (`$ecc-view`); no universal `/view` command
is installed. Both are user-facing skills, not automatic background services.

Default to adaptive selection. Honor per-task direct/no-agents, team/parallel,
plan-only, and concurrency preferences until the user changes them. Plain approval
of the identified plan authorizes its implementation within existing permissions;
do not demand repeated DB reminders or a long restatement. Internal run files,
packets, CLI operations and worker collection belong to the main AI, not the user.

### Main-AI Supervision Required

The user works directly with the main AI. All task execution and worker dispatch
must remain under its active coordination. Do not enable or propose a detached
scheduler/daemon that continues development after the main session stops, even
if a sandbox adapter becomes available. Changing this preference requires the
user's explicit request. Parallel workers are allowed under main-AI supervision.
Before a controlled stop/handoff, stop dispatch, request active workers to stop,
verify their state where possible, and preserve results. An abrupt disconnect
does not prove workers stopped: record uncertainty and reconcile before resuming;
do not claim automatic process termination that the host cannot guarantee.
A passive read-only dashboard may remain visible; it must never dispatch work.

Choose the lightest sufficient execution mode before creating orchestration state:
answer questions and make clear small edits inline; use a brief sequential plan
when steps are dependent; delegate only substantial independent work. File count
alone is not the decision. Risk may require stronger verification without more
agents. Honor explicit "no agents", "plan only", and concurrency preferences.

For eligible parallel work, read `skills/team-agent-orchestration/SKILL.md` and
use the explicit JSON-run runtime in `scripts/orchestrate.js`. Shape task IDs,
dependency gates, source/acceptance references, input versions, ownership, allowed
actions, and expected outputs before dispatch. Choose an explicit concurrency
budget from useful independent tasks, actual free host slots, user preferences,
and CPU/RAM/I/O costs of local commands. There is no fixed three-worker default or
ECC eight-worker ceiling. Host/tool limits remain binding; queue and refill ready
work rather than claiming unavailable workers or violating dependencies.
Unmanaged read-only explorers may share a checkout. The managed `prepare` handoff
creates an isolated worktree/task packet for every task kind from a verified
baseline. Native subagents do not provide that isolation by merely being spawned;
the main agent assigns an authorized agent to the packet and owns collection and
serialized integration. Native agent permissions are not a separate OS sandbox.

The new runtime persists explicit JSON run files and does not open, initialize,
migrate, or mutate the existing ECC SQLite stores. Database access for orchestrated
tasks is constrained to `none` by the current managed-worker contract. Do not query
MCP databases, run seeds/migrations, or replay database-writing APIs in those
workers. This implementation limit is not a blanket ban on all future main-agent
DB evidence gathering. Outside managed workers, the standing DB policy below
applies when the task permits it. A task-specific ban on all DB interaction takes
precedence everywhere; do not move a forbidden action to the main agent to bypass it.
Keep application/test execution, commit, push, and deployment within separately
established authority. Public `run` is preview-only: `run --execute` fails closed
until a verified no-DB filesystem/network sandbox adapter exists. No real Codex
process or arbitrary wrapper is launched by this CLI. Scheduler execution is
restricted to explicit Node-test fake-worker harnesses, not a production entry.
Use manual `prepare`/`submit` handoffs for authorized agents in the meantime;
those agents must obey the no-DB contract in their normal permission context.
Neither handoff preparation nor a scheduling preview authorizes a later bug stage.

Agent process completion is only submission. Accept output against its acceptance
criteria and actual evidence, bound to task, attempt, revision, and output hash.
An independent reviewer identity may record that decision; automatic reviewer
agents are not implied. Distinguish accepted artifacts from integrated code when
unlocking dependencies. Revisions changed after review need fresh evaluation.
Report milestones, published tool activity, blockers, and evidence rather than
invented progress percentages or private reasoning. Preserve state on interruption;
do not replay completed or uncertain work on resume. Pausing/cancellation and
explicit retry/reconciliation must preserve prior attempts and user-stage stops.

## Database Access and Bug Evidence

For each task, carry the user's environment across its stages and feedback.
First establish that the affected application/project
uses the user's `mysql_live` / `mysql_beta` connection pair, using explicit user
context or nonsecret project connection evidence. Within that application, route
live/production to `mysql_live` and beta to `mysql_beta`. These names do not select
databases for unrelated projects. Resolve an unknown application-to-MCP mapping
before querying. Use the conversation's explicit mapping for other environments;
do not assume every staging/test environment is this beta database. If the target
is missing or conflicting, clarify before querying while continuing useful source
inspection. Re-establish the target for a different task or an environment change.
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

During bug diagnosis, bug planning, fixing, or review, bounded read-only MCP inspection is
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

## Feature Data Context

For new or changed features, use approved BA requirements for desired behavior
and code for the existing flow. Beta rows may be manually edited and are not
business-rule or test-oracle authority. DB is last-resort context for a named gap
after relevant source/config/enum/migration/seed/test/documentation searches, or
a bounded observation tied to an authorized verification run. Do not apply the
bug workflow's proactive trigger queries as automatic feature-data exploration.
The feature-specific rules are maintained directly in `personal-ecc/skills/ecc-plan/SKILL.md`,
`skills/tdd-workflow/SKILL.md`, and `skills/verification-loop/SKILL.md`, with the
latter two also reflected in their existing `.agents/skills/` projections.
Common connection and data permissions above apply to both features and bugs.

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
