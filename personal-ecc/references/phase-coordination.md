# Phase-Aware Coordination

Apply to substantial multi-stage work handled through ecc-work or an approved
ecc-plan. Small clear changes stay lightweight. The main AI remains the active
coordinator; this does not enable an independent scheduler or background workers.

## Scope the Mode to Current Work

Lifecycle order and within-phase concurrency are different. A result must exist
before it can be reviewed, but independent artifacts may be reviewed together.
Once contracts and ownership are clear, coding can fan out even when planning
used one main agent. Reassess on each authorized phase change, upstream result,
new blocker or capacity change. An AI's earlier sequential choice is not a sticky
user preference. An explicit user no-agents preference remains binding until changed.

Phase labels are discovery, planning, plan-review, implementation, code-review,
integration and verification. The classifier annotates one assessment; retain
actual phase decisions and reasons in the existing plan/handoff or execution run.
The classifier does not discover independence or launch agents. Recompute using
current verified independent streams and actual prerequisites.

## Reason About Each Phase

| Phase | Parallel candidates | What must remain ordered |
|---|---|---|
| Discovery | Independent source/module/test surveys | Main-AI reconciliation and unresolved business decisions |
| Planning | Independent impact/contract/test analyses when useful | Coherent plan and shared-contract decisions |
| Plan review | Independent risk, coverage or consumer perspectives on one version | Main-AI consolidation and requested approval/stopping boundary |
| Implementation | Ready tasks with stable contracts and disjoint ownership/worktrees | Dependent shared foundations and unresolved requirements |
| Code review | Independent outputs or review perspectives on pinned revisions | Receipt tied to actual output; reconciliation of cross-cutting findings |
| Integration | Work elsewhere may continue | Writes to the same integration target and verifying receipts |
| Verification | Independent checks on known revisions/resources | Prerequisites, result consolidation and required final integrated checks |

These are possibilities, not mandatory extra reviews or agents for every task.
Do not automatically start formal bug review, tests, app execution or publication
outside the user's established authority. Independent parallel review does not
replace final analysis of interactions across integrated changes. If a reviewer
finds edits needed, new output must receive a new applicable review.

Review a completed part while another independent worker continues when inputs
are stable. Do not create a global batch barrier merely because multiple workers
started together. Conversely, "plan exists" alone does not prove code tasks are
independent: verify contracts, shared files, outputs and integration prerequisites.

## Explain Sequential Work Precisely

At phase changes, briefly report:

- Current phase and the actual tasks/groups being considered.
- Mode and concrete reason: missing output, shared contract/file, same integration
  target, no independent scope, unavailable agent slots or local resource limits.
- Which work is independently ready, who will handle it and what gate opens next.

Example: "Planning consolidation is sequential because the API contract is not
settled. After it is fixed, UI A and UI B have separate ownership and can run
in parallel. Each can enter review when its own output is ready; integration
into the shared feature branch is serialized."

If no parallel split is useful, state why; do not invent workers to satisfy a
count. If it is useful and supported, the main AI dispatches the eligible work
within capacity without making the user request parallelism again. Business
clarification and explicit user preferences still take precedence.

## Keep Evidence of Actual Work

Keep a phase/task summary in the canonical feature Markdown for every feature,
including main-AI work, following [the portable file contract](feature-task-file.md).
Small work may use a compact file; substantial work may also need execution state.
Maintain milestones and controlled handoff, not a log of every tool call.
The dashboard and its separate observation event
ledger are deferred; do not initialize either for reporting. For example:

| Phase/task | Prerequisite | Owner | Work evidence | Next gate/blocker |
|---|---|---|---|---|
| Plan consolidation | Discovery findings | Main AI | Plan v2 completed | Contract decision |
| UI-A implementation | Settled contract | Proposed worker-a | Proposed, not dispatched | Contract decision |
| UI-B implementation | Settled contract | Main AI or worker-b | Not started | Contract decision |

When work starts, replace the proposal with actual dispatch references and current
attempt/output evidence. A main-AI task is real work too; it should not disappear
from the ledger simply because it has no subagent. Do not manufacture activity.

Distinguish these facts in reporting:

1. Proposed task/worker in a plan: no execution implied.
2. Prepared/claimed attempt and packet: native dispatch may not have happened.
3. Dispatched native agent: tool returned an agent/reference for that work.
4. Received result: evidence is available; acceptance/review/integration remain separate.

The managed execution model claims a task as running before native assignment;
its raw status is not proof of a live agent. Retain actual provider/tool/agent
references after the native tool returns in the existing handoff/run. These are
reported receipts, not authentication or automatic liveness monitoring. Main-AI
work needs no fake native dispatch.

For managed parallel work, the main AI records real tasks/assignments/results in
the explicit run and reconciles discrepancies. Report gaps honestly if operations
could not be recorded. Do not rewrite live state by hand or pretend the CLI can
append/change a run's task graph; prepare a revised plan/run with preserved evidence
when a structural revision is genuinely required under existing authority.

For clear small features, maintain the same Markdown artifact while keeping direct
execution lightweight. On another machine/session, read it and reconcile actual
repo/revision/pending code, permissions and historical worker references before
continuing. Do not assume that a Markdown copy transfers code or native sessions.
ecc-view returns a concise chat snapshot. Do not start a dashboard server, create
display-only event files, or manufacture history. Keep execution state needed for
actual scheduling, dependency gates, review and recovery; those remain unchanged.
