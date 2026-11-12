'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRun, apply, snapshot } = require('../../scripts/lib/orchestration/model');

function task(id, extra = {}) {
  return { id, title: `Task ${id}`, kind: 'code', acceptance: ['Works'], scope: ['src'],
    dependsOn: [], inputs: [], validation: ['unit'],
    permissions: { database: 'none', executeTests: false }, ...extra };
}
function plan(tasks = [task('a')], extra = {}) {
  return { schemaVersion: 1, id: 'run-1', repoRoot: process.cwd(), baseRef: 'HEAD',
    approved: true, maxWorkers: 3, tasks, ...extra };
}
function claim(state, id, worker = id) { return apply(state, { action: 'claim', taskId: id, workerId: worker }); }
function result(extra = {}) {
  return { summary: 'Implemented', revision: 'abc123', artifacts: ['report.md'],
    checks: [{ name: 'unit', status: 'passed', evidence: 'unit output' }],
    changedFiles: ['src/a.js'], ...extra };
}
function submit(state, id, extra = {}) {
  return apply(state, { action: 'submit', taskId: id,
    attemptId: state.tasks.find(t => t.id === id).currentAttemptId, result: result(extra) });
}
function accept(state, id, extra = {}) {
  const t = state.tasks.find(t => t.id === id);
  return apply(state, { action: 'review', taskId: id, attemptId: t.currentAttemptId,
    outputHash: t.output.outputHash, revision: t.output.revision,
    verdict: 'approved', reviewer: 'integrator', evidence: 'Reviewed diff and tests',
    criteria: ['Works'], ...extra });
}

test('10 tasks with 3 slots admit only ready work and refill a slot without a batch barrier', () => {
  const tasks = ['a', 'b', 'c'].map(id => task(id));
  for (const id of ['d', 'e', 'f', 'g', 'h', 'i', 'j']) tasks.push(task(id, {
    dependsOn: [{ taskId: 'a', gate: 'integrated' }]
  }));
  let state = createRun(plan(tasks));
  state = claim(claim(claim(state, 'a'), 'b'), 'c');
  assert.throws(() => claim(state, 'd'), /ready|dependency|slot/i);
  const original = JSON.stringify(state);
  state = accept(submit(state, 'a'), 'a');
  state = apply(state, { action: 'integrate', taskId: 'a', attemptId: state.tasks[0].currentAttemptId,
    outputHash: state.tasks[0].output.outputHash, revision: state.tasks[0].output.revision,
    commit: '0123456789abcdef', integrator: 'integrator', evidence: 'Merged verified code' });
  assert.equal(JSON.parse(original).tasks[0].status, 'running');
  state = claim(state, 'd', 'a');
  assert.equal(snapshot(state).runningCount, 3);
  assert.equal(state.tasks.find(t => t.id === 'b').status, 'running');
  assert.equal(state.tasks.find(t => t.id === 'd').status, 'running');
  assert.throws(() => claim(state, 'e'), /slot|limit|concurr/i);
});

test('explicit ten-worker budget admits ten independent tasks while preserving the chosen limit', () => {
  const tasks = Array.from({ length: 11 }, (_, index) => task(`t${index}`));
  let state = createRun(plan(tasks, { maxWorkers: 10 }));
  for (const item of tasks.slice(0, 10)) state = claim(state, item.id);
  assert.equal(snapshot(state).runningCount, 10);
  assert.throws(() => claim(state, tasks[10].id), /slot|limit/i);
});

test('omitted budget follows task count instead of a fixed three-worker default', () => {
  const tasks = Array.from({ length: 10 }, (_, index) => task(`t${index}`));
  const input = plan(tasks);
  delete input.maxWorkers;
  assert.equal(createRun(input).maxWorkers, tasks.length);
  assert.equal(createRun({ ...input, tasks: [task('one')] }).maxWorkers, 1);
});

test('worker budgets require positive safe integers without an arbitrary eight-worker cap', () => {
  for (const maxWorkers of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '10', null]) {
    assert.throws(() => createRun(plan(undefined, { maxWorkers })), /maxWorkers/i);
  }
  assert.equal(createRun(plan(undefined, { maxWorkers: Number.MAX_SAFE_INTEGER })).maxWorkers,
    Number.MAX_SAFE_INTEGER);
});

test('integrated dependency stays blocked after acceptance until integration evidence exists', () => {
  let state = createRun(plan([task('a'), task('b', { dependsOn: [{ taskId: 'a', gate: 'integrated' }] })]));
  state = accept(submit(claim(state, 'a'), 'a'), 'a');
  assert.equal(state.tasks[1].status, 'pending');
  const t = state.tasks[0];
  assert.throws(() => apply(state, { action: 'integrate', taskId: 'a', attemptId: t.currentAttemptId,
    outputHash: t.output.outputHash, revision: t.output.revision,
    integrator: 'integrator', evidence: 'No actual commit' }), /commit/i);
  state = apply(state, { action: 'integrate', taskId: 'a', attemptId: t.currentAttemptId,
    outputHash: t.output.outputHash, revision: t.output.revision,
    commit: '0123456789abcdef', integrator: 'integrator', evidence: 'Merged verified commit abc123' });
  assert.equal(state.tasks[1].status, 'ready');
});

test('rejects malformed plans, cycles, path escapes and database permission escalation', () => {
  assert.throws(() => createRun(plan([task('a'), task('a')])), /unique|duplicate/i);
  assert.throws(() => createRun(plan([task('a', { dependsOn: [{ taskId: 'missing', gate: 'accepted' }] })])), /dependency|unknown/i);
  assert.throws(() => createRun(plan([task('a', { dependsOn: [{ taskId: 'a', gate: 'accepted' }] })])), /cycle|itself|self/i);
  assert.throws(() => createRun(plan([task('a', { dependsOn: [{ taskId: 'b', gate: 'integrated' }] }),
    task('b', { dependsOn: [{ taskId: 'a', gate: 'integrated' }] })])), /cycle/i);
  assert.throws(() => createRun(plan([task('a'), task('b', {
    dependsOn: [{ taskId: 'a', gate: 'accepted' }]
  })])), /code.*integrated/i);
  assert.doesNotThrow(() => createRun(plan([task('a'), task('b', { kind: 'review',
    dependsOn: [{ taskId: 'a', gate: 'accepted' }]
  })])));
  for (const scope of ['../outside', '.git/config', 'C:/secrets', '/root', 'src/../secret',
    '.git./config', 'src:secret', 'NUL.txt']) {
    assert.throws(() => createRun(plan([task('a', { scope: [scope] })])), /scope|path/i);
  }
  assert.throws(() => createRun(plan([task('a', { permissions: { database: 'read' } })])), /database/i);
  assert.throws(() => createRun(plan([], { maxWorkers: 0 })), /task|worker/i);
});

test('approval, pause, distinct worker assignment and unknown transitions are enforced', () => {
  assert.throws(() => claim(createRun(plan(undefined, { approved: false })), 'a'), /approv/i);
  const unapproved = createRun(plan(undefined, { approved: false }));
  assert.throws(() => apply(unapproved, { action: 'approve', approver: 'user' }), /evidence/i);
  const approved = apply(unapproved, { action: 'approve', approver: 'user', evidence: 'User approved plan' });
  assert.equal(claim(approved, 'a').tasks[0].status, 'running');
  assert.throws(() => apply(approved, { action: 'approve', approver: 'user', evidence: 'Again' }), /already/i);
  let state = createRun(plan([task('a'), task('b')]));
  state = apply(state, { action: 'pause' });
  assert.throws(() => claim(state, 'a'), /paus/i);
  state = apply(state, { action: 'resume' });
  state = claim(state, 'a', 'worker');
  assert.throws(() => claim(state, 'b', 'worker'), /worker|active/i);
  assert.throws(() => apply(state, { action: 'done', taskId: 'a' }), /action|command/i);
});

test('submission scope and review validate output identity, criteria and executed evidence', () => {
  let state = claim(createRun(plan()), 'a');
  assert.throws(() => submit(state, 'a', { changedFiles: ['other/file.js'] }), /scope/i);
  state = submit(state, 'a');
  assert.equal(state.tasks[0].status, 'needs_review');
  assert.throws(() => accept(state, 'a', { reviewer: 'a' }), /independent|reviewer|worker/i);
  assert.throws(() => accept(state, 'a', { outputHash: 'stale' }), /output|hash|stale/i);
  assert.throws(() => accept(state, 'a', { revision: 'old' }), /revision|stale/i);
  assert.throws(() => accept(state, 'a', { criteria: [] }), /acceptance|criteria/i);
  assert.equal(accept(state, 'a').tasks[0].status, 'accepted');
  for (const status of ['failed', 'not-run']) {
    const unverified = submit(claim(createRun(plan()), 'a'), 'a', {
      checks: [{ name: 'unit', status, evidence: 'not passed' }]
    });
    assert.throws(() => accept(unverified, 'a'), /validation|check|passed/i);
  }
});

test('retry preserves attempts and fences late output; cancelling blocks descendants', () => {
  let state = claim(createRun(plan([task('a'), task('b', { dependsOn: [{ taskId: 'a', gate: 'integrated' }] })])), 'a');
  const oldAttempt = state.tasks[0].currentAttemptId;
  state = apply(state, { action: 'fail', taskId: 'a', attemptId: oldAttempt, error: 'worker stopped' });
  state = apply(state, { action: 'retry', taskId: 'a', reason: 'Explicitly retry isolated operation' });
  state = claim(state, 'a');
  assert.notEqual(state.tasks[0].currentAttemptId, oldAttempt);
  assert.equal(state.tasks[0].attempts.length, 2);
  assert.throws(() => apply(state, { action: 'submit', taskId: 'a', attemptId: oldAttempt, result: result() }), /attempt|stale/i);
  state = apply(state, { action: 'cancel', taskId: 'a', reason: 'User cancelled' });
  assert.equal(state.tasks[1].status, 'pending');
  assert.throws(() => submit(state, 'a'), /running|cancel|state/i);
  assert.ok(snapshot(state).tasks[1].blockedReasons.length);
});

test('heartbeat is activity evidence, snapshot is detached and event sequence monotonic', () => {
  let state = claim(createRun(plan()), 'a');
  state = apply(state, { action: 'heartbeat', taskId: 'a', attemptId: state.tasks[0].currentAttemptId });
  assert.ok(state.tasks[0].attempts[0].lastActivityAt);
  const view = snapshot(state);
  view.tasks[0].title = 'Changed outside';
  assert.equal(state.tasks[0].title, 'Task a');
  assert.ok(state.events.every((e, i) => i === 0 || e.seq > state.events[i - 1].seq));
});

test('1000 heartbeats update activity without growing event history or sequence', () => {
  let state = claim(createRun(plan()), 'a');
  const seq = state.seq;
  const count = state.events.length;
  for (let i = 0; i < 1000; i += 1) {
    state = apply(state, { action: 'heartbeat', taskId: 'a', attemptId: state.tasks[0].currentAttemptId });
  }
  assert.equal(state.seq, seq);
  assert.equal(state.events.length, count);
  assert.ok(state.tasks[0].attempts[0].lastActivityAt);
});

test('old transition events are bounded with explicit drop count and monotonic sequence', () => {
  let state = createRun(plan());
  for (let i = 0; i < 1100; i += 1) state = apply(state, { action: i % 2 ? 'resume' : 'pause' });
  assert.equal(state.events.length, 1000);
  assert.equal(state.seq, 1101);
  assert.equal(state.droppedEvents, 101);
  assert.equal(state.events[0].seq, 102);
  assert.equal(state.events.at(-1).seq, 1101);
  assert.doesNotThrow(() => snapshot(state));
});

module.exports = { task, plan };
