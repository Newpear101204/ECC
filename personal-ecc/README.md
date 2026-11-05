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
