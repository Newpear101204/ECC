---
name: ecc-work
description: Start or continue a development task with user-controlled, right-sized ECC coordination. Choose direct, sequential, or parallel work; delegate internal bookkeeping to the main AI and preserve existing permissions.
metadata:
  origin: Personal ECC
---

# ECC Work

Use this entry point for a feature or implementation request, including a short
"approved, implement" continuation. Resolve ECC-relative paths against the shared
checkout identified by the bootstrap. Respond in the user's language.

## User Controls

Interpret preferences naturally; these are conversation choices, not CLI flags:

- **Auto** (default): choose the lightest sufficient method after inspecting scope.
- **Direct / no agents**: work in the main session; preserve appropriate checks.
- **Team / parallel**: delegate substantial verified independent work when tools
  support it; dependencies still run in order. Explain if no useful split exists.
- **Plan only**: an explicit current plan-only request stops before implementation,
  even if implementation was permitted earlier. Only a planning skill's implicit
  default stop yields to separately granted broader implementation authority.

Carry preferences through the current task until the user changes them. Do not
silently change global configuration. Ask only when intent or a consequential
decision remains ambiguous; do not require a repeated bootstrap or permissions prompt.

## Working Procedure

1. Load the current personal instructions and applicable project rules. Reuse
   their loaded context within the session; do not repeatedly read every skill.
   Use local canonical skills instead of stale cache content where customized.
2. Establish the requested outcome, BA/contract version, acceptance criteria,
   existing implementation and granted actions. A clear small change stays inline.
   For meaningful planning, follow `personal-ecc/skills/ecc-plan/SKILL.md`.
3. Honor a plain approval of an identified plan as authority to implement that
   scope. It does not add DB writes, app/test execution, publication, or deployment
   outside established permissions. Do not ask the user to restate existing rules.
4. For parallel work, read `skills/team-agent-orchestration/SKILL.md`. Select an
   explicit run budget from useful independent work, actually available agent
   slots (including main/occupied agents), user limits, resource-heavy commands
   and coordination cost. There is no fixed three-worker policy or ECC eight-worker
   ceiling. Never claim capacity the host does not provide. Queue work when full;
   refill a slot as eligible work becomes available. Do not fill slots with blocked work.
5. The main AI owns plan/state JSON, prepare/submit, agent assignment, result
   collection, review receipts and authorized serialized integration. The user
   provides decisions and can inspect progress; do not ask them to execute each
   internal PowerShell command. Managed handoffs isolate every task in a worktree;
   verify packet/baseline/ownership before assigning an actual agent. Native tool
   availability alone is not a process adapter or a sandbox.
6. Review submissions against acceptance criteria and actual evidence, bound to
   task/attempt/revision/output hash. Respect accepted versus integrated gates.
   Missing checks stay not-run. Never manufacture approval or worker identities.
7. Report the chosen mode and material milestones briefly. For a managed run,
   retain the absolute run-file path and dashboard URL in task context/handoff.
   Use `ecc-view` on progress requests; avoid dumping whole state or repeated logs.
   If no agents are available, continue feasible sequential work and state the limit.

## Permissions and Runtime Boundaries

Standing DB rules in `personal-ecc/instructions.md` always apply: live read-only;
beta read-only unless the user proactively requests a supported scoped mutation;
feature behavior comes from BA and code, with DB only last-resort context for a
named gap. A task-specific no-DB instruction overrides even those read permissions.

The current managed JSON worker contract supports database `none` only. Keep DB
inspection out of those workers. The main AI may gather necessary bounded evidence
outside managed workers under the standing mapping/policy only when the overall
task permits it; this is not a bypass of a task-wide ban. Never reinterpret generic
plan approval as DB mutation authority. Do not query merely to initialize ECC.

Public `run --execute` and production process execution remain disabled pending
a verified sandbox adapter. Do not use test-harness flags or arbitrary wrappers
to launch real workers. Main-session native-agent coordination is session-bound,
not an always-on daemon. Main-AI supervision is a standing user requirement, not
a missing feature to enable later: do not launch a detached dispatcher that can
continue development without the main AI, even if a sandbox is later available.
Before a controlled stop, cease dispatch, request worker stops and verify/preserve
state. If the session disconnects abruptly, worker termination may be unknown;
reconcile it before resuming rather than claiming every process stopped.

For bugs, preserve the separately requested intake/diagnosis/plan/fix/review stages
and user-owned execution policy. This entry point does not auto-advance them.
