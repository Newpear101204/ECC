'use strict';

const crypto = require('node:crypto');

const PHASES = new Set(['discovery', 'planning', 'plan-review', 'implementation', 'code-review', 'integration', 'verification']);
const STATUSES = new Set(['planned', 'prepared', 'dispatched', 'working', 'waiting', 'result_received', 'accepted', 'integrated', 'changes_requested', 'failed', 'cancelled']);
const RESULT_STATUSES = new Set(['result_received', 'accepted', 'integrated', 'changes_requested']);

function assert(ok, message) { if (!ok) throw new Error(message); }
function text(value, label, maximum = 10000) {
  assert(typeof value === 'string' && value.trim() && value.length <= maximum && !value.includes('\0'), `Invalid observation ${label}`);
  return value;
}
function id(value, label = 'id') {
  text(value, label, 150);
  assert(/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value), `Invalid observation ${label}`);
  return value;
}
function strings(value, label, required = false) {
  assert(Array.isArray(value) && value.length <= 256 && (!required || value.length), `Invalid observation ${label}`);
  value.forEach(entry => text(entry, label, 4000));
  assert(new Set(value).size === value.length, `Duplicate observation ${label}`);
  return [...value];
}
function time(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function phase(value) { assert(PHASES.has(value), 'Invalid observation phase'); return value; }
function object(value, label) { assert(value && typeof value === 'object' && !Array.isArray(value), `Invalid observation ${label}`); return value; }

function normalizeWork(raw) {
  object(raw, 'work item');
  assert(['main', 'agent'].includes(raw.owner), 'Invalid observation owner');
  return { id: id(raw.id), title: text(raw.title, 'title', 500), phase: phase(raw.phase), owner: raw.owner,
    dependsOn: strings(raw.dependsOn || [], 'dependencies').map(value => id(value, 'dependency')),
    scope: strings(raw.scope || [], 'scope'), inputs: strings(raw.inputs || [], 'inputs'),
    acceptance: strings(raw.acceptance, 'acceptance', true), validation: strings(raw.validation || [], 'validation'),
    taskId: raw.taskId === undefined || raw.taskId === null ? null : id(raw.taskId, 'execution task') };
}

function graph(items) {
  const lookup = new Map(items.map(item => [item.id, item]));
  assert(lookup.size === items.length, 'Duplicate observation item id');
  const visited = new Set(); const pending = new Set();
  function visit(item) {
    assert(!pending.has(item.id), 'Observation dependency cycle');
    if (visited.has(item.id)) return;
    pending.add(item.id);
    for (const dependency of item.dependsOn) {
      assert(lookup.has(dependency), `Unknown observation dependency: ${dependency}`);
      visit(lookup.get(dependency));
    }
    pending.delete(item.id); visited.add(item.id);
  }
  items.forEach(visit);
}

function normalizeResult(raw) {
  object(raw, 'result');
  assert(Array.isArray(raw.checks) && raw.checks.length <= 256, 'Invalid observation checks');
  const checks = raw.checks.map(check => {
    object(check, 'check');
    assert(['passed', 'failed', 'not-run'].includes(check.status), 'Invalid observation check status');
    assert(typeof check.evidence === 'string' && check.evidence.length <= 10000 && !check.evidence.includes('\0'), 'Invalid observation check evidence');
    return { name: text(check.name, 'check name', 200), status: check.status, evidence: check.evidence };
  });
  assert(new Set(checks.map(check => check.name)).size === checks.length, 'Duplicate observation checks');
  const result = { summary: text(raw.summary, 'result summary'), revision: text(raw.revision, 'result revision', 200),
    artifacts: strings(raw.artifacts || [], 'artifacts'), checks };
  return { ...result, outputHash: crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex') };
}

function validateResult(result) {
  const normalized = normalizeResult(result);
  assert(normalized.outputHash === result.outputHash, 'Invalid observation output hash');
}

function identity(item, event) {
  assert(item.output && event.revision === item.output.revision && event.outputHash === item.output.outputHash,
    'Stale observation output identity/hash');
}

function validateReview(contract, review, attempt, result) {
  object(review, 'review receipt');
  text(review.reviewer, 'reviewer', 500); text(review.evidence, 'review evidence');
  assert(review.reviewer !== attempt.workerId && review.reviewer !== attempt.dispatch?.agentRef, 'Observation review must be independent');
  assert(['approved', 'changes_requested'].includes(review.verdict), 'Invalid observation review verdict');
  assert(time(review.at), 'Invalid observation review time');
  strings(review.criteria, 'review criteria');
  assert(result && review.revision === result.revision && review.outputHash === result.outputHash, 'Invalid observation review identity');
  if (review.verdict === 'approved') {
    assert(contract.acceptance.every(criterion => review.criteria.includes(criterion)), 'Observation review must cover acceptance criteria');
    assert(contract.validation.every(name => result.checks.some(check => check.name === name && check.status === 'passed' && check.evidence.trim())),
      'Observation validation must have passed evidence');
  }
}

function validateIntegration(receipt, result) {
  object(receipt, 'integration receipt');
  text(receipt.integrator, 'integrator', 500); text(receipt.evidence, 'integration evidence');
  assert(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(receipt.commit), 'Invalid observation integration commit');
  assert(time(receipt.at) && result && receipt.revision === result.revision && receipt.outputHash === result.outputHash,
    'Invalid observation integration identity');
}

function validateDispatch(item, attempt) {
  if (attempt.dispatch) {
    assert(item.owner === 'agent', 'Main work cannot claim agent dispatch');
    for (const field of ['provider', 'tool', 'agentRef', 'reference', 'evidence']) text(attempt.dispatch[field], `dispatch ${field}`, field === 'evidence' ? 10000 : 1000);
    assert(time(attempt.dispatch.at) && attempt.startedAt, 'Invalid observation dispatch time');
  }
  if (attempt.status === 'prepared') assert(!attempt.dispatch && attempt.startedAt === null, 'Prepared observation attempt cannot claim dispatch/start');
  if (attempt.status === 'working') assert(attempt.startedAt, 'Working observation attempt requires start evidence');
  if (item.owner === 'agent' && ['dispatched', 'working', ...RESULT_STATUSES].includes(attempt.status)) {
    assert(attempt.dispatch, 'Observation agent activity requires dispatch receipt');
  }
}

function validateAttempt(item, attempt) {
  object(attempt, 'attempt'); id(attempt.id, 'attempt id'); text(attempt.workerId, 'worker id', 500);
  assert(STATUSES.has(attempt.status) && time(attempt.preparedAt) && time(attempt.lastActivityAt), 'Invalid observation attempt status/time');
  assert(attempt.startedAt === null || time(attempt.startedAt), 'Invalid observation start time');
  if (attempt.worktree !== null) text(attempt.worktree, 'worktree', 2048);
  object(attempt.contract, 'attempt contract');
  strings(attempt.contract.acceptance, 'attempt acceptance', true); strings(attempt.contract.validation, 'attempt validation');
  validateDispatch(item, attempt);
  if (attempt.result) validateResult(attempt.result);
  if (RESULT_STATUSES.has(attempt.status)) assert(attempt.result && attempt.startedAt, 'Observation result requires started attempt');
  if (attempt.review) validateReview(attempt.contract, attempt.review, attempt, attempt.result);
  if (['accepted', 'integrated', 'changes_requested'].includes(attempt.status)) {
    assert(attempt.review && attempt.review.verdict === (attempt.status === 'changes_requested' ? 'changes_requested' : 'approved'), 'Invalid observation review status');
  }
  if (attempt.integration) validateIntegration(attempt.integration, attempt.result);
  if (attempt.status === 'integrated') assert(attempt.integration, 'Observation integration receipt required');
}

function validateItem(item) {
  normalizeWork(item);
  assert(STATUSES.has(item.status) && time(item.createdAt) && time(item.updatedAt), 'Invalid observation item status/time');
  assert(Array.isArray(item.attempts) && item.attempts.length <= 64, 'Invalid observation attempts');
  assert(new Set(item.attempts.map(attempt => attempt.id)).size === item.attempts.length, 'Duplicate observation attempts');
  item.attempts.forEach(attempt => validateAttempt(item, attempt));
  const attempt = item.attempts.find(row => row.id === item.currentAttemptId);
  if (item.currentAttemptId !== null) assert(attempt && attempt === item.attempts.at(-1), 'Invalid observation current attempt');
  if (attempt) {
    assert(attempt.status === item.status, 'Observation item/attempt status mismatch');
    assert(JSON.stringify(attempt.result) === JSON.stringify(item.output) && JSON.stringify(attempt.review) === JSON.stringify(item.review)
      && JSON.stringify(attempt.integration) === JSON.stringify(item.integration), 'Observation item receipt identity mismatch');
    assert(JSON.stringify(attempt.contract.acceptance) === JSON.stringify(item.acceptance) &&
      JSON.stringify(attempt.contract.validation) === JSON.stringify(item.validation), 'Observation current contract identity mismatch');
  } else {
    assert(['planned', 'waiting', 'cancelled'].includes(item.status) && !item.output && !item.review && !item.integration,
      'Observation status requires current attempt');
  }
  if (item.wait) {
    for (const field of ['waitingFor', 'reason', 'evidence']) text(item.wait[field], `wait ${field}`);
    assert(time(item.wait.at) && item.status === 'waiting', 'Invalid observation wait');
  }
  if (item.status === 'waiting') assert(item.wait, 'Observation waiting status requires a reason');
}

function validateObservation(state) {
  object(state, 'state'); assert(state.schemaVersion === 1, 'Invalid observation schema');
  assert(time(state.lastRecordedAt), 'Invalid observation recorded time');
  object(state.session, 'session');
  assert(['active', 'paused', 'ended'].includes(state.session.status) && time(state.session.updatedAt), 'Invalid observation session');
  text(state.session.evidence, 'session evidence');
  for (const field of ['planHistory', 'decisions', 'changes']) assert(Array.isArray(state[field]) && state[field].length <= 100, `Invalid observation ${field}`);
  if (state.plan) {
    for (const field of ['title', 'reference', 'version', 'summary']) text(state.plan[field], `plan ${field}`);
    assert(time(state.plan.at), 'Invalid observation plan time');
  }
  assert(Array.isArray(state.items) && state.items.length <= 256, 'Invalid observation work items');
  state.items.forEach(validateItem); graph(state.items);
  for (const decision of state.decisions) {
    phase(decision.phase); assert(['direct', 'sequential', 'parallel'].includes(decision.mode), 'Invalid observation decision mode');
    text(decision.reason, 'phase reason'); text(decision.evidence, 'phase evidence');
    assert(time(decision.at), 'Invalid observation phase time');
    strings(decision.ready, 'ready');
    assert(Array.isArray(decision.blocked) && decision.blocked.length <= 256, 'Invalid observation blockers');
    const blockedIds = decision.blocked.map(entry => { object(entry, 'blocker'); return id(entry.itemId); });
    assert(new Set(blockedIds).size === blockedIds.length, 'Duplicate observation blockers');
    assert(blockedIds.every(itemId => !decision.ready.includes(itemId)), 'Observation ready and blocked items must be disjoint');
    decision.blocked.forEach(entry => text(entry.reason, 'blocker reason'));
    for (const entry of [...decision.ready.map(itemId => ({ itemId })), ...decision.blocked]) {
      assert(state.items.some(item => item.id === entry.itemId), 'Unknown observation phase item');
      if (entry.reason !== undefined) text(entry.reason, 'blocker reason');
    }
  }
  assert(Number.isSafeInteger(state.seq) && state.seq >= 0 && Number.isSafeInteger(state.droppedEvents) && state.droppedEvents >= 0,
    'Invalid observation sequence');
  assert(Array.isArray(state.events) && state.events.length <= 500 && state.events.length + state.droppedEvents === state.seq,
    'Invalid observation event history');
  for (let index = 0; index < state.events.length; index++) {
    const entry = state.events[index];
    assert(entry.seq === state.droppedEvents + index + 1 && time(entry.at), 'Invalid observation event sequence/time');
    text(entry.type, 'event type', 100); text(entry.evidence, 'event evidence');
    assert(Buffer.byteLength(JSON.stringify(entry)) <= 65536, 'Observation event exceeds size limit');
  }
  return state;
}

module.exports = { assert, text, id, strings, time, phase, object, normalizeWork, graph,
  normalizeResult, identity, validateReview, validateIntegration, validateObservation };
