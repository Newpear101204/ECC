---
name: ecc-view
description: Show a concise progress snapshot in chat from the current plan, actual agent evidence or an existing managed run. Do not launch dashboards, create display-only state or query databases.
metadata:
  origin: Personal ECC
---

# ECC View

Accept $ecc-view, "show progress", or equivalent natural-language requests.
This is a skill entry point, not an installed universal /view command.
Resolve the shared ECC checkout from the personal bootstrap.

## Locate and Report

Use the current task's plan, conversation milestones and actual native-agent
references. When a managed execution run is already known and relevant, read its
status with node <ECC-root>/scripts/orchestrate.js status --state <explicit-run.json>
--json. Keep the absolute run path in existing context/handoff. Do not scan the
whole disk, credentials, caches or unrelated sessions to discover a run. If several
known tasks are plausible, ask which one; if evidence is unavailable, say so.

Return a compact chat snapshot of current phase/mode/reason, main-AI and agent
work, dependencies/blockers, results/checks/review and next eligible action. Show
only relevant rows unless more detail is requested. Attribute check evidence;
do not invent percentages or equate a claimed/prepared status with a live agent.
An inline table is a snapshot and does not update after the response.

## Dashboard Deferred

The user deferred the browser dashboard. Do not launch view, serve or control-pane,
open a dashboard URL, initialize an observation-only run, or write display-only
events to satisfy ecc-view or an ordinary progress request. Existing experimental
code and historical records may remain on disk for later research. Re-enabling
that feature requires an explicit user request, not just "show progress".

This preference removes presentation overhead only. Retain execution state needed
for real coordination, actual task/attempt/revision evidence, dependency gates,
review and recovery. Do not transition tasks, dispatch workers, approve, retry or
resume work merely to report progress. Do not query databases or application APIs
to infer progress. Preserve DB, execution, commit, push and deploy limits.
