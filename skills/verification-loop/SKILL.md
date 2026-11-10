---
name: verification-loop
description: Run a six-phase verification of a Claude Code session's work — build, type check, lint, tests with coverage, security grep, and diff review — then produce a PASS/FAIL verification report. Use when verifying work after completing a feature or refactor, before creating a PR, or when quality gates must pass.
license: MIT
metadata:
  origin: ECC
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

## Database Context for Feature Verification

Verify against BA/approved acceptance criteria and contracts, tracing code for the
implemented flow. Do not infer business rules or expected test results from beta
records: they may be old or manually edited, including lookup/catalog data. An
inconsistent row alone proves neither a feature defect nor that the code is wrong.
Keep a requirement/code conflict explicit rather than choosing the DB as authority.

For a missing definition, search relevant code, config, enums, migrations/seeds,
tests, and docs first. Only then use a targeted DB read as last-resort context for
that named gap, confirming that code consumes the value. Do not survey the DB or
require DB access when source and acceptance criteria already suffice.

A bounded observation may also check a precise precondition or postcondition of
an already authorized run. Derive its expected result from the contract before
reading, and correlate it with the tested revision, inputs/record scope, environment,
and run time. A pre-existing row, an unrelated state change, or a post-fix read
alone does not prove the patched flow ran or passed. Distinguish observed DB state
from runtime results and preserve NOT PERFORMED/unknown checks where appropriate.

Before access, establish the affected application's authorized MCP and environment;
never substitute live/beta for one another. Use safe reads with minimal fields and
scope. Live is strictly read-only. Shared beta writes, including fixture/reset or
API actions, require the user's explicit scoped mutation request and a supported
authorized capability; verification permission alone does not grant them. Inspect
test targets and side effects before running checks. Do not bypass read-only tools
or run migrations/cleanup to make a check pass. DB access does not grant app/test
execution permission. If access is missing, continue independent checks and report
the exact data-dependent limitation without inventing success or failure.

For reported bugs, retain the applicable bug workflow's hypothesis-driven reads
to establish actual triggers; observations still do not define intended behavior.

## Verification Phases

### Phase 1: Build Verification
```bash
set -o pipefail  # report the build's exit status, not tail's
# Check if project builds
npm run build 2>&1 | tail -20
# OR
pnpm build 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

### Phase 2: Type Check
```bash
set -o pipefail
# TypeScript projects
npx --no-install tsc --noEmit 2>&1 | sed -n '1,30p'

# Python projects
pyright . 2>&1 | sed -n '1,30p'
```

Report all type errors. Fix critical ones before continuing.

### Phase 3: Lint Check

Use `sed` to limit displayed output while consuming the whole stream. This keeps a
successful linter from failing on SIGPIPE when `pipefail` is enabled.
```bash
set -o pipefail
# JavaScript/TypeScript
npm run lint 2>&1 | sed -n '1,30p'

# Python
ruff check . 2>&1 | sed -n '1,30p'
```

### Phase 4: Test Suite
```bash
set -o pipefail
# Run tests with coverage
npm run test -- --coverage 2>&1 | tail -50

# Check coverage threshold
# Target: 80% minimum
```

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 5: Security Scan
```bash
# Check for secrets
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10

# Check for console.log
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
# Show what changed
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Target Acceptance

When the requested outcome requires deployment or target-environment verification,
report target acceptance separately from local checks. Record the environment and
installed version when known, the evidence, and the next permitted check or precise
access dependency. Passing local checks, review, merge, or release does not establish
target acceptance. Report VERIFIED or FAILED for an executed target check, with its evidence.
Do not access production or make external changes without authorization. For
local-only tasks, mark target acceptance as not applicable.

For example: local checks PASS; staging verification NOT PERFORMED (no access);
next step: an authorized maintainer runs the staging smoke test.

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR
Target:    [VERIFIED/FAILED/NOT PERFORMED/NOT APPLICABLE] (environment/version, evidence)
Next permitted step: [check or access dependency; none if complete/not applicable]

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification every 15 minutes or after major changes:

```markdown
Set a mental checkpoint:
- After completing each function
- After finishing a component
- Before moving to next task

Run: /verify
```

## Integration with Hooks

This skill complements PostToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.
