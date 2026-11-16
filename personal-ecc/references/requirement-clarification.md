# Business Clarification and Technical Autonomy

Apply this distinction to every task, skill and stage. The user decides unresolved
requirements, desired outputs and business workflows. The AI owns the engineering
needed to deliver those agreed results. The filename is retained for existing links.

## Ask About Business Intent

Ask when supplied inputs disagree, an input leaves required behavior undefined,
or new requirements conflict with an existing business flow without an approved
decision explaining the change. Relevant evidence includes BA/design, historical
documents, contracts, tests, observed behavior and actual code/consumers.

Do not silently choose which business rule to keep, remove or invent. Do not
assume BA always outranks design, current code defines desired behavior, tests
are automatically authoritative, or newer documents have approval. Read relevant
evidence within authority, cite actual facts/versions and disclose unavailable
sources. Investigation can establish how the system works, not invent an answer
to an unresolved question about how it should work.

A clearly requested change may intentionally replace old behavior; no duplicate
question is needed just because the code differs. Ask when the intended result
or business effect on old flows remains uncertain. Small/direct tasks and generic
"implement" approval do not resolve an undisclosed or newly found business conflict.

## Decide Engineering Autonomously

For settled requirements/output, choose architecture, libraries, algorithms,
component boundaries, shared/local corrections, refactoring, test implementation,
technical compatibility strategies and other engineering tradeoffs. Alternatives
need not be equivalent or already established by convention for the AI to choose.

Investigate technical discrepancies, weigh maintainability/correctness/performance,
choose a defensible solution, check it as authorized and explain consequential
choices. The main AI resolves technical disagreements among workers/reviewers;
do not ask the user to arbitrate an engineering debate that preserves the agreed
business result and stays within granted scope.

A test failure is not automatically a product question: if approved behavior is
clear, correct the implementation or defective test based on evidence. Ask only
if the intended business result cannot be established from the approved sources.
Likewise, shared/local code choices need no user selection unless they change
or depend on an unresolved business outcome, exceed the agreed work scope or
need authority not yet granted.

Technical autonomy never authorizes forbidden DB operations, arbitrary execution,
publication, migrations or changes outside explicit user constraints. Missing
permission/target is an authorization issue; use the host's normal approval or
clarification mechanism when needed, not an inference of permission.

## Ask a Focused Question and Hold Only Dependent Work

Present the established facts and sources, the unresolved business meanings, their
effects and the specific answer needed. A recommendation may be offered with
reasoning but is not approval. Group related questions and allow another answer.

Apply explicit applicable answers or source precedence already given without
re-asking. Silence, elapsed time and generic approval do not settle new business
intent. Do not turn an assumption into acceptance criteria or expected assertions.

Hold affected plan commitments, edits, assertions and worker work until answered;
continue independent authorized work. Workers escalate business uncertainty to
the main AI, which asks the user and records/passes the decision to affected
workers and reviewers. Workers escalate technical issues to the main AI when
coordination is needed; the main AI decides those without automatically asking
the user. Runtime ready status does not certify business clarity.

Use the existing plan/handoff to record pending business questions and actual
answers; no new board is needed for a small task. If code already embodies an
unconfirmed business guess, disclose it and ask instead of silently switching
to the opposite guess.

## Examples

| Situation | Action |
|---|---|
| BA says one selected-task input, design shows two | Ask which business interaction is intended |
| New requirement omits a notification rule used by the old business flow | Ask whether the rule must remain or change after inspecting evidence |
| Same approved behavior can use a shared helper or a local adapter | AI selects the technical implementation and explains/checks effects |
| Worker proposes a library, reviewer proposes custom code, both satisfy requirements | Main AI assesses technical tradeoffs and decides |
| Test and approved contract differ; intended behavior is clear | AI fixes the incorrect implementation/test with evidence, within execution rights |
| Test/contract/code disagree and intended business semantics are not established | Ask about the expected business result before defining assertions |
| Backend error mapping is technically awkward but required output is settled | AI solves it; no user question just to choose a coding technique |
| A technically convenient solution would change an unresolved user-visible workflow | Ask about the workflow; do not label the product decision technical |
| User explicitly chose a technical approach or forbade a dependency | Honor that constraint; autonomy does not override the user's decision |
