'use strict';

const crypto = require('node:crypto');
const { assert, text, id, strings, safePath, normalizeTask, checkGraph, validateState } = require('./model-validation');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function now() { return new Date().toISOString(); }

function dependencies(state, task) {
  return task.dependsOn.filter(dep => {
    const parent = state.tasks.find(t => t.id === dep.taskId);
    return dep.gate === 'accepted'
      ? !['accepted', 'integrated'].includes(parent.status)
      : parent.status !== 'integrated';
  }).map(dep => `${dep.taskId} must be ${dep.gate}`);
}

function refresh(state) {
  for (const task of state.tasks) {
    if (['pending', 'ready'].includes(task.status)) {
      task.status = dependencies(state, task).length ? 'pending' : 'ready';
    }
  }
  return state;
}

function event(state, command) {
  state.seq += 1;
  state.updatedAt = now();
  state.events.push({ seq: state.seq, at: state.updatedAt, action: command.action,
    taskId: command.taskId || null, attemptId: command.attemptId || null,
    reason: typeof command.reason === 'string' ? command.reason : null });
  if (state.events.length > 1000) state.events = state.events.slice(-1000);
  state.droppedEvents = state.seq - state.events.length;
}

function createRun(plan) {
  assert(plan && plan.schemaVersion === 1, 'Invalid plan schema version');
  assert(Array.isArray(plan.tasks) && plan.tasks.length > 0 && plan.tasks.length <= 256, 'Invalid plan tasks');
  assert(plan.approved === undefined || typeof plan.approved === 'boolean', 'Invalid plan approval');
  const tasks = plan.tasks.map(raw => ({ ...normalizeTask(raw), status: 'pending',
    attempts: [], currentAttemptId: null, output: null, review: null, integration: null }));
  checkGraph(tasks);
  const state = { schemaVersion: 1, id: id(plan.id, 'run id'), repoRoot: text(plan.repoRoot, 'repoRoot'),
    baseRef: text(plan.baseRef, 'baseRef'), approved: plan.approved ?? false,
    // The coordinator supplies a host-aware budget; omitted legacy budgets use
    // the finite task count, never a fixed concurrency preference.
    maxWorkers: plan.maxWorkers === undefined ? tasks.length : plan.maxWorkers,
    paused: false, tasks, events: [], seq: 0, droppedEvents: 0,
    createdAt: now(), updatedAt: now() };
  validateState(state);
  event(state, { action: 'created' });
  return refresh(state);
}

function getTask(state, command) {
  const task = state.tasks.find(t => t.id === command.taskId);
  assert(task, `Unknown task: ${command.taskId}`);
  return task;
}

function current(task, command, statuses) {
  assert(statuses.includes(task.status), `Invalid task state: ${task.status}`);
  assert(command.attemptId && command.attemptId === task.currentAttemptId, 'Stale or missing attempt identity');
  const attempt = task.attempts.find(a => a.id === task.currentAttemptId);
  assert(attempt, 'Unknown attempt');
  return attempt;
}

function setStatus(task, attempt, status) {
  task.status = status;
  attempt.status = status;
  attempt.lastActivityAt = now();
}

function claim(state, task, command) {
  assert(state.approved, 'Run requires approval before claiming');
  assert(!state.paused, 'Run is paused');
  assert(task.status === 'ready', `Task must be ready; current state ${task.status}`);
  const active = state.tasks.filter(t => t.status === 'running');
  assert(active.length < state.maxWorkers, 'Worker slot limit reached');
  id(command.workerId, 'worker id');
  assert(!active.some(t => t.attempts.find(a => a.id === t.currentAttemptId).workerId === command.workerId), 'Worker already has an active task');
  if (command.worktree !== undefined) text(command.worktree, 'worktree', 2048);
  if (command.baseRevision !== undefined) text(command.baseRevision, 'base revision', 200);
  const attempt = { id: `${task.id}-${task.attempts.length + 1}`, workerId: command.workerId,
    status: 'running', worktree: command.worktree || null, baseRevision: command.baseRevision || state.baseRef,
    startedAt: now(), lastActivityAt: now(), result: null, review: null };
  task.currentAttemptId = attempt.id;
  task.attempts.push(attempt);
  task.status = 'running';
}

function normalizeResult(task, raw) {
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid result');
  const changedFiles = strings(raw.changedFiles || [], 'changedFiles').map(p => safePath(p, 'changed file path'));
  assert(changedFiles.every(file => task.scope.some(scope => file === scope || file.startsWith(`${scope}/`))), 'Changed file outside task scope');
  assert(task.kind === 'code' || changedFiles.length === 0, 'Read-only task cannot submit changed files');
  assert(Array.isArray(raw.checks) && raw.checks.length <= 256, 'Invalid result checks');
  const checks = raw.checks.map(check => {
    assert(check && ['passed', 'failed', 'not-run'].includes(check.status), 'Invalid check status');
    return { name: text(check.name, 'check name', 200), status: check.status,
      evidence: typeof check.evidence === 'string' ? check.evidence : '' };
  });
  assert(new Set(checks.map(c => c.name)).size === checks.length, 'Duplicate validation check');
  const result = { summary: text(raw.summary, 'result summary'), revision: text(raw.revision, 'result revision', 200),
    artifacts: strings(raw.artifacts || [], 'artifacts').map(p => safePath(p, 'artifact path')),
    checks, changedFiles };
  return { ...result, outputHash: crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex') };
}

function outputIdentity(task, command) {
  assert(task.output && command.outputHash === task.output.outputHash, 'Stale or missing output hash');
  assert(command.revision === task.output.revision, 'Stale output revision');
}

function submit(task, command) {
  const attempt = current(task, command, ['running']);
  task.output = normalizeResult(task, command.result);
  attempt.result = clone(task.output);
  setStatus(task, attempt, 'needs_review');
}

function review(task, command) {
  const attempt = current(task, command, ['needs_review']);
  outputIdentity(task, command);
  const reviewer = text(command.reviewer, 'reviewer', 200);
  assert(reviewer !== attempt.workerId, 'An independent reviewer must differ from the worker');
  assert(['approved', 'changes_requested'].includes(command.verdict), 'Invalid review verdict');
  const criteria = strings(command.criteria, 'review criteria');
  if (command.verdict === 'approved') {
    assert(task.acceptance.every(item => criteria.includes(item)), 'Review must cover all acceptance criteria');
    assert(task.validation.every(name => task.output.checks.some(check => check.name === name &&
      check.status === 'passed' && check.evidence.trim())), 'Required validation checks must have passed evidence');
  }
  task.review = { reviewer, evidence: text(command.evidence, 'review evidence'),
    verdict: command.verdict, criteria, revision: command.revision,
    outputHash: command.outputHash, at: now() };
  attempt.review = clone(task.review);
  setStatus(task, attempt, command.verdict === 'approved' ? 'accepted' : 'changes_requested');
}

function integrate(task, command) {
  const attempt = current(task, command, ['accepted']);
  outputIdentity(task, command);
  assert(task.review && task.review.verdict === 'approved', 'Integration requires approved review');
  if (task.kind === 'code' || command.commit !== undefined) text(command.commit, 'integration commit', 200);
  task.integration = { revision: command.revision, outputHash: command.outputHash,
    commit: command.commit || null, integrator: text(command.integrator, 'integrator', 200),
    evidence: text(command.evidence, 'integration evidence'), at: now() };
  setStatus(task, attempt, 'integrated');
}

function taskAction(state, command) {
  const task = getTask(state, command);
  if (command.action === 'claim') return claim(state, task, command);
  if (command.action === 'submit') return submit(task, command);
  if (command.action === 'review') return review(task, command);
  if (command.action === 'integrate') return integrate(task, command);
  if (command.action === 'heartbeat') {
    current(task, command, ['running']).lastActivityAt = now();
    return;
  }
  if (command.action === 'fail') {
    const attempt = current(task, command, ['running']);
    attempt.error = text(command.error, 'failure reason');
    setStatus(task, attempt, 'failed');
    return;
  }
  if (command.action === 'retry') {
    assert(['failed', 'changes_requested'].includes(task.status), 'Retry requires failed or changes_requested task');
    text(command.reason, 'retry reason');
    task.status = 'pending';
    task.currentAttemptId = null;
    task.output = null;
    task.review = null;
    task.integration = null;
    return;
  }
  if (command.action === 'cancel') {
    assert(!['accepted', 'integrated', 'cancelled'].includes(task.status), 'Cannot cancel accepted, integrated or cancelled task');
    task.cancelReason = text(command.reason, 'cancel reason');
    const attempt = task.attempts.find(a => a.id === task.currentAttemptId);
    if (attempt) setStatus(task, attempt, 'cancelled');
    else task.status = 'cancelled';
    return;
  }
  throw new Error(`Unknown orchestration action: ${command.action}`);
}

function apply(original, command) {
  validateState(original);
  assert(command && typeof command.action === 'string', 'Invalid command');
  const state = refresh(clone(original));
  if (command.action === 'pause') state.paused = true;
  else if (command.action === 'resume') state.paused = false;
  else if (command.action === 'approve') {
    assert(!state.approved, 'Run is already approved');
    state.approval = { approver: text(command.approver, 'approver', 200),
      evidence: text(command.evidence, 'approval evidence'), at: now() };
    state.approved = true;
  } else taskAction(state, command);
  if (command.action === 'heartbeat') state.updatedAt = now();
  else event(state, command);
  refresh(state);
  validateState(state);
  return state;
}

function snapshot(original) {
  validateState(original);
  const state = refresh(clone(original));
  state.tasks = state.tasks.map(task => ({ ...task, blockedReasons: [
    ...dependencies(state, task),
    ...(!state.approved && task.status === 'ready' ? ['Run requires approval'] : []),
    ...(state.paused && task.status === 'ready' ? ['Run is paused'] : [])
  ] }));
  return { ...state, runningCount: state.tasks.filter(t => t.status === 'running').length,
    readyTaskIds: state.approved && !state.paused ? state.tasks.filter(t => t.status === 'ready')
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).map(t => t.id) : [] };
}

module.exports = { createRun, apply, snapshot, validateState };
