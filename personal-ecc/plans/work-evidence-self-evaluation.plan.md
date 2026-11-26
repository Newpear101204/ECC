# ECC Work: Evidence Contracts and Final Self-Evaluation

Feature ID: work-evidence-self-evaluation
Updated: 2026-11-26
Stage: integration validated; user authorized commit/push, publication verification pending
Canonical task file: personal-ecc/plans/work-evidence-self-evaluation.plan.md

## Complete Request and Accepted Scope

The user approved integrating agent-harness-construction and agent-self-evaluation
into the current Personal ECC ecc-work workflow. Integrate the useful practices,
not their optional DB-backed work-items runtime or new background services.

Before work, define completion evidence, narrow input/output/action contracts and
safe failure recovery. On results, verify artifacts and acceptance evidence rather
than trusting done/exit zero. Before final delivery of substantial work, main AI
checks accuracy, completeness, clarity, actionability and conciseness. Small work
gets a brief check without extra agents, long scorecards or duplicate reports.
Keep outcomes and gaps in the feature's existing Markdown. Self-assessment is not
a substitute for tests, independent review or actual managed execution gates; no
numeric score or average can approve work. Fix authorized gaps, ask about unresolved
business intent, and recheck any revised output as appropriate.

## Acceptance and Completion Evidence

| ID | Required outcome | Evidence planned |
|---|---|---|
| AC1 | Completion checks mapped to criteria before execution; output includes actual status/summary/artifacts/next action | Source/diff inspection and independent contract review found no material contradiction; criteria and evidence are specified, not auto-verified runtime |
| AC2 | Recovery distinguishes technical error, missing input/permission, business question and uncertain effects; no blind replay | Recovery branches reviewed; hypothetical failed-regression case held acceptance and requested evidence before repair |
| AC3 | Substantial final outputs checked across five axes; tiny tasks remain brief; scores cannot satisfy gates | Independent small-task/progress case did not add agents or scores; failed-check case did not accept rating4.9 |
| AC4 | Preserve plan-only/bug-stage stops, DB ban, main supervision, no dashboard/hooks/daemon/publication expansion | Plan-only hypothetical kept DB-writing API test not-run; no upstream/runtime/profile/hook file modified |
| AC5 | Retain one portable feature Markdown including evidence, gaps, corrections and actual next step | This file and feature-task-file contract include evidence/recovery/final check without a new report |
| AC6 | Existing linked skill profile remains valid | 38 setup/install tests passed; setup dry-run already current |

## Decisions and Authority

- Main AI owns engineering choices for approved outputs; unresolved business intent
  goes to the user, not a score or reviewer vote.
- Adapt both upstream skills through a Personal ECC reference and existing entry
  points. Do not modify upstream skills, runtime, catalogs or profile entries.
- No DB access (including local ECC state DB), browser/app execution, new hooks,
  scheduler or deploy in this task. Commit/push was separately authorized on
  2026-11-26. Local isolated ECC setup tests
  and static/read-only review are in scope for validation.
- Do not run scripts/work-items.js or the heuristic evaluate.py as proof that a
  feature is correct. Tool input/output schemas belong to the host; normalize a
  handoff summary without pretending to change native tools.
- No unresolved business decision blocks this instruction change.

## Existing Flow and Impact

ecc-work already manages adaptive task splitting, ownership, dependencies,
acceptance, review, old-flow impact and retries; ecc-plan already selects validation.
The gap is explicitly mapping completion evidence before work, safe recovery and
the final quality check. Keep those existing gates and permission boundaries.
ecc-view remains read-only chat progress; it may report recorded gaps, never turn
self-ratings into acceptance. All feature sizes still maintain one task Markdown.

## Tasks and Progress

| Task | Owner | Dependency | Status | Result |
|---|---|---|---|---|
| Inspect upstream skills and personal workflow | Main AI | None | Done | DB work-item example is unsuitable; five-axis rubric is reflective, not a gate |
| Add shared adaptation and route bootstrap/work/plan | Main AI | Inspection | Done | Added work-quality-contract.md; routed existing entry points |
| Align feature-file, phase, view and user guide | Main AI | Shared contract | Done | Same portable file; no score-derived state transitions; behavioral scenarios added |
| Validate and independently review scenarios | Main AI/reviewer | Coherent edits | Done | Setup38/38;17 links;diff check;three independent scenario decisions |
| Finalize and deliver | Main AI | Checks/review | Done | Evidence, five-axis check, scope and next actions recorded here |

Mode: sequential editing of one shared instruction contract, followed by a focused
independent read-only review. Extra implementation workers are not useful here.
Actual reviewer /root/work_quality_review returned its report; this is a historical
native reference, not a worker session to resume or an automatically live process.

## Validation and Final Quality Check

Executed against this task's current instruction working tree atop the intake HEAD:

- `node --test --test-reporter=spec personal-ecc/tests/setup.test.js personal-ecc/tests/entrypoint-install.test.js`:
  38 passed, 0 failed, 0 skipped. This verifies install/profile behavior, not every
  future model's adherence or business application runtime correctness.
- `node personal-ecc/setup.js --dry-run`: already current; no reinstall/new profile.
- Local Markdown/UTF-8 check: 11 changed/new Markdown files, 17 local links resolve,
  no Unicode replacement characters. `git diff --check` passed, apart from the
  existing ecc-plan CRLF normalization notice.
- Independent read-only review by /root/work_quality_review: no material contradiction
  or permission bypass found in contract/entrypoints/artifact guidance.
- Three hypothetical decisions (not runtime executions): plan-only did not run a
  DB-writing API test; done/rating4.9 did not bypass a failed required regression;
  tiny label/progress did not cause new agents, evaluation rituals or state changes.
  Reviewer did not rerun setup or validate applications. This bounded probe is not
  proof that all future tasks/models will comply.

Main-AI final quality check (subjective reflection, no numeric gate):

| Axis | Evidence and remaining limitation/action |
|---|---|
| Accuracy | Completion/evaluation claims are backed by actual setup output, inspected docs/diff and reviewer report. No claim of application/runtime verification. |
| Completeness | AC1-AC6 accounted for; worker contracts, recovery, stage boundaries and five-axis/tiny paths covered. Runtime implementation was explicitly outside scope. |
| Clarity | Shared contract distinguishes submission/acceptance/integration and reflection from evidence; user guide gives concrete rules. No unresolved user decision remains. |
| Actionability | Existing linked skills load current checkout; exact file scope, HEAD, permissions and transfer status are recorded. Matching source is still needed on another machine. |
| Conciseness | One reusable reference plus short routes; no duplicate evaluation report, hook or per-worker score ceremony. Detailed rules load when needed. |

No in-scope correction remains from the review. Keep the evidence limits above;
an instruction update cannot independently guarantee quality or model adherence.

## Repository, Transfer and Resume

Repo key: ecc; remote: https://github.com/Newpear101204/ECC.git
Branch: personal
Base/current HEAD at intake: 36c08ee5b1c4bb5b48ef3c59410e61af18d268a6
Working tree at intake: clean. Current edits are confined to the bootstrap,
ecc-work/ecc-plan/ecc-view, feature-task-file and phase-coordination references,
README, Vietnamese guide, workflow-entrypoints scenarios; new files are
personal-ecc/references/work-quality-contract.md and this plan. All are present
locally; no upstream/runtime/profile/hook file changed.
The user separately authorized committing and pushing these edits on 2026-11-26.
Publication must be confirmed from the actual commit/push result and remote state;
this pre-commit snapshot is not itself proof that publication succeeded.
Use repo-relative paths under personal-ecc for changed files. A copied task file
does not transfer those source changes or native reviewer sessions.

Next actions: finish the authorized commit/push and verify HEAD against
origin/personal. On another machine fetch/pull personal and inspect the completed
contract at personal-ecc/references/work-quality-contract.md. Do not reimplement
completed edits. Publication status must be reconciled against actual Git state.
On another machine reconcile missing/different edits before resuming; do not
replay completed effects, query DB or publish because a plan mentions commands.

## Material Change History

- 2026-11-25: User approved adapting the two upstream skills into ecc-work with
  evidence-first assignments, safe recovery and right-sized final reflection.
- 2026-11-25: Implemented personal contract, routed work/plan/view/bootstrap and
  artifact/phase/docs/scenarios; no runtime/hook/profile changes.
- 2026-11-25: Installation/static checks passed; independent review and three
  hypothetical stage/gate/small-task decisions completed without material findings.
- 2026-11-26: User authorized commit/push. Both isolated setup/install suites were
  rerun: 38 passed, zero failed/skipped. Fetch confirmed HEAD and origin/personal
  matched before the new commit; no DB, browser or application was accessed.
