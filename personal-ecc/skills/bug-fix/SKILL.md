---
name: bug-fix
description: Implement a scoped bug-fix plan and iterate on the user's test feedback while preserving existing behavior and related features. Use when asked to apply a fix or correct a failed fix; hand execution and validation back to the user before review.
metadata:
  origin: Personal ECC
---

# Bug Fix

Implement the authorized correction and hand it to the user to run. The personal
workflow is fix -> user runs/checks -> feedback and further fixes if needed ->
user confirms the current changes -> separately requested review. There is no
`bug-verify` stage. Write updates in the user's conversation language.

## Authority and Test Ownership

Read the available diagnosis, fix plan, user decisions, and project rules. A
request to implement the plan authorizes its in-scope code changes; do not ask
for the same approval again. No formal artifact or earlier skill invocation is
required when the conversation already supplies sufficient scope and evidence.
Resolve material conditional-plan prerequisites rather than silently guessing.

The user owns application execution and validation by default. Do not start the
application, run tests/builds/lint/type checks, reproduce against a service, or
install dependencies unless the user requests that execution. Read source and
inspect the diff normally. Author or update meaningful regression tests when
included in the plan or required for the change, leaving execution to the user.
Where feasible, write the regression test before implementation, but do not
claim observed RED/GREEN or passing coverage when it has not been run. This
user-controlled execution preference overrides generic automatic test-running
and stage-transition defaults for this personal workflow.

Bounded read-only MCP inspection of the established bug environment is permitted
to check data-dependent prerequisites or investigate feedback; it does not run
the application or tests. Read [Database Evidence](../bug-diagnose/references/database-evidence.md)
before DB inspection or a requested beta data operation. Live is always read-only.
Beta is read-only unless the user proactively requests a specific record mutation
and an authorized supported capability exists. An approved code-fix plan does not
grant that permission. Keep this separate from application/test execution rights.

Running a requested check does not authorize further external actions. Preserve
the runtime's permission boundaries. Do not commit, push, deploy, mutate live
data, modify credentials, or update/close tickets merely because code is ready
for testing. Do not start formal review or require a separate verification skill.

## 1. Establish the Current Fix Scope

Inspect the working tree and relevant source before editing. Identify existing
user/other-agent changes and the baseline or diff scope for this bug. Preserve
unrelated changes; do not reset, overwrite, or commit them. Read enough current
code to confirm that the diagnosis and planned correction still apply.

Restate the intended result, correction boundary, acceptance criteria, and
contracts that must remain. Carry forward the plan's impact table, related
callers, known unknowns, and regression checks rather than starting the workflow
again. If a material requirement, cause, or compatibility decision is unresolved,
name that blocker and continue only independent work that remains justified.

Reuse the diagnosis's source-and-data causal chain, including environment, time,
record scope, transformations, scopes, and unknown branches. If a relevant stored
value remains unknown or evidence is stale, obtain a focused read through the
correct MCP before making a data-dependent edit. Do not repeat speculative patches
or silently switch live/beta to find a record. Reconcile observations with the
code and intended contract; reading a row alone does not explain the failure.

For a defective shared function, carry forward the user's shared-versus-local
choice and the listed consumers. If that choice is missing, identify the function,
report the consumer locations and expected effects, and present the direct shared
correction and any viable local alternative before editing that boundary. Do not
default to a feature flag or wrapper because other features use the function.
Existing explicit authorization of the disclosed boundary is sufficient; do not
ask again merely because the function is shared. A generic request to fix one
feature does not by itself settle an undisclosed shared-versus-local choice.

## 2. Implement the Coherent Correction

Make the smallest coherent change that addresses the cause. Follow the approved
local/shared correction boundary and existing repository patterns. Preserve
valid behavior, error handling, authorization, API/type/null semantics, ordering,
pagination, and other caller-specific contracts identified in the plan.

If the user approved a direct shared correction, fix the defective function
itself and the authorized dependent code as needed. Do not substitute a local
flag, duplicate, or bypass to keep other callers' defective outputs unchanged.
Preserve intended valid behavior; the disclosed correction of the same defect in
other callers is part of the approved result. If the user chose local isolation,
implement that viable boundary and disclose which shared defects remain. Do not
silently broaden it to the shared function. Use flags/adapters only when justified
by legitimate differing requirements or the selected compatibility option.

Do not suppress the symptom with broad catches, discard records, weaken tests,
disable checks, or change global defaults without a justified requirement. Keep
unrelated cleanup, dependency upgrades, generated churn, and speculative refactors
out of the patch. Do not always prefer fewer files if that leaves the same defect
in other callers that the authorized plan explicitly intends to correct.

Add the planned regression coverage and meaningful adjacent-case assertions.
Do not merely mirror implementation details or rewrite valid expectations to
make the patch appear correct. If existing tests conflict with the intended
behavior, explain the requirement-based reason before changing their assertions.

Inspect the resulting diff for unplanned consumer/contract changes and accidental
debug output or sensitive data. This author inspection is part of preparing the
patch, not the separate `bug-review` stage or proof that runtime behavior works.
If new evidence requires broader scope, state the affected behavior and the
decision needed; do not silently expand a local correction into a shared redesign.
If newly discovered consumers or contracts materially change the approved impact,
update the impact report and resolve that new decision before dependent edits.
Do not manufacture a workaround to conceal the changed scope.

## 3. Hand Execution to the User

Return a concise handoff containing:

- Bug reference and current attempt, with the changed files or available revision/diff scope.
- What changed and why it addresses the diagnosed cause.
- Data evidence used, its live/beta environment and freshness, and any unobserved
  branches; distinguish DB inspection from actual application/test execution.
- The selected shared/local boundary and related consumers whose behavior is
  intentionally corrected, preserved, still defective, or unverified.
- Existing and related-feature behavior preserved by the design, plus residual risks.
- Tests added/updated, with their execution status explicitly marked.
- Exact manual steps or repository-verified commands the user can run, required
  preconditions, and expected results for the original bug and affected callers.
- Checks not performed, environment limits, and information needed if the check fails.

Use **implementation ready for user testing**, **partial**, or **blocked** as
appropriate. Do not state "bug fixed", "verified", "all tests pass", or "no
regressions" as established facts before supporting results exist. Distinguish
structural reasoning from executed evidence, and supplied results from your own.

Stop and let the user run the changes. Do not poll, rerun checks, or advance into
review while waiting. Offer clear instructions without demanding a full log dump
or credentials; ask for the failing action, relevant error, and current revision
or environment only when needed.

## 4. Iterate on User Feedback

Treat a user report that the current fix still fails as authorization to continue
the same in-scope fix. Do not require fresh intake, repeat approval of the same
plan, or discard previous evidence. Compare the actual result with the expected
result and the exact changes tested. Distinguish the original failure, a new
regression, stale build/data, and environment issues using evidence.

Perform bounded diagnosis needed for that feedback, adjust the justified patch,
and provide an updated test handoff. Keep a short attempt summary: changed since
the last handoff, evidence learned, and what needs to be rerun. The user owns
execution again unless explicitly delegated. Avoid repeated speculative edits
when no new evidence is available; identify the specific missing observation.

A result from an older patch does not validate later edits. After every behavior-
changing edit, relevant user checks become pending again. Do not inherit a broad
success claim from one narrow case, an old commit, or a different environment.

## 5. After the User Confirms

Associate the confirmation with the latest changes and the cases actually tested.
"Approve the plan" or "okay, fix it" is not confirmation that a runtime check
passed. If confirmation is ambiguous and its scope matters, clarify that scope.

Report **user-confirmed for the stated checks** and retain any untested risks.
The next stage is `bug-review` when requested. Do not invoke it automatically,
mark the ticket resolved, or treat user confirmation as permission to commit or
publish. If later review leads to code changes, those changes return to user testing.
