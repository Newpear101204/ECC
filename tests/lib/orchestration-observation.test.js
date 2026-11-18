'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRun, apply, snapshot } = require('../../scripts/lib/orchestration/model');
const { createObservation, applyObservation, validateObservation, projectObservation } = require('../../scripts/lib/orchestration/observation-model');

function init() { return createObservation(); }
function record(state, type, fields = {}) {
  return applyObservation(state, { type, evidence: 'Recorded tool or coordinator evidence', ...fields });
}
function item(id, extra = {}) {
  return { id, title: `Work ${id}`, phase: 'implementation', owner: 'agent',
    acceptance: ['Meets contract'], validation: ['unit'], ...extra };
}
function planned(items = [item('a')]) {
  const state = record(init(), 'plan', { title: 'Feature', reference: 'BA#1', version: 'v1', summary: 'Approved scope' });
  return record(state, 'work-add', { items });
}
function prepared(state, itemId = 'a', workerId = '/root/writer') {
  return record(state, 'prepare', { itemId, workerId });
}
function dispatch(state, itemId = 'a') {
  const work = state.items.find(row => row.id === itemId);
  return record(state, 'dispatch', { itemId, attemptId: work.currentAttemptId,
    provider: 'native-subagent', tool: 'spawn_agent', agentRef: '/root/writer', reference: 'tool-call-42' });
}
function result(state, itemId = 'a', checks = [{ name: 'unit', status: 'passed', evidence: 'Mock test command passed' }]) {
  const work = state.items.find(row => row.id === itemId);
  return record(state, 'result', { itemId, attemptId: work.currentAttemptId,
    result: { summary: 'Completed work', revision: 'revision-1', artifacts: [], checks } });
}
function review(state, itemId = 'a', extra = {}) {
  const work = state.items.find(row => row.id === itemId);
  return record(state, 'review', { itemId, attemptId: work.currentAttemptId,
    revision: work.output.revision, outputHash: work.output.outputHash,
    reviewer: '/root/reviewer', verdict: 'approved', criteria: ['Meets contract'], ...extra });
}

test('observation-only intake accepts no execution tasks but old runs do not', () => {
  const plan = { schemaVersion: 1, id: 'feature-watch', repoRoot: process.cwd(), baseRef: 'HEAD',
    tasks: [], approved: false, observationOnly: true };
  const state = createRun(plan);
  assert.equal(state.observationOnly, true);
  assert.equal(state.maxWorkers, 1);
  assert.equal(snapshot(state).observability.summary.total, 0);
  assert.throws(() => createRun({ ...plan, observationOnly: false }), /tasks/i);
  assert.throws(() => createRun({ ...plan, approved: true }), /approval|approved/i);
  const next = apply(state, { action: 'observe', event: { type: 'plan', title: 'Intake',
    reference: 'user request', version: 'draft', summary: 'No implementation authority', evidence: 'User provided input' } });
  assert.equal(next.approved, false);
  assert.equal(state.observability.plan, null);
  assert.equal(next.observability.plan.version, 'draft');
});

test('main activity, planned work, prepared work and real dispatch are distinct recorded facts', () => {
  let state = planned([item('a'), item('main', { owner: 'main', phase: 'planning', validation: [] })]);
  const before = JSON.stringify(state);
  state = prepared(state);
  assert.equal(projectObservation(state).summary.preparedAwaitingDispatch, 1);
  assert.equal(projectObservation(state).summary.dispatchRecorded, 0);
  assert.equal(JSON.parse(before).items[0].status, 'planned');
  state = dispatch(state);
  assert.equal(state.items[0].attempts[0].dispatch.reference, 'tool-call-42');
  state = prepared(state, 'main', 'main-ai');
  state = record(state, 'progress', { itemId: 'main', attemptId: 'main-1', summary: 'Consolidating plan' });
  const view = projectObservation(state);
  assert.equal(view.summary.dispatchRecorded, 1);
  assert.equal(view.summary.mainWorking, 1);
  assert.ok(view.summary.warnings.some(warning => /liveness|alive/i.test(warning)));
  assert.equal(view.items[1].status, 'working');
});

test('phase decisions and plan revisions retain reasons and proposed-versus-actual evidence', () => {
  let state = planned([item('a'), item('b')]);
  state = record(state, 'phase', { phase: 'planning', mode: 'sequential', reason: 'Shared contract awaits decision', ready: [], blocked: [{ itemId: 'a', reason: 'Contract' }] });
  state = record(state, 'phase', { phase: 'implementation', mode: 'parallel', reason: 'Independent scopes now ready', ready: ['a', 'b'], blocked: [] });
  state = record(state, 'work-revise', { itemId: 'b', reason: 'Split ownership after source survey', changes: { title: 'Independent screen B', scope: ['frontend/b'] } });
  assert.equal(state.decisions.length, 2);
  assert.equal(projectObservation(state).summary.currentPhase, 'implementation');
  assert.equal(state.changes[0].reason, 'Split ownership after source survey');
  assert.equal(state.changes[0].before.title, 'Work b');
  assert.equal(state.items[1].title, 'Independent screen B');
  assert.equal(state.events.at(-1).type, 'work-revise');
});

test('observation dependencies cannot be bypassed and invalid graphs never replace state', () => {
  let state = planned([item('a'), item('b', { dependsOn: ['a'] })]);
  assert.throws(() => prepared(state, 'b'), /depend|ready/i);
  assert.throws(() => record(state, 'work-revise', { itemId: 'a', reason: 'bad graph', changes: { dependsOn: ['b'] } }), /cycle/i);
  assert.throws(() => record(state, 'work-add', { items: [item('c', { dependsOn: ['missing'] })] }), /depend/i);
  state = review(result(dispatch(prepared(state))));
  assert.equal(prepared(state, 'b').items[1].status, 'prepared');
});

test('phase ready records require currently planned, dependency-ready work in that phase', () => {
  const decision = (state, ready, extra = {}) => record(state, 'phase', {
    phase: 'implementation', mode: 'parallel', reason: 'Assess current readiness', ready, blocked: [], ...extra
  });
  let state = planned([item('a'), item('b', { dependsOn: ['a'] })]);
  assert.throws(() => decision(state, ['b']), /depend|ready/i);
  assert.throws(() => decision(state, ['a'], { blocked: [{ itemId: 'a', reason: 'Unresolved question' }] }), /ready|blocked|disjoint/i);
  assert.throws(() => decision(state, ['a'], { phase: 'planning' }), /phase/i);
  state = decision(state, ['a']);
  state = prepared(state);
  assert.throws(() => decision(state, ['a']), /planned|ready/i);
  state = record(state, 'fail', { itemId: 'a', attemptId: 'a-1', reason: 'Worker failed' });
  assert.throws(() => decision(state, ['a']), /planned|ready/i);
  state = record(state, 'retry', { itemId: 'a', reason: 'New attempt authorized' });
  state = review(result(dispatch(prepared(state))));
  assert.throws(() => decision(state, ['a']), /planned|ready/i);
  state = decision(state, ['b']);
  state = record(state, 'cancel', { itemId: 'b', reason: 'Scope withdrawn' });
  assert.throws(() => decision(state, ['b']), /planned|ready/i);
  assert.doesNotThrow(() => validateObservation(state), 'Historical ready decisions remain valid after work changes state');
  const waiting = record(planned(), 'wait', { itemId: 'a', waitingFor: 'user', reason: 'Needs business input' });
  assert.throws(() => decision(waiting, ['a']), /planned|ready/i);
});

test('persisted phase decisions reject overlapping or duplicate blockers without reevaluating historical readiness', () => {
  const state = record(planned(), 'phase', { phase: 'implementation', mode: 'direct',
    reason: 'Ready at this point', ready: ['a'], blocked: [] });
  const overlap = structuredClone(state);
  overlap.decisions[0].blocked = [{ itemId: 'a', reason: 'Contradictory recorded state' }];
  assert.throws(() => validateObservation(overlap), /ready|blocked|disjoint/i);
  const duplicate = structuredClone(state);
  duplicate.decisions[0].ready = [];
  duplicate.decisions[0].blocked = [{ itemId: 'a', reason: 'One' }, { itemId: 'a', reason: 'Two' }];
  assert.throws(() => validateObservation(duplicate), /duplicate|blocker/i);
});

test('agent result requires dispatch, pins output and requires independent evidence-based acceptance', () => {
  let state = prepared(planned());
  assert.throws(() => result(state), /dispatch|started|prepared/i);
  state = result(dispatch(state));
  assert.equal(state.items[0].status, 'result_received');
  assert.match(state.items[0].output.outputHash, /^[a-f0-9]{64}$/);
  assert.throws(() => review(state, 'a', { reviewer: '/root/writer' }), /independent/i);
  assert.throws(() => review(state, 'a', { outputHash: 'stale' }), /hash|identity/i);
  assert.throws(() => review(state, 'a', { criteria: [] }), /criteria|acceptance/i);
  state = review(state);
  assert.equal(state.items[0].status, 'accepted');
  const work = state.items[0];
  state = record(state, 'integration', { itemId: 'a', attemptId: 'a-1', revision: work.output.revision,
    outputHash: work.output.outputHash, integrator: 'main-ai', commit: 'a'.repeat(40) });
  assert.equal(state.items[0].status, 'integrated');
  assert.ok(projectObservation(state).summary.warnings.some(warning => /recorded|verified/i.test(warning)));
});

test('unrun required checks cannot be promoted into approved review', () => {
  const state = result(dispatch(prepared(planned())), 'a', [{ name: 'unit', status: 'not-run', evidence: 'No execution permission' }]);
  assert.throws(() => review(state), /validation|passed/i);
  assert.equal(review(state, 'a', { verdict: 'changes_requested' }).items[0].status, 'changes_requested');
});

test('retry preserves attempts and fences late results and revisions after review', () => {
  let state = result(dispatch(prepared(planned())));
  state = review(state, 'a', { verdict: 'changes_requested' });
  state = record(state, 'retry', { itemId: 'a', reason: 'Address review finding' });
  state = prepared(state);
  assert.equal(state.items[0].currentAttemptId, 'a-2');
  assert.equal(state.items[0].attempts[0].review.verdict, 'changes_requested');
  assert.throws(() => record(state, 'progress', { itemId: 'a', attemptId: 'a-1', summary: 'Late' }), /stale|attempt/i);
  state = record(state, 'cancel', { itemId: 'a', reason: 'User changed scope' });
  assert.throws(() => dispatch(state), /status|state|prepared/i);
});

test('wait and session records do not claim worker termination or authorize new starts', () => {
  let state = prepared(planned());
  state = record(state, 'wait', { itemId: 'a', attemptId: 'a-1', waitingFor: 'business-input', reason: 'BA and existing flow disagree' });
  assert.equal(projectObservation(state).summary.waiting, 1);
  state = record(state, 'session', { status: 'ended' });
  assert.throws(() => record(state, 'dispatch', { itemId: 'a', attemptId: 'a-1', provider: 'native', tool: 'spawn', agentRef: 'id', reference: 'tool' }), /session|active/i);
  assert.ok(projectObservation(state).summary.warnings.some(warning => /stop|terminat|session/i.test(warning)));
});

test('persisted forged receipts and malformed observations are rejected', () => {
  const state = review(result(dispatch(prepared(planned()))));
  const broken = JSON.parse(JSON.stringify(state));
  broken.items[0].output.summary = 'Changed after review';
  assert.throws(() => validateObservation(broken), /hash|identity/i);
  assert.throws(() => record(state, 'phase', { phase: 'all', mode: 'parallel', reason: 'guess', ready: [], blocked: [] }), /phase/i);
  assert.throws(() => record(init(), 'plan', { title: 'X', reference: 'X', version: 'X', summary: '', evidence: '' }), /evidence/i);
});

test('timeline is bounded with a monotonic sequence and dropped count', () => {
  let state = init();
  for (let index = 0; index < 520; index++) state = record(state, 'session', { status: 'active' });
  assert.equal(state.events.length, 500);
  assert.equal(state.seq, 520);
  assert.equal(state.droppedEvents, 20);
  assert.equal(state.events[0].seq, 21);
  assert.equal(validateObservation(state), state);
});

test('observed acceptance never advances or approves an existing execution task', () => {
  let state = createRun({ schemaVersion: 1, id: 'linked', repoRoot: process.cwd(), baseRef: 'HEAD',
    approved: false, tasks: [{ id: 'EXEC', title: 'Real code task', kind: 'code', scope: ['src'],
      acceptance: ['Works'], validation: ['unit'], permissions: { database: 'none', executeTests: false } }] });
  const originalTasks = JSON.stringify(state.tasks);
  for (const event of [
    { type: 'plan', title: 'Observed plan', reference: 'BA', version: 'v1', summary: 'Tracking only' },
    { type: 'work-add', items: [item('a', { taskId: 'EXEC' })] },
    { type: 'prepare', itemId: 'a', workerId: '/root/writer' },
    { type: 'dispatch', itemId: 'a', attemptId: 'a-1', provider: 'native', tool: 'spawn_agent', agentRef: '/root/writer', reference: 'tool-receipt' },
    { type: 'result', itemId: 'a', attemptId: 'a-1', result: { summary: 'Reported result', revision: 'obs-revision', checks: [{ name: 'unit', status: 'passed', evidence: 'Reported mock result' }], artifacts: [] } }
  ]) state = apply(state, { action: 'observe', event: { ...event, evidence: 'Coordinator record' } });
  const work = state.observability.items[0];
  state = apply(state, { action: 'observe', event: { type: 'review', itemId: 'a', attemptId: 'a-1',
    reviewer: '/root/reviewer', verdict: 'approved', criteria: ['Meets contract'],
    revision: work.output.revision, outputHash: work.output.outputHash, evidence: 'Observed review only' } });
  assert.equal(state.observability.items[0].status, 'accepted');
  assert.equal(JSON.stringify(state.tasks), originalTasks);
  assert.equal(state.approved, false);
  assert.throws(() => apply(state, { action: 'claim', taskId: 'EXEC', workerId: 'writer' }), /approval/i);
  assert.throws(() => apply(state, { action: 'observe', event: { type: 'work-add',
    items: [item('bad', { taskId: 'MISSING' })], evidence: 'Unknown link' } }), /linked|execution task/i);
});
