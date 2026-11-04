# Personal ECC Workflow

This file is the version-controlled source of personal Codex behavior. The global
bootstrap identifies this checkout's root and reads this file in every session.
Treat these instructions as personal defaults; explicit user requests and
applicable project instructions take precedence.

## Communication

- Communicate with the user in Vietnamese.
- Write ECC skills, rules, documentation, comments, and configuration in English,
  unless the user requests otherwise.

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

When asked to produce an implementation plan, read and follow
`personal-ecc/skills/ecc-plan/SKILL.md` from the same checkout. Respect implementation already
authorized by the user. Do not activate planning-only approval gates for ordinary
work that the user has already authorized.
