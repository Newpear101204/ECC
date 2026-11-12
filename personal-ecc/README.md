# Personal ECC Workflow

This folder owns this fork's personal workflow. Keep personal changes here by
default; explicitly approved direct changes to existing upstream skills/runtime
remain separate, visible merge-maintenance obligations. The shared base rules
are read from the checkout's `rules/`.

## Install on a New Machine

Clone this fork, check out the `personal` branch, and run from the ECC root:

```sh
node personal-ecc/setup.js
```

Node.js 18 or newer and Codex are required; this setup uses only Node built-ins
and does not need `npm install`. Start a new Codex session after setup.

The installer derives the checkout location on each machine. It adds a managed
bootstrap to `CODEX_HOME/AGENTS.md` (default `~/.codex/AGENTS.md`) and links the
selected skills under `~/.agents/skills`. Windows uses directory junctions;
other platforms use directory symlinks. Keep this checkout available and readable.

Preview or explicitly back up and replace old skill copies/links:

```sh
node personal-ecc/setup.js --dry-run
node personal-ecc/setup.js --replace-existing
```

Global instructions outside the managed `ECC PROJECT RULES` block remain intact.
Changed global instructions and replaced skill entries are backed up under
`CODEX_HOME/ecc-personal-backups/setup-*`. Old copies of the selected skills under
`CODEX_HOME/skills` are backed up and retired to avoid stale duplicates. An existing
global `AGENTS.override.md` blocks setup until its precedence is resolved.

## Customize

Follow the [personal skill authoring policy](instructions.md#authoring-personal-ecc-skills)
when adding workflows. It keeps canonical sources and registration inside this
overlay instead of modifying upstream catalogs or package/install configuration.

| Source | Purpose | Setup required after editing? |
|---|---|---|
| `personal-ecc/instructions.md` | Personal behavior and automatic workflow routing | No; open a new session |
| `personal-ecc/skills/<name>/` | Personal skill instructions and resources | No for already linked skills |
| `personal-ecc/profile.json` | Skill names to expose globally | Yes when adding skills |
| `personal-ecc/rules/` (optional) | Personal rule overrides using the upstream directory layout | No; open a new session |
| Upstream `rules/` | Shared base rules updated from upstream | No; open a new session |

The profile selects `ecc-work`, `ecc-view`, `ecc-plan`, `ecc-project-rules`,
`bug-intake`, `bug-diagnose`, `bug-plan`, `bug-fix`, and `bug-review`. Skill names
resolve under `personal-ecc/skills/`. Removing a name from the profile does not
delete an existing installed link; retire that link explicitly if needed.

Use `$bug-intake` with a tester report to normalize the available evidence,
identify blocking gaps, and propose impact/severity for review. It stops at
intake. Use `$bug-diagnose` next, with the intake or a sufficiently detailed report,
to trace the failure, test hypotheses within scope, and report the causal evidence.
Reproduction is an optional technique inside diagnosis, not a separate stage.
Diagnosis stops before fix planning or implementation. Use `$bug-plan` with a
diagnosis to choose the correction boundary, inspect effects on existing and
related features, and define regression checks. Planning stops before code changes.
Each stage is independently invoked; no stage advances automatically. Run setup
again on each machine after pulling a profile that adds a skill.

For a defect in a shared function, `$bug-plan` lists the known call sites and
feature-level effects, compares a direct shared correction with any viable local
compatibility option, and records your choice. Preserving other features means
preserving intended valid behavior. It does not require freezing the same defect
in every caller. `$bug-fix` follows your selected boundary; it does not silently
replace an approved shared correction with a feature-specific flag or wrapper.

After authorizing the plan, use `$bug-fix` to implement it. The AI gives you the
changes, expected results, and manual steps/commands to run. You run the application
and checks yourself by default; report errors to continue the same scoped fix.
The AI may author regression tests but does not run tests/builds unless you ask.
When you confirm the latest patch and request `$bug-review`, it inspects the diff,
related-feature contracts, and your results without editing or executing checks
by default. Review findings return to fixing only when requested; subsequent code
changes need user testing again. There is no `bug-verify` skill or stage.

Commit and push personal changes to this fork. On other machines, pull the
`personal` branch and open a new Codex session to read current instructions,
rules, and linked skills. Rerun setup when adding skills, moving the checkout,
or updating the setup/bootstrap mechanism; use `--replace-existing` to rebind
old links. Setup does not fetch changes automatically.

## Database Evidence in Bug Workflows

For the application confirmed to use your configured live/beta connection pair,
say "bug live" / "bug production" to select `mysql_live`, or "bug beta" to select
`mysql_beta`. Other projects need their own application-to-MCP mapping; the labels
live/beta alone do not authorize querying these connections for any project.
The environment carries across stages and feedback for that bug;
a new bug or a changed environment needs its own target. Missing/conflicting
targets are clarified before querying. An unavailable connection is reported,
never replaced with the other environment. MCP configuration is machine-local;
a configured server is usable only when its tools are available in the session.

Live is strictly read-only through every access path. Beta is also read-only by
default: record creation, updates, or deletion require your proactive explicit
request identifying the operation and target. "Fix this beta bug" or approving a
plan is not a data-mutation request. Schema/admin changes are not included. Tool
and DB permissions still apply; the AI does not bypass a read-only tool by using
credentials, scripts, or APIs. These instructions do not change database grants.

Intake records the environment and identifiers without querying. Diagnosis,
planning, fixing, and review can perform bounded read-only MCP inspection when
stored values matter, independently of application/test execution permission.
The AI traces payload transformations, model/query scopes, and the relevant rows,
then explains the code-and-data causal chain with source locations and limitations.
DB-independent bugs do not require database access. Reading rows and following
branches is not running the API or verifying a patch; you still run checks by
default. No data is created merely to make a branch executable.

See the [shared database evidence guide](skills/bug-diagnose/references/database-evidence.md)
for the procedure and [behavioral scenarios](tests/bug-data-evidence.scenarios.md)
for isolated evaluation cases. The scenarios are an evaluation specification,
not a claim that live behavior or production permissions have been tested.

## Database Context in Feature Work

For features, approved BA requirements define desired behavior and source code
defines the current flow. Beta records may have been edited manually; do not use
them to infer business rules, redesign code, or set expected test assertions.
Search relevant source/config/enums/migrations/seeds/tests/docs first. DB reads
are last-resort context for a specific missing fact, such as an undocumented
catalog code actually consumed by the application. Even catalog rows need scrutiny.
Verification may also correlate a precise DB observation with an authorized run;
a row already in the desired state does not prove that run happened or passed.
The existing live/beta access boundaries remain unchanged.

These rules live directly in personal `ecc-plan` and the existing upstream
`skills/tdd-workflow/SKILL.md` and `skills/verification-loop/SKILL.md`. Their existing
`.agents/skills/` projections contain the same added sections for Codex discovery.
This explicitly authorized upstream customization may need manual merging after
an upstream pull; review these sections for semantic drift as well as conflicts.
Those feature-data adjustments introduce no replacement skill names, profile
entries, or installer changes; the workflow shortcuts below are a separate addition.
See [feature evaluation scenarios](tests/feature-data-context.scenarios.md) for
isolated cases; they are a specification, not proof of executed checks.

## Right-Sized Parallel Work

Start with `$ecc-work` and a task or BA reference; use `$ecc-view` to inspect the
current task/run. The user can choose auto, direct/no-agent, or team work for the
task. "Approved, implement it" continues the agreed plan without repeating its
permissions or database rules. Publication and execution remain within the scope
already granted. These are skills, not a newly installed universal `/view` command.

Vietnamese operator documents: [implementation report](ORCHESTRATION-REPORT.vi.md)
and [new-feature walkthrough](FEATURE-WORKFLOW-GUIDE.vi.md). The walkthrough starts
with short user actions; PowerShell commands are an optional technical appendix
normally carried out by the AI coordinator, not a prerequisite for using Codex.

Questions and clear small edits are handled directly without a task board or
worktree. Dependent work can use one agent and a short plan. Substantial independent
work uses `team-agent-orchestration` with explicit ownership, dependency gates,
versioned inputs, and a concurrency budget chosen from independent tasks, available
host slots, and resource costs. There is no fixed three-worker policy or ECC-only
eight-worker ceiling. A positive safe-integer budget does not grant extra host
slots; queue work if the environment cannot provide the desired concurrency.

Unmanaged read-only explorers may read one checkout. Managed `prepare` handoffs
use per-task worktrees for all task kinds from a verified baseline. The main
agent owns collection, evidence evaluation, and
serialized integration. A native subagent is not automatically an isolated
worktree or a durable scheduler. Task, worker, and attempt are distinct identities.
Worker completion submits a result; acceptance binds the criteria and evidence to
its attempt, revision, and output hash. Required code integration is a later gate.
Independent review is initially a recorded decision, not a promise that another
reviewer agent starts automatically. Changed outputs need fresh review.

The runtime uses an explicitly selected JSON run file. It does not open or migrate
the existing ECC SQLite stores. New tasks require `permissions.database: "none"`:
no DB queries, writes, seeds, migrations, or database-writing API replays are
authorized by orchestration. Existing general feature/bug database guidance does
not override this narrower task contract. The general live/beta read policy still
applies to eligible main-agent evidence work outside managed workers when the task
allows it; a task-specific no-DB ban overrides that too. Test commands,
commit/push/deploy, and personal bug-stage transitions retain their own authority.

For a small safe walkthrough, save an input plan outside tracked source, replacing
`repoRoot` with the intended project and reviewing its baseline:

```json
{
  "schemaVersion": 1,
  "id": "source-survey",
  "repoRoot": "/absolute/path/to/project",
  "baseRef": "HEAD",
  "approved": false,
  "maxWorkers": 1,
  "tasks": [{
    "id": "T1",
    "title": "Map the existing summary flow",
    "kind": "explore",
    "scope": ["src"],
    "dependsOn": [],
    "inputs": ["approved-feature-spec#summary"],
    "acceptance": ["Report the entry points and callers with source references"],
    "validation": [],
    "permissions": { "database": "none", "executeTests": false }
  }]
}
```

The following commands run from the ECC checkout. They create/read only the chosen
run file or expose its read-only local view; they do not start workers:

```sh
node scripts/orchestrate.js init /path/to/plan.json --state /path/to/run.json
node scripts/orchestrate.js status --state /path/to/run.json
node scripts/orchestrate.js run --state /path/to/run.json
node scripts/control-pane.js --orchestration /path/to/run.json --no-open
```

Only after execution scope is admitted, use `approve --state <run.json>
--by <owner> --evidence <text>` to record who admitted it and why.
`run` is preview-only. Public `run --execute` always fails closed pending a
verified no-DB filesystem/network sandbox adapter; arbitrary wrappers cannot
bypass that restriction. No real Codex process is automatically launched.
The execution library is limited to explicit Node-test fake-worker harnesses,
not a production launch entry point.

The usable manual handoff bridge prepares a task without starting a process:

```sh
node scripts/orchestrate.js prepare --state /path/to/run.json --task T1 --worker explorer-1 --worktree-root /absolute/path/outside/project
node scripts/orchestrate.js submit --state /path/to/run.json --task T1 --attempt T1-1 --result /path/to/result.json
```

Between those commands, the AI coordinator assigns the generated task packet and
worktree to an authorized agent and collects its result. Manual/native agents
remain in their ordinary permission context; the packet is not an OS sandbox.
Preflight conservatively rejects tracked `.env.*` files (even example/sample
files), database-named files, and symlinks. Report a refusal instead of bypassing it.
The result identifies the packet's `runId`, `taskId`, and `attemptId`, for example:

```json
{
  "runId": "source-survey",
  "taskId": "T1",
  "attemptId": "T1-1",
  "summary": "Mapped entry points and callers with source references",
  "checks": [],
  "artifacts": []
}
```

Use the actual identities and required result fields from the packet. Submission
independently fingerprints the worktree and changed paths; it is not acceptance.
Artifact entries are references, not implicit file-write authorization. A read-only
explorer supplies its findings in the result summary or an approved external
artifact; it must not create `handoff.md` or another file inside its worktree.
Use `dispatch --state <run.json> --command <JSON>` for permitted lifecycle/evidence
transitions; command JSON uses `action`, for example `{ "action": "pause" }` or
`{ "action": "resume" }`. An explicit retry also identifies `taskId` and `reason`.
`serve --state <run.json> --port <port>` opens the same read-only view. No real
worker is needed to validate the state model with synthetic fixtures.

Code integration is recorded separately with `integrate --state <run.json>
--task <id> --commit <commit> --by <integrator> --evidence <text>`. That commit
must already contain the accepted changes from an authorized integration action;
the command does not itself create a commit or merge branches. The runtime does
not automatically attach native subagents or launch a reviewer agent.

The preview/manual bridge is not a production automatic dispatcher or background
daemon. The AI coordinator prepares ready work within the concurrency limit;
automatic slot refill is verified only with the fake-worker test harness.
Persisted state survives interruption, but uncertain running
attempts need explicit reconciliation rather than automatic replay. Preserve
attempt history and worktrees; do not erase evidence to recover. The task view
shows recorded status, dependencies, activity, output, and review evidence, not
invented completion percentages. It does not automatically discover every native
subagent or every plugin-cache session. The existing database-backed control pane
is unchanged when `--orchestration` is absent; do not launch that mode as part of a
no-database task.

## Update from Upstream

With a clean working tree on `personal`:

```sh
git fetch upstream
git merge upstream/main
node --test personal-ecc/tests/setup.test.js
git push origin personal
```

Resolve and inspect any upstream conflicts before pushing. Keeping customizations
under this unique folder reduces conflicts; it cannot guarantee upstream will
never introduce a file of the same name or incompatible behavior.

## Verify or Use Isolated Destinations

```sh
node --test personal-ecc/tests/setup.test.js
node personal-ecc/setup.js --codex-home /path/to/codex-home --skills-dir /path/to/user-skills
```

This setup ports personal instructions, selected skills, and rule selection. It
does not provision MCP servers, external tools, hook settings, or credentials.
Those remain machine-specific. Existing personal Telegram guidance is preserved;
the installer does not send messages or alter notification hooks.
