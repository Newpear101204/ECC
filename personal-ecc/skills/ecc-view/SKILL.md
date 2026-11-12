---
name: ecc-view
description: Show current ECC task progress or open its read-only JSON dashboard. Use for short progress requests; identify the intended run from context without changing task state or querying databases.
metadata:
  origin: Personal ECC
---

# ECC View

Accept `$ecc-view`, "show progress", or equivalent natural-language requests.
This is a skill entry point, not an installed universal `/view` slash command.
Resolve the shared ECC checkout from the personal bootstrap.

## Locate the Work

1. Prefer an explicit run JSON path or the current task's recorded run path.
2. If the task has no managed run, report its known conversation milestones,
   checks and blockers. Do not create state or workers just to display progress.
3. If several runs are plausible, identify the candidates from known task context
   and ask which one. Do not guess "latest" by timestamp or scan credentials,
   database files, plugin caches, or the whole disk to discover a run.
4. If state is missing/unreadable, state that it is unavailable. Do not initialize
   another run, delete locks, or infer that work completed.

## Display

For a known managed run, use the existing read-only CLI:

```text
node <ECC-root>/scripts/orchestrate.js status --state <explicit-run.json> --json
```

Summarize task/status, current worker/attempt, worktree, dependencies/blockers,
validation/review/integration evidence and the next eligible action. Attribute
checks to their actual source. Do not invent percentages or claim running proves
that a native agent is alive. Show only the relevant rows unless detail is requested.

An inline chat table is a snapshot, not a live component. For the live local view,
reuse a known running dashboard URL when verified, or start the existing server:

```text
node <ECC-root>/scripts/orchestrate.js serve --state <explicit-run.json> --port <available-loopback-port>
```

Use the host's supported background-process mechanism without blocking the main
conversation, obeying its permission rules. If using Windows Start-Process, use
WindowStyle Hidden. Verify startup and the URL before announcing it. A missing
server or port conflict is not a reason to kill an unrelated process. If the host
cannot keep it running, provide the snapshot and explain the local-view limitation.
Open the URL through an available supported browser mechanism when requested;
otherwise provide the link. Do not require a full browser automation session for
ordinary state inspection.

The dashboard polls recorded JSON about every two seconds. Polling does not call
the AI model or automatically collect all native-agent activity. The coordinator
must still record real transitions/evidence. It is read-only and not a worker
control panel; opening or refreshing it must not approve, claim, retry or resume work.
The passive server may remain visible after a session stops; it must not become
a detached scheduler. Task work requires the main AI's active supervision.

Never launch legacy `control-pane` without `--orchestration`; its old DB-backed
mode is outside this view. Do not read MCP databases or query application APIs to
infer progress. Do not output secrets or raw state/logs unnecessarily. This skill
does not expand DB, execution, commit, push or deploy permissions.
