---
name: ecc-project-rules
description: Detect a project's languages and frameworks and load the matching shared ECC coding rules before planning, editing, or reviewing code. Use when starting work in a repository or moving to a different package or technology stack.
metadata:
  origin: ECC
---

# ECC Project Rules

Select rules from a shared ECC checkout without adding instruction files to the
project. Perform read-only discovery; do not install packages or execute project
scripts to identify the stack.

## Locate the Shared Rules

Resolve the rules directory in this order:

1. An explicit rules location supplied by the user or `ECC_RULES_ROOT` environment
   variable. Treat the value as a path, never as executable shell text.
2. `references/rules-source.txt` beside this skill, if present. This optional,
   machine-local installation file contains one absolute path to the shared rules.
3. `../../../rules` relative to the real skill directory in this fork's
   `personal-ecc/skills/` layout. When the installed skill is a symlink or Windows
   junction, resolve its target first.

Verify the directory contains `common/`. If the configured location is unavailable
or permissions prevent reading it, report that limitation; do not claim rules were
loaded or silently substitute a different checkout. Request access only through
the runtime's normal permission mechanism. Do not copy rules into the target repo.

## Detect the Relevant Stack

Read applicable project instructions first. Inspect manifests, configuration,
representative source files, and the package containing the requested change.
Use `rg --files` with narrow searches; exclude dependencies, generated output,
vendor directories, and lockfile contents. Never read secrets to detect a stack.

| Evidence in the affected package | Rule directories |
|---|---|
| `tsconfig*.json`, `.ts`/`.tsx` source, or JavaScript source | `typescript` |
| React dependency plus React source or JSX usage | `typescript`, `react` |
| React Native dependency or Expo configuration | `typescript`, `react`, `react-native` |
| Angular dependencies/configuration | `typescript`, `angular` |
| Vue dependency and `.vue` source | `vue`; also `typescript` for JS/TS code |
| Nuxt dependency or `nuxt.config.*` | `vue`, `nuxt`; also `typescript` for JS/TS code |
| HTML/CSS/browser UI work | `web`, plus relevant language/framework rules |
| `pyproject.toml`, `setup.py`, requirements files, or `.py` source | `python` |
| `go.mod` or `.go` source | `golang` |
| `Cargo.toml` or `.rs` source | `rust` |
| Java/Kotlin source and Maven/Gradle configuration | `java` and/or `kotlin`, matching source |
| `.csproj`/`.cs`, `.fsproj`/`.fs` | `csharp` and/or `fsharp`, matching source |
| C/C++ source, headers, CMake or equivalent build files | `cpp` |
| `Package.swift`, Swift source, or Swift Xcode targets | `swift` |
| `pubspec.yaml` or `.dart` source | `dart` |
| `composer.json` or PHP source | `php` |
| `Gemfile` or Ruby source | `ruby` |
| Perl source or Perl package manifests | `perl` |
| HarmonyOS configuration and ArkTS source | `arkts` |

Use multiple signals where possible. A development dependency, example, or build
helper alone does not establish the application's stack. A Python application
with JavaScript tooling needs Python rules for Python changes and TypeScript/JS
rules when changing the JavaScript tooling; neither replaces the other.

For monorepos, inspect the affected package and its relevant ancestors instead
of assigning the root package's stack to every directory. If a language has no
ECC rules directory, state that and use applicable common and project conventions.

## Load and Apply

- Read `common/coding-style.md`, `common/security.md`, and `common/testing.md`
  before substantive code planning, editing, or review. Load other common rule
  files when their subject applies, such as Git workflow before committing.
- Read the selected language/framework `coding-style.md`, `security.md`, and
  `testing.md` where present, plus other files relevant to the task. Inspect
  `paths` frontmatter and linked rule dependencies; framework presence alone
  does not make every framework rule apply to every file.
- Treat shared ECC rules as personal defaults. Explicit user instructions and
  applicable project instructions take precedence. Within ECC defaults, specific
  language/framework guidance overrides common guidance for the same subject.
  Preserve established project tooling and style unless a change is requested.
- If the shared checkout contains `personal-ecc/rules/`, load its applicable
  common and selected language/framework files after the upstream rules, using
  the same task and file scope. These personal overrides take precedence over
  upstream defaults, while user and project instructions still take precedence.
  Keep personal rule edits in this overlay instead of editing upstream `rules/`.
- Do not treat rule references to hooks, agents, tools, or external actions as
  evidence those capabilities exist or permission to install or execute them.
- Briefly report the detected stack and rule directories in the first substantive
  progress update. Report uncertainty when evidence is inconclusive.
- Reuse loaded rules within the session. Recheck when the workspace, affected
  package, language, or relevant rule files change. Do not load every ruleset.

Reading Markdown instructions does not install a linter or enforce compliance
mechanically. Run the project's appropriate existing checks after code changes.
