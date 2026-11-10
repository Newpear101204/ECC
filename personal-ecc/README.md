# Personal ECC Workflow

This folder owns this fork's personal workflow. Keep personal changes here so
upstream's skill catalog, install manifests, package scripts, and instructions
remain unchanged. The shared base rules are read from the checkout's `rules/`.

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

The profile selects `ecc-plan`, `ecc-project-rules`, `bug-intake`,
`bug-diagnose`, `bug-plan`, `bug-fix`, and `bug-review`. Skill names
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
It introduces no replacement skill names, profile entries, or installer changes.
See [feature evaluation scenarios](tests/feature-data-context.scenarios.md) for
isolated cases; they are a specification, not proof of executed checks.

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
