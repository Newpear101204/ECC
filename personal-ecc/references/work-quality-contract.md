# Evidence Contracts and Final Self-Evaluation

This is the Personal ECC adaptation of agent-harness-construction and
agent-self-evaluation for ecc-work/ecc-plan. For substantial planning/coordination,
read `skills/agent-harness-construction/SKILL.md` once from the shared ECC checkout;
before substantive final evaluation read `skills/agent-self-evaluation/SKILL.md`
and its evaluation-criteria reference when needed to resolve rubric meaning.
Reuse loaded context. Do not load these full skills for every tiny edit/tool call.
Their optional runtime examples are not authorization to execute them.

This adaptation takes precedence over generic suggestions for mandatory report
files, scoring triggers or hooks. It preserves the main AI's supervision, existing
acceptance/review/integration gates, business clarification and action permissions.

## 1. Define Evidence Before Work

For the currently authorized stage, map each material acceptance/preservation
criterion to the artifact or behavior expected, a discriminating check, expected
outcome, action authority and actual evidence status. Keep this in the canonical
feature Markdown; one sentence may suffice for a tiny change. Criteria come from
settled requirements, not the implementation's current output or sampled beta rows.

| Criterion | Expected artifact/behavior | Check and expected outcome | Authority | Actual evidence/gap |
|---|---|---|---|---|
| AC identifier | Concrete output including applicable old-flow preservation | Known test/source/contract/inspection; success condition | Allowed, user-owned or blocked | Planned/not-run, passed, failed or unverified; revision/source |

Plan-only work defines future implementation checks without executing them. Review
the plan itself for coverage and unresolved decisions at that stage. Do not invent
a machine validator for every business feature or call a specialized adapter-doc
validator a general correctness checker. Static inspection, user-run observations,
executed tests and review findings are different evidence types; label them.

## 2. Shape Each Assignment and Submission

Before delegating, specify task/attempt, pinned input/contract versions, owner,
owned paths/baseline, dependency gates, expected outputs, criterion/check mapping,
permitted actions and escalation/stop conditions. Direct work uses the same essentials
without fake worker identities or extra JSON state solely for ceremony.

Keep a compact result summary with:

- `status`: success, warning or error, with the actual task-stage meaning.
- `summary`: what happened, what remains and the evidence behind material claims.
- `artifacts`: real changed paths/output references and checked revision/output
  identity; do not point only to a log unavailable on the destination machine.
- `next_actions`: the next eligible step, missing evidence or a concrete blocker.

These are normalized handoff fields, not changes to host tool schemas. Preserve
raw tool evidence where relevant; do not invent fields, native receipts or live
agent status. Existing managed submissions still use their real required schema
and checked worktree fingerprint. Success/exit zero/done means neither acceptance
nor integration. Verify current artifacts and required criteria/checks against
evidence; only then use legitimate existing review/gate transitions.

## 3. Recover Safely

At a failure, record the observed error, a bounded cause/hypothesis, what may have
changed, the next discriminating action and the stop condition in the same task
file or required execution state. Never record an untested hypothesis as fact.

| Situation | Main-AI action | Hold/stop condition |
|---|---|---|
| Technical defect, intended behavior clear | Inspect evidence and correct within scope; recheck changed output | No supporting progress after repeated attempts: summarize evidence/blocker instead of looping |
| Missing input/permission/tool | Continue independent authorized work; obtain only the missing prerequisite when needed | Dependent work waits; do not widen authority or bypass controls |
| Unclear/conflicting business result | Ask the user with facts/impact; propagate the answer to affected workers | Hold affected commitments, code and assertions until answered |
| Timeout/disconnect/uncertain side effects | Inspect actual artifact/process/remote state within authority before any retry | Do not blindly replay writes, publication, external calls or a possibly completed attempt |
| New revision after review/check | Reconcile affected criteria and refresh relevant checks/review | Do not reuse stale output identity or claim old checks prove new code |

Retry only when evidence or changed prerequisites justify it and execution is
allowed. Main AI chooses a bounded investigation/retry effort and records why it
continues or stops; no always-on repair loop, auto-reset, erased history or endless
score optimization. A safe retry instruction cannot authorize a forbidden action.

## 4. Evaluate Before Delivery

After applicable verification/review/integration, main AI evaluates the current
deliverable for the authorized stage, before reporting it. This does not open a
later bug stage, start the app or convert plan-only work into implementation.

- Tiny clear changes: a brief evidence/gap check in the feature Markdown, no full
  scorecard, extra reviewer agent or repeated per-worker five-axis ritual solely
  for self-evaluation. Keep actual review requirements of the project.
- Substantive work: consider all five axes below, once for the delivered scope.
  Keep concise rows or prose in the existing Markdown; reuse evidence, not whole
  transcripts. A material correction requires an applicable recheck, not rerating
  every unchanged item after each tool call.

| Axis | Evidence-based question |
|---|---|
| Accuracy | Are code/factual/completion claims supported on this revision? Are static expectations distinguished from executed/user-reported evidence? |
| Completeness | Are the requested criteria, authorized stage, edge cases and affected old flows accounted for, with gaps explicit? |
| Clarity | Can another person understand what changed, what is unsettled and which claims are limited? |
| Actionability | Can the user or another AI continue from the Markdown and matching source, with exact next steps and required assets/permissions? |
| Conciseness | Is useful context retained without duplicate reports, irrelevant logs or unnecessary coordination? |

For each substantive gap cite concrete evidence and its user impact, then a
specific correction or limitation. Lack of verification is not proof of correctness.
Do not penalize missing out-of-scope features or manufacture a flaw to avoid a
perfect-looking assessment. Numeric 1-5 ratings are optional when requested/useful,
not mandatory for each result. Every rating needs evidence, including high scores;
averages are subjective summaries, never pass/fail gates, proof or permissions.

Fix justified gaps autonomously within scope/authority; keep missing authority or
business decisions explicit. If a fix changes reviewed output, repeat applicable
verification/review before relying on it. When validation remains unavailable,
report the limitation and correct stage (e.g. implemented, verification pending),
not completed/accepted based on self-confidence. Self-evaluation never replaces
tests, independent review where required or the managed gate's validation evidence.

## Boundaries

Do not run `scripts/work-items.js`, session DB commands or the upstream opt-in
verified-work-item flow for this integration: they use ECC state DB, and the sample
validator is specific to adapter documentation. Keep the existing Markdown/JSON
workflow; no database access is required. Do not run `evaluate.py` as proof of code
correctness or automatic acceptance; its optional heuristics are not verification.
Do not install Stop/PostToolUse hooks, a dashboard, scheduler, model training,
automatic reviewer launcher or native tool wrapper. Loading skills grants none of
these capabilities or new DB/app/test/Git/deploy authority. On resume, reconcile
actual evidence/revisions and current permissions before further execution.
