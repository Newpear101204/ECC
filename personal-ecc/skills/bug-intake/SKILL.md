---
name: bug-intake
description: Normalize and triage a tester's bug report before diagnosis or repair. Use when asked to receive a bug, identify missing information, assess impact and severity, or prepare a report for the next investigation step.
metadata:
  origin: Personal ECC
---

# Bug Intake

Turn a tester's report into an evidence-aware intake record that the user can
review before deciding the next step. Write the record in the user's conversation
language unless requested otherwise.

## Scope and Boundaries

This stage normalizes and assesses the report. It does not reproduce the bug,
diagnose a root cause, plan a code change, or fix anything. Do not run application
commands, tests, or deployments. Read supplied artifacts and relevant requirements
or existing tickets when available and authorized. Do not explore implementation
code to speculate about a cause.

Record live/production versus beta, the relevant record/request identifiers,
tenant or account scope, and occurrence time from the report and conversation.
Preserve the environment for later stages of this same bug; do not inherit it from
an unrelated bug. If missing or conflicting, record the gap and clarify when it
blocks diagnosis. Do not query MCP databases during intake or infer data defects
from identifiers alone. Hand off the specific data questions for diagnosis.

Return the intake record in the conversation by default. Reuse an existing bug ID;
if none exists, leave it unassigned instead of inventing a ticket number. Do not
create project files or update, merge, close, prioritize, or assign remote tickets
unless the user explicitly requests those actions. Drafting a severity or priority
recommendation is allowed; distinguish it from changing the actual ticket.

End after intake. Recommend the next stage without invoking another workflow.
Do not assume that a later-stage skill exists or that a complete report authorizes
implementation. If the user supplies answers later, update this same intake rather
than discarding previously established evidence.

## 1. Normalize the Available Evidence

Accept ticket text, conversation, screenshots, recordings, logs, and supplied
references. Read the available material before asking for details it may contain.
If an attachment or ticket cannot be accessed, state that limitation.

Extract the following where relevant:

| Field | What to capture |
|---|---|
| Summary | Affected capability and observable symptom, without a guessed cause |
| Expected behavior | Expected outcome and its source: requirement, design, agreed rule, or tester expectation |
| Actual behavior | Reported outcome, visible error, or incorrect result |
| Context | Live/production or beta environment/build, user role, relevant device/browser, tenant/account scope, and necessary data conditions |
| Reported steps | Preconditions, actions, and the step where the symptom appears |
| Frequency | Attempts and occurrences if known; preserve approximate wording otherwise |
| Evidence | Source references, timestamps, record/request IDs, or relevant excerpts |
| Impact | Affected work, reported users/data, workaround, and recoverability |

For material claims, distinguish **reported**, **supported by supplied evidence**,
and **unverified/unknown**. Link claims to their source when possible. Evidence
supports only what it shows: one screenshot cannot establish all-user impact or
frequency. A log error alone does not establish the bug's root cause. Keep
conflicting accounts visible instead of silently choosing one.

Do not invent missing versions, counts, steps, requirements, or technical causes.
Reference sensitive artifacts by location or identifier; omit credentials and
unnecessary personal data from the intake record.

## 2. Identify Decision-Relevant Gaps

Evaluate whether each unknown would block useful diagnosis, prevent a focused
check, or materially change classification or scope. Do not demand every possible field.

| Gap | When it matters | Targeted clarification |
|---|---|---|
| Expected behavior or its basis | Cannot distinguish a defect from an undefined or changed requirement | Which outcome is expected, and according to which requirement or agreed rule? |
| Build/environment | Investigator may test a different version or configuration | Which build and environment produced this occurrence? |
| Preconditions/actions | No concrete starting point for reproduction | What happened immediately before the symptom, and where did it first differ? |
| Role/data | The occurrence may depend on permissions, state, or a specific record | Which role and data conditions were involved? Request identifiers rather than secrets. |
| Intermittent occurrence | Timing or correlation is needed to investigate | When did it last occur, and how many attempts failed if known? |
| Breadth/consequence | Severity or urgency could change | Which users/records were actually checked, what work is blocked, and is there a practical workaround? |

Separate **blocking gaps** from **useful follow-up details**. A concrete example
can be enough to proceed even when total prevalence is unknown. A mismatch between
accounts may require clarification, but does not invalidate the reported incident.

Present the current record even when incomplete. Ask one consolidated batch of
specific questions for blocking gaps, explaining briefly what each answer unlocks.
List nonblocking unknowns without making them mandatory. Never ask the user to
re-enter details already supplied or independently accessible in the given scope.

## 3. Assess Impact and Propose Severity

Use the team's documented rubric if available. Otherwise use the provisional
rubric below without presenting it as a universal standard or mapping it to
P0/P1/S1 labels that the team has not defined.

Consider consequence, importance of the affected workflow, breadth, practicality
of a workaround, recoverability, and conditions/frequency. Explain which factors
drive the assessment. Low frequency does not make data loss low severity; broad
reach does not automatically make a cosmetic issue critical.

| Provisional severity | Typical consequence |
|---|---|
| Critical | Core service or workflow unusable, loss/corruption of important data, or unauthorized access with severe consequences |
| High | Important functionality blocked or materially incorrect with no practical workaround |
| Medium | Partial functional failure with a practical way to continue the work |
| Low | Cosmetic defect or minor inconvenience with little effect on the outcome |

State the supporting evidence and unknowns for every proposed severity. Use
**provisional**, a conditional assessment, or **undetermined** when necessary.
Do not infer a practical workaround merely because an alternative seems possible.
For a reported severe consequence that remains unverified, flag the potential
urgency promptly while clearly labeling the claim as unverified; do not wait for
every intake field or claim the consequence has been established.

## 4. Keep Priority Separate

Severity describes consequences; priority describes scheduling urgency. Priority
also depends on active exposure, releases, customer commitments, deadlines, and
other work. Preserve any existing labels as their source's assessment.

Recommend priority only when the relevant context is available, using the team's
rubric and explaining the recommendation. Otherwise state **not yet determined**
and identify the missing scheduling context. Do not invent deadlines or automatically
equate a severity level to a priority level.

## 5. Check Classification and Possible Duplicates

When existing tickets are accessible within scope, compare symptom, affected
capability, conditions/build, data, and evidence. A matching title or error string
is not enough to establish a duplicate. Cite candidate IDs and explain similarities,
differences, and uncertainty. Without access, mark the duplicate check **not performed**.

If the expected behavior is undefined or disputed, use **needs requirement
clarification**; do not dismiss the tester or label a feature request as a confirmed
bug. Treat a suspected duplicate as a flag requiring review, not permission to
close the report. Keep any blocking gaps visible even when a duplicate is suspected.

## 6. Return the Intake and Stop

Use a concise record proportional to the report:

- Bug ID/reference and summary.
- Expected behavior and its basis; actual behavior.
- Reported context, preconditions, steps, frequency, and evidence provenance.
- Impact: known consequences/breadth, workaround, recoverability, and unknowns.
- Proposed severity with rationale and uncertainty; priority separately.
- Classification/duplicate assessment and whether a search was possible.
- Blocking gaps with targeted questions; nonblocking details separately.
- Disposition and recommended next action, with the handoff context preserved.

Choose **ready for diagnosis**, **needs information**, **needs requirement
clarification**, or **suspected duplicate** as the disposition. For a suspected
duplicate, separately state whether the report is ready for diagnosis or still
blocked. "Ready" means enough information to start investigation, not that the
bug has been reproduced or its cause confirmed. Ask for clarification only when
needed; a complete report can end with a recommendation for the user to review.

Do not advance into diagnosis, repair, or tester handoff from this intake stage.
Diagnosis is the next stage under the user's control; any useful reproduction
happens inside diagnosis rather than through a separate required skill.
