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
  Reassess that choice per phase; an AI-selected mode is not fixed for the task.
- **Direct / no agents**: work in the main session; preserve appropriate checks.
- **Team / parallel**: delegate substantial verified independent work when tools
  support it; dependencies still run in order. Explain if no useful split exists.
- **Plan only**: an explicit current plan-only request stops before implementation,
  even if implementation was permitted earlier. Only a planning skill's implicit
  default stop yields to separately granted broader implementation authority.

Carry preferences through the current task until the user changes them. Do not
silently change global configuration. Ask about unresolved requirements, desired
output or business-flow conflicts. Own technical decisions for the agreed output;
do not require repeated bootstrap or approval for decisions already settled.

## Business Clarification Gate and Technical Autonomy

Compare relevant new/old documents, BA/design, contracts/tests and actual code/
consumer flows. Ask when they leave the required outcome or business rules unclear
or contradictory; do not silently select one business meaning. Small/direct tasks
and generic implementation approval do not bypass this. Apply an explicit relevant
user decision without duplicate questions. Disclose unavailable evidence. Read
[requirement clarification](../../references/requirement-clarification.md) for the
procedure and example. Its canonical path is
`personal-ecc/references/requirement-clarification.md` under the shared ECC root;
use that path rather than an installed-link parent directory.

Hold only work dependent on that business answer. Main AI owns the question and
records/propagates the answer to affected workers/reviewers. Continue independent
authorized work. Clear requested changes need no reapproval because old code differs.

Resolve engineering alternatives autonomously: architecture, dependencies,
algorithms, components, shared/local correction, technical compatibility, test
mechanics and conflicting worker recommendations. These need not be equivalent
or preselected by convention. Use evidence, weigh risks, choose and check within
authority; explain important choices instead of making the user choose them.
Ask only if a technical finding exposes disputed business behavior, changes the
agreed outcome/scope or requires additional permission. Never disguise a business
decision as technical or use technical autonomy to bypass DB/execution limits.

## Working Procedure

1. Load the current personal instructions and applicable project rules. Reuse
   their loaded context within the session; do not repeatedly read every skill.
   Use local canonical skills instead of stale cache content where customized.
2. Establish the requested outcome, BA/contract version, acceptance criteria,
   existing implementation and granted actions. A clear small change uses direct
   execution, while a feature still requires its Markdown file.
   For every feature, create or resume one canonical Markdown task file at intake,
   including small/direct and plan-only work. Follow
   `personal-ecc/references/feature-task-file.md` from the shared ECC root for its
   self-contained requirements, decisions, status, portable paths and resume rules.
   Put needed BA/design/contract contents in the file, not only source links.
   For meaningful planning, follow `personal-ecc/skills/ecc-plan/SKILL.md`.
   Apply `personal-ecc/references/work-quality-contract.md` from the shared ECC
   root: before work, map each material criterion to an expected artifact/behavior,
   discriminating check, expected result, authority and evidence gap. Use the same
   feature Markdown, not another report. Plan-only defines future checks without
   executing them; tiny tasks keep this brief.
   Before changing a feature, follow its Existing-Flow Impact procedure: trace
   shared code/contracts to existing callers and consumers, identify preserved
   versus explicitly changed behavior, and plan evidence-backed regression checks.
   A clear small edit needs only a bounded check, not full-repository onboarding.
   Keep plan/task progress in that file at a depth sufficient to resume the work.
   Do not initialize a
   dashboard or an observation-only ledger for displaying progress.
3. Honor a plain approval of an identified plan as authority to implement that
   scope, subject to the work clarification gate above. It does not add DB
   writes, app/test execution, publication, or deployment
   outside established permissions. Do not ask the user to restate existing rules.
4. Reassess execution at every authorized phase transition and when dependencies
   clear. A sequential planning step does not make coding/review sequential.
   Follow `personal-ecc/references/phase-coordination.md` for substantial features.
   Name the phase, actual task dependencies, useful independent work and chosen
   mode/reason. Honor explicit user no-agent/phase limits; the AI owns technical
   scheduling and does not ask for repeated fan-out permission within granted scope.
   For parallel work, read `skills/team-agent-orchestration/SKILL.md`. Select an
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
   Include expected outputs/checks, input versions and recovery/stop conditions
   in each assignment. Normalize submissions to status/summary/artifacts/next_actions
   without changing host tool schemas or replacing the managed submission contract.
   For failure/timeout, inspect what actually changed before an authorized retry;
   preserve attempt evidence and stop unproductive loops. Ask only about unresolved
   business intent or missing authority, not ordinary engineering choices.
6. Review submissions against acceptance criteria and actual evidence, bound to
   task/attempt/revision/output hash. Respect accepted versus integrated gates.
   Missing checks stay not-run. Never manufacture approval or worker identities.
   Pass existing-flow preservation criteria and affected consumers to workers and
   reviewers. Compare the actual diff with the impact assessment; newly touched
   shared paths require updated consumer analysis and applicable regression checks.
   Report checks not run and unknown consumers instead of promising no regressions.
   Before delivery of the authorized stage, apply the shared contract's final
   self-evaluation. Main AI checks accuracy/completeness/clarity/actionability/
   conciseness on substantive work; tiny changes get a brief evidence/gap check.
   Fix in-scope gaps and refresh affected checks/review when output changes. Record
   concrete gaps/limitations in the same Markdown. Do not substitute a score,
   average, done status or heuristic evaluator for real acceptance evidence.
7. Report the chosen mode and material milestones briefly. Retain the absolute
   managed execution run path in task context/handoff when one is used.
   Update the canonical feature file at meaningful milestones and before stop or
   completion. Record code revision and required uncommitted files/artifacts;
   document portable repo-relative locators as well as any local run path.
   On resume, read this file, reconcile actual repo/code/check/worker state and
   continue eligible work without routinely asking for the BA or old conversation.
   Missing code/assets or conflicting state are blockers to reconcile, not permission
   to invent history, overwrite changes or replay completed effects.
   Use `ecc-view` on progress requests; avoid dumping whole state or repeated logs.
   If no agents are available, continue feasible sequential work and state the limit.

For substantial work, retain plan identity, main/agent ownership, dependencies,
phase rationale and actual dispatch/result/review/retry evidence in the existing
plan/handoff or required managed execution run. Do not duplicate that information
into dashboard event files. The browser dashboard is deferred: do not launch its
server or record observation-only events, even for ecc-view. ecc-view reports a
concise chat snapshot. This removes display overhead only; adaptive scheduling,
slot refill, evidence-based review and execution gates remain unchanged.

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
