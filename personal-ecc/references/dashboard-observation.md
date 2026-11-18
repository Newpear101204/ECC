# Dashboard Observation Runbook (Deferred)

Archived implementation reference only. The user deferred the browser dashboard
and display-only recording. Do not follow this runbook in ordinary ecc-work,
ecc-plan or ecc-view work. Re-enabling it requires an explicit user request.
Keep real coordination and managed execution evidence as before.

Use for a substantial new feature from intake onward, including sequential work
by the main AI. Small clear edits can remain in conversation. This ledger makes
plan execution inspectable; it does not execute a plan or replace the existing
managed executor's worktree/review/integration gates.

Resolve commands against the shared ECC checkout. Keep the explicit run path and
any verified view URL in the task's existing context/handoff. The main AI performs
these internal steps; users normally invoke ecc-work and ecc-view, not each command.

## 1. Start at Intake

Choose a permitted local directory outside tracked source and store an input
manifest there. Use the real target project path, not the ECC checkout by default:

```json
{
  "schemaVersion": 1,
  "id": "feature-registration",
  "repoRoot": "/absolute/path/to/project",
  "baseRef": "HEAD"
}
```

```text
node <ECC-root>/scripts/orchestrate.js observe-init <manifest.json> --state <run.json>
```

This creates an observation-only run with no execution tasks and no implementation
approval. It can record real intake/planning without launching agents, creating
worktrees, executing tests or touching a DB. Do not reuse a run by overwriting it.
Use a clear new ID/path for another feature; do not infer "current" by scanning disk.

## 2. Record Plan Identity and Real Work

Write a bounded JSON event file and call:

```text
node <ECC-root>/scripts/orchestrate.js record --state <run.json> --event <event.json>
```

Every event requires nonempty `evidence`. Keep it specific and attributable,
excluding credentials/customer data. Recording text does not authenticate its
source; never manufacture a native-tool receipt, user decision or passing check.

First record the real plan/input reference, including its current draft version:

```json
{
  "type": "plan",
  "title": "Registration feature",
  "reference": "requirements/registration.md#scope",
  "version": "draft-1",
  "summary": "Requirements intake; business questions remain open",
  "evidence": "User supplied the referenced requirement document; implementation not approved"
}
```

Then register concrete work, including what the main AI performs:

```json
{
  "type": "work-add",
  "items": [
    {
      "id": "PLAN-01",
      "title": "Reconcile requirements and existing flow",
      "phase": "planning",
      "owner": "main",
      "dependsOn": [],
      "scope": [],
      "inputs": ["requirements/registration.md#scope"],
      "acceptance": ["Identify acceptance criteria and unresolved business decisions"],
      "validation": []
    }
  ],
  "evidence": "Main AI is responsible for the currently authorized planning work"
}
```

`owner` is `main` or `agent`. Scope/input entries describe the work; they do not
grant file, DB or execution authority. Add future items as proposals when known,
not as already dispatched agents. Item dependencies reference existing item IDs;
record an entire related batch together when needed. An optional `taskId` may
associate an observation with an existing execution task; it does not transition it.

Record phase assessments with a concrete rationale:

```json
{
  "type": "phase",
  "phase": "planning",
  "mode": "sequential",
  "reason": "Main AI must resolve one shared business interpretation before coding can split",
  "ready": ["PLAN-01"],
  "blocked": [],
  "evidence": "Input comparison found an unresolved business decision"
}
```

Valid phases: discovery, planning, plan-review, implementation, code-review,
integration, verification. Modes: direct, sequential, parallel. Reassess each
authorized phase and when dependencies clear. At recording time, `ready` items
must be planned, belong to that phase and have accepted/integrated dependencies
in the ledger. This validates recorded state; it cannot independently establish
real permissions or prerequisites outside the ledger. Check those before dispatch.

## 3. Distinguish Preparation from Actual Dispatch

Record preparation using `prepare` with `itemId`, `workerId`, optional `worktree`,
and evidence. Read the resulting `currentAttemptId`; do not guess it on retries.

Main work uses prepare then `progress` with `itemId`, `attemptId`, `summary` and
evidence, then a result. Main-AI work does not need a fictional native dispatch.

For an agent item, the main AI first prepares, then calls the available native
agent tool within the granted task scope. Only after that tool returns a real
reference record `dispatch` with:

```json
{
  "type": "dispatch",
  "itemId": "UI-01",
  "attemptId": "UI-01-1",
  "provider": "native-agent-tool",
  "tool": "actual-tool-name",
  "agentRef": "actual-returned-agent-reference",
  "reference": "actual-tool-call-or-result-reference",
  "evidence": "Describe the real returned receipt, not a proposed assignment"
}
```

The example is a schema illustration, not an existing worker. Use actual IDs and
receipts. An observation status of dispatched records that receipt; it does not
independently prove the agent remains alive or that the dashboard authenticated it.
The old executor can say running immediately after claim; that count is not a
count of confirmed live native agents. State any evidence gap honestly.

## 4. Record Outcomes as They Occur

Use event files after meaningful real milestones, without dumping every token or
fabricating a finished history at the end:

| Event type | Important fields beyond `type` and `evidence` | Meaning |
|---|---|---|
| `progress` | itemId, attemptId, summary | Recorded work update; not a fabricated percentage |
| `wait` | itemId, attemptId when current, waitingFor, reason | Input/review/permission/dependency/resource wait |
| `result` | itemId, attemptId, result | Actual output received; not acceptance |
| `review` | itemId, attemptId, revision, outputHash, reviewer, verdict, criteria | Independent review of the exact current output |
| `integration` | itemId, attemptId, revision, outputHash, commit, integrator | Recorded integration receipt, not Git-content verification |
| `fail` | itemId, attemptId, reason | Recorded failure for the current attempt |
| `retry` | itemId, reason | Explicit new attempt after failure or changes requested; preserve old attempts |
| `cancel` | itemId, reason | Recorded cancellation; does not itself stop a process |
| `work-revise` | itemId, changes, reason | Explain a supported plan/item revision; no manual state editing |
| `session` | status | Record active, paused or ended main-session coordination |

Results contain `summary`, `revision`, `artifacts` and named `checks`. Each check
uses passed/failed/not-run and evidence. Attribute user-supplied results correctly;
do not report them as independently executed. Read the sealed `outputHash` from
state for review/integration. Review must cover acceptance and required validation;
the reviewer differs from the worker. Changes requested need explicit retry and a
new applicable result/review. Do not invent reviewers to advance observation status.

An observation integration receipt records an existing full commit SHA. It does
not commit, merge, push or prove its content equals reviewed files. Existing managed
executor integration verification remains separate. Likewise, observation review
does not bypass the executor's acceptance gates or user-owned formal bug stages.

Record changed plan references/versions and supported work revisions with reasons.
Preserve previous history; if an event is rejected, inspect the state and report
the gap rather than editing JSON or weakening the validation. On controlled stops,
stop real work as authorized, verify workers where possible and record session
status. After an abrupt interruption, reconcile uncertainty; no automatic replay.

## 5. Open the Read-Only Page

```text
node <ECC-root>/scripts/orchestrate.js view --state <run.json>
```

The command starts/reuses only a passive local server and returns verified
connection metadata. Publish its actual URL. Optional `--port` requests a port;
without one the launcher can choose an available port. It does not open a browser
by itself; use a supported browser mechanism when requested or provide the link.
Do not assume a URL, kill unrelated processes or claim success before verification.

The page shows recorded plan/work, phase rationale, main/agent assignments,
dependencies/waits, attempts, results/reviews, change history and timeline. It polls
about every two seconds without calling the model. Missing/stale evidence and
recorded counts must not be presented as live process telemetry or exact progress.
The user opens this view through ecc-view; no universal `/view` command is installed.

## Boundaries

- Main AI supervises all actual work; the page cannot dispatch, resume or retry it.
- Public `run --execute` remains disabled. Never use a test harness or arbitrary
  wrapper as a production worker launcher.
- Observation events do not widen DB/app/test/commit/push/deploy authority. Preserve
  business clarification, plan-only and bug-stage stops.
- No SQL/SQLite/MCP DB is needed. General live/beta policy remains separate; a
  task-wide no-DB instruction overrides even permitted contextual reads.
- Do not create sample work or scan unrelated sessions to make an empty page look
  active. With no known run, ecc-view must show an honest contextual fallback.
