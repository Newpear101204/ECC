'use strict';

const path = require('node:path');
const crypto = require('node:crypto');

const STATUSES = new Set(['pending', 'ready', 'running', 'needs_review', 'accepted',
  'integrated', 'changes_requested', 'failed', 'cancelled']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, name, max = 10000) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max &&
    !value.includes('\0'), `Invalid ${name}`);
  return value;
}

function id(value, name = 'id') {
  text(value, name, 100);
  assert(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value), `Invalid ${name}`);
  return value;
}

function strings(value, name, nonempty = false) {
  assert(Array.isArray(value) && value.length <= 256 && (!nonempty || value.length > 0), `Invalid ${name}`);
  value.forEach(v => text(v, name));
  assert(new Set(value).size === value.length, `${name} must be unique`);
  return [...value];
}

function safePath(value, name = 'scope path') {
  text(value, name, 1024);
  const normalized = value.replace(/\\/g, '/');
  const parts = normalized.split('/');
  assert(!path.isAbsolute(normalized) && !/^[a-zA-Z]:/.test(normalized) &&
    !parts.some(p => !p || p === '.' || p === '..' || p.toLowerCase() === '.git' ||
      /[<>:"|?*]/.test(p) || [...p].some(c => c.charCodeAt(0) < 32) || /[. ]$/.test(p) ||
      /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)), `Unsafe ${name}`);
  return normalized;
}

function normalizeTask(raw) {
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid task');
  assert(['explore', 'code', 'review'].includes(raw.kind), 'Invalid task kind');
  assert(raw.permissions && raw.permissions.database === 'none', 'Task database permission must be none');
  assert(raw.permissions.executeTests === undefined || typeof raw.permissions.executeTests === 'boolean', 'Invalid executeTests permission');
  const dependsOn = raw.dependsOn === undefined ? [] : raw.dependsOn;
  assert(Array.isArray(dependsOn) && dependsOn.length <= 256, 'Invalid task dependencies');
  const dependencies = dependsOn.map(dep => {
    assert(dep && typeof dep === 'object', 'Invalid dependency');
    assert(['accepted', 'integrated'].includes(dep.gate), 'Invalid dependency gate');
    return { taskId: id(dep.taskId, 'dependency id'), gate: dep.gate };
  });
  assert(new Set(dependencies.map(d => d.taskId)).size === dependencies.length, 'Duplicate dependency');
  assert(raw.priority === undefined || Number.isSafeInteger(raw.priority), 'Invalid task priority');
  return {
    id: id(raw.id, 'task id'), title: text(raw.title, 'task title', 500), kind: raw.kind,
    acceptance: strings(raw.acceptance, 'acceptance criteria', true),
    scope: strings(raw.scope || [], 'scope').map(p => safePath(p)),
    dependsOn: dependencies, inputs: strings(raw.inputs || [], 'inputs'),
    validation: strings(raw.validation || [], 'validation'), priority: raw.priority ?? 0,
    permissions: { database: 'none', executeTests: raw.permissions.executeTests ?? false }
  };
}

function checkGraph(tasks) {
  const byId = new Map(tasks.map(t => [t.id, t]));
  assert(byId.size === tasks.length, 'Task ids must be unique');
  const visiting = new Set();
  const visited = new Set();
  function visit(task) {
    assert(!visiting.has(task.id), 'Dependency cycle detected');
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const dep of task.dependsOn) {
      assert(dep.taskId !== task.id, 'Task cannot depend on itself');
      assert(byId.has(dep.taskId), `Unknown dependency: ${dep.taskId}`);
      const parent = byId.get(dep.taskId);
      assert(!(task.kind === 'code' && parent.kind === 'code' && dep.gate !== 'integrated'),
        'Code dependency on code requires integrated gate');
      visit(parent);
    }
    visiting.delete(task.id);
    visited.add(task.id);
  }
  tasks.forEach(visit);
}

function validTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function validateOutput(task, output) {
  assert(output && typeof output === 'object' && !Array.isArray(output), 'Invalid state output');
  text(output.summary, 'output summary');
  text(output.revision, 'output revision', 200);
  strings(output.artifacts, 'output artifacts').forEach(p => safePath(p, 'artifact path'));
  strings(output.changedFiles, 'output changedFiles').forEach(file => {
    safePath(file, 'changed file path');
    assert(task.scope.some(scope => file === scope || file.startsWith(`${scope}/`)), 'Invalid output scope');
  });
  assert(task.kind === 'code' || output.changedFiles.length === 0, 'Invalid read-only output changes');
  assert(Array.isArray(output.checks) && output.checks.length <= 256, 'Invalid output checks');
  for (const check of output.checks) {
    text(check.name, 'check name', 200);
    assert(['passed', 'failed', 'not-run'].includes(check.status) && typeof check.evidence === 'string', 'Invalid output check');
  }
  assert(new Set(output.checks.map(c => c.name)).size === output.checks.length, 'Duplicate output check');
  const raw = { summary: output.summary, revision: output.revision,
    artifacts: output.artifacts, checks: output.checks, changedFiles: output.changedFiles };
  const hash = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
  assert(output.outputHash === hash, 'Invalid state output hash');
}

function validateReview(task, review, attempt) {
  assert(review && ['approved', 'changes_requested'].includes(review.verdict), 'Invalid state review');
  text(review.reviewer, 'reviewer');
  assert(review.reviewer !== attempt.workerId, 'Invalid state independent reviewer');
  text(review.evidence, 'review evidence');
  strings(review.criteria, 'review criteria');
  assert(review.revision === task.output.revision && review.outputHash === task.output.outputHash,
    'Invalid state review output identity');
  if (review.verdict === 'approved') {
    assert(task.acceptance.every(item => review.criteria.includes(item)), 'Invalid state acceptance criteria');
    assert(task.validation.every(name => task.output.checks.some(c => c.name === name &&
      c.status === 'passed' && c.evidence.trim())), 'Invalid state validation evidence');
  }
}

function validateState(state) {
  assert(state && state.schemaVersion === 1, 'Invalid orchestration state schema version');
  id(state.id, 'run id');
  text(state.repoRoot, 'repoRoot');
  text(state.baseRef, 'baseRef');
  assert(typeof state.approved === 'boolean' && typeof state.paused === 'boolean', 'Invalid state approval/pause');
  assert(Number.isSafeInteger(state.maxWorkers) && state.maxWorkers >= 1, 'Invalid maxWorkers');
  assert(Array.isArray(state.tasks) && state.tasks.length > 0 && state.tasks.length <= 256, 'Invalid state tasks');
  state.tasks.forEach(task => {
    normalizeTask(task);
    assert(STATUSES.has(task.status), 'Invalid task state status');
    assert(Array.isArray(task.attempts), 'Invalid task attempts');
    assert(new Set(task.attempts.map(a => a.id)).size === task.attempts.length, 'Duplicate state attempts');
    assert(task.currentAttemptId === null || task.attempts.some(a => a.id === task.currentAttemptId), 'Invalid current attempt');
    for (const attempt of task.attempts) {
      id(attempt.id, 'attempt id');
      id(attempt.workerId, 'worker id');
      assert(STATUSES.has(attempt.status), 'Invalid attempt status');
      assert(validTime(attempt.startedAt) && validTime(attempt.lastActivityAt), 'Invalid attempt timestamps');
    }
    if (['running', 'needs_review', 'accepted', 'integrated', 'changes_requested', 'failed'].includes(task.status)) {
      assert(task.currentAttemptId !== null, 'Invalid state: current attempt required');
    }
    if (['needs_review', 'accepted', 'integrated', 'changes_requested'].includes(task.status)) {
      validateOutput(task, task.output);
    }
    const attempt = task.attempts.find(a => a.id === task.currentAttemptId);
    if (attempt) assert(attempt.status === task.status, 'Invalid state attempt/task status mismatch');
    if (['accepted', 'integrated', 'changes_requested'].includes(task.status)) {
      validateReview(task, task.review, attempt);
      assert(task.review.verdict === (task.status === 'changes_requested' ? 'changes_requested' : 'approved'), 'Invalid state review status');
    }
    if (task.status === 'integrated') {
      assert(task.integration && task.integration.revision === task.output.revision &&
        task.integration.outputHash === task.output.outputHash, 'Invalid state integration identity');
      text(task.integration.integrator, 'integrator');
      text(task.integration.evidence, 'integration evidence');
      if (task.kind === 'code') text(task.integration.commit, 'integration commit');
    }
  });
  const running = state.tasks.filter(t => t.status === 'running');
  assert(running.length <= state.maxWorkers, 'Invalid state worker limit');
  assert(new Set(running.map(t => t.attempts.find(a => a.id === t.currentAttemptId).workerId)).size === running.length,
    'Invalid state duplicate active worker');
  checkGraph(state.tasks);
  assert(Array.isArray(state.events) && Number.isSafeInteger(state.seq) && state.seq >= 0, 'Invalid state events');
  const dropped = state.droppedEvents ?? 0;
  assert(Number.isSafeInteger(dropped) && dropped >= 0 && state.events.length <= 1000 &&
    state.events.every((event, i) => Number.isSafeInteger(event.seq) && event.seq === dropped + i + 1 &&
      validTime(event.at) && event.seq <= state.seq) && state.events.length + dropped === state.seq,
  'Invalid state event sequence');
  return state;
}

module.exports = { assert, text, id, strings, safePath, normalizeTask, checkGraph, validateState };
