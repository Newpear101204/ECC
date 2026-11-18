'use strict';

const { assert, text, id, strings, phase, object, normalizeWork, graph, normalizeResult,
  identity, validateReview, validateIntegration, validateObservation } = require('./observation-validation');
const { projectObservation } = require('./observation-projection');

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
function boundedPush(array, value, maximum = 100) { array.push(value); if (array.length > maximum) array.splice(0, array.length - maximum); }

function createObservation(at = now()) {
  return { schemaVersion: 1, plan: null, planHistory: [], items: [], decisions: [], changes: [],
    session: { status: 'active', updatedAt: at, evidence: 'Coordinator observation ledger initialized; no execution authority implied' },
    lastRecordedAt: at, seq: 0, events: [], droppedEvents: 0 };
}

function getItem(state, event) {
  const item = state.items.find(row => row.id === event.itemId);
  assert(item, `Unknown observation item: ${event.itemId}`);
  return item;
}
function current(item, event, statuses) {
  assert(statuses.includes(item.status), `Invalid observation item state: ${item.status}`);
  assert(event.attemptId && event.attemptId === item.currentAttemptId, 'Stale or missing observation attempt');
  const attempt = item.attempts.find(row => row.id === event.attemptId);
  assert(attempt, 'Unknown observation attempt');
  return attempt;
}
function setStatus(item, attempt, status, at) {
  item.status = status; item.updatedAt = at;
  if (status !== 'waiting') item.wait = null;
  if (attempt) { attempt.status = status; attempt.lastActivityAt = at; }
}
function active(state) { assert(state.session.status === 'active', 'Observation session must be active for new work'); }
function dependencies(state, item) {
  return item.dependsOn.filter(dependency => !['accepted', 'integrated'].includes(state.items.find(row => row.id === dependency)?.status));
}

function recordPlan(state, event, at) {
  if (state.plan) boundedPush(state.planHistory, state.plan);
  state.plan = { title: text(event.title, 'plan title', 500), reference: text(event.reference, 'plan reference', 4000),
    version: text(event.version, 'plan version', 200), summary: text(event.summary, 'plan summary'), at };
}
function addWork(state, event, at) {
  assert(state.plan, 'Record the observation plan before work items');
  assert(Array.isArray(event.items) && event.items.length && state.items.length + event.items.length <= 256, 'Invalid observation work additions');
  const items = event.items.map(raw => ({ ...normalizeWork(raw), planVersion: state.plan.version,
    createdAt: at, updatedAt: at, status: 'planned', attempts: [], currentAttemptId: null,
    output: null, review: null, integration: null, wait: null }));
  const combined = [...state.items, ...items]; graph(combined); state.items = combined;
}
function reviseWork(state, event, at) {
  const item = getItem(state, event);
  assert(item.status === 'planned' || (item.status === 'waiting' && !item.currentAttemptId), 'Revise only unstarted observation work; retry first');
  object(event.changes, 'work changes'); text(event.reason, 'change reason');
  const allowed = new Set(['title', 'phase', 'dependsOn', 'scope', 'inputs', 'acceptance', 'validation']);
  assert(Object.keys(event.changes).length && Object.keys(event.changes).every(key => allowed.has(key)), 'Invalid observation change fields');
  const before = normalizeWork(item);
  const after = normalizeWork({ ...before, ...event.changes });
  const combined = state.items.map(row => row.id === item.id ? { ...row, ...after, updatedAt: at, planVersion: state.plan?.version || row.planVersion } : row);
  graph(combined); state.items = combined;
  boundedPush(state.changes, { itemId: item.id, reason: event.reason, evidence: event.evidence, before, after, at });
}
function recordPhase(state, event, at) {
  phase(event.phase);
  assert(['direct', 'sequential', 'parallel'].includes(event.mode), 'Invalid observation phase mode');
  const ready = strings(event.ready || [], 'phase ready items').map(value => id(value));
  assert(Array.isArray(event.blocked || []) && (event.blocked || []).length <= 256, 'Invalid observation blockers');
  const blocked = (event.blocked || []).map(entry => ({ itemId: id(entry.itemId), reason: text(entry.reason, 'blocker reason') }));
  assert([...ready, ...blocked.map(entry => entry.itemId)].every(itemId => state.items.some(item => item.id === itemId)), 'Unknown observation phase item');
  assert(new Set(blocked.map(entry => entry.itemId)).size === blocked.length, 'Duplicate observation blockers');
  assert(blocked.every(entry => !ready.includes(entry.itemId)), 'Observation ready and blocked items must be disjoint');
  for (const itemId of ready) {
    const item = state.items.find(row => row.id === itemId);
    assert(item.status === 'planned', 'Observation ready items must be planned');
    assert(item.phase === event.phase, 'Observation ready item must belong to the assessed phase');
    assert(!dependencies(state, item).length, 'Observation ready dependencies must be accepted or integrated');
  }
  boundedPush(state.decisions, { phase: event.phase, mode: event.mode, reason: text(event.reason, 'phase reason'), ready, blocked,
    evidence: event.evidence, at });
}

function prepare(state, event, at) {
  active(state); const item = getItem(state, event);
  assert(item.status === 'planned' || (item.status === 'waiting' && !item.currentAttemptId), 'Observation item must be planned before prepare');
  assert(!dependencies(state, item).length, 'Observation dependencies must be accepted before prepare');
  assert(item.attempts.length < 64, 'Observation attempt limit reached');
  const attempt = { id: `${item.id}-${item.attempts.length + 1}`, workerId: text(event.workerId, 'worker id', 500),
    status: 'prepared', preparedAt: at, startedAt: null, lastActivityAt: at,
    worktree: event.worktree === undefined || event.worktree === null ? null : text(event.worktree, 'worktree', 2048),
    contract: { acceptance: [...item.acceptance], validation: [...item.validation], planVersion: item.planVersion },
    dispatch: null, result: null, review: null, integration: null };
  item.attempts.push(attempt); item.currentAttemptId = attempt.id;
  setStatus(item, attempt, 'prepared', at);
}
function dispatch(state, event, at) {
  active(state); const item = getItem(state, event);
  const attempt = current(item, event, ['prepared', 'waiting']);
  assert(item.owner === 'agent' && !attempt.dispatch, 'Only an undispatched agent item can record dispatch');
  const receipt = { evidence: event.evidence, at };
  for (const field of ['provider', 'tool', 'agentRef', 'reference']) receipt[field] = text(event[field], `dispatch ${field}`, 1000);
  attempt.dispatch = receipt; attempt.startedAt = at;
  setStatus(item, attempt, 'dispatched', at);
}
function progress(state, event, at) {
  active(state); const item = getItem(state, event);
  const attempt = current(item, event, ['prepared', 'dispatched', 'working', 'waiting']);
  assert(item.owner === 'main' || attempt.dispatch, 'Observation agent progress requires dispatch receipt');
  attempt.startedAt ||= at;
  attempt.activity = { summary: text(event.summary, 'activity summary'), evidence: event.evidence, at };
  setStatus(item, attempt, 'working', at);
}
function wait(state, event, at) {
  const item = getItem(state, event);
  const attempt = item.currentAttemptId ? current(item, event, ['prepared', 'dispatched', 'working', 'waiting']) : null;
  assert(attempt || ['planned', 'waiting'].includes(item.status), 'Invalid observation wait state');
  item.wait = { waitingFor: text(event.waitingFor, 'waiting category', 200), reason: text(event.reason, 'wait reason'), evidence: event.evidence, at };
  setStatus(item, attempt, 'waiting', at);
}
function result(state, event, at) {
  const item = getItem(state, event);
  const attempt = current(item, event, ['dispatched', 'working', 'waiting']);
  assert(attempt.startedAt && (item.owner === 'main' || attempt.dispatch), 'Observation result requires dispatch/started work');
  item.output = normalizeResult(event.result); attempt.result = clone(item.output);
  setStatus(item, attempt, 'result_received', at);
}
function review(state, event, at) {
  const item = getItem(state, event); const attempt = current(item, event, ['result_received']); identity(item, event);
  const receipt = { reviewer: text(event.reviewer, 'reviewer', 500), verdict: event.verdict,
    criteria: strings(event.criteria, 'review criteria'), revision: event.revision,
    outputHash: event.outputHash, evidence: event.evidence, at };
  validateReview(attempt.contract, receipt, attempt, item.output);
  item.review = receipt; attempt.review = clone(receipt);
  setStatus(item, attempt, event.verdict === 'approved' ? 'accepted' : 'changes_requested', at);
}
function integration(state, event, at) {
  const item = getItem(state, event); const attempt = current(item, event, ['accepted']); identity(item, event);
  const receipt = { integrator: text(event.integrator, 'integrator', 500), commit: event.commit,
    revision: event.revision, outputHash: event.outputHash, evidence: event.evidence, at };
  validateIntegration(receipt, item.output);
  item.integration = receipt; attempt.integration = clone(receipt); setStatus(item, attempt, 'integrated', at);
}
function fail(state, event, at) {
  const item = getItem(state, event); const attempt = current(item, event, ['prepared', 'dispatched', 'working', 'waiting']);
  attempt.error = text(event.reason, 'failure reason'); setStatus(item, attempt, 'failed', at);
}
function retry(state, event, at) {
  const item = getItem(state, event);
  assert(['failed', 'changes_requested'].includes(item.status), 'Observation retry requires failed or changes_requested');
  text(event.reason, 'retry reason');
  item.currentAttemptId = null; item.output = null; item.review = null; item.integration = null;
  setStatus(item, null, 'planned', at);
}
function cancel(state, event, at) {
  const item = getItem(state, event);
  assert(!['accepted', 'integrated', 'cancelled'].includes(item.status), 'Cannot cancel accepted/integrated observation work');
  text(event.reason, 'cancel reason');
  setStatus(item, item.attempts.find(attempt => attempt.id === item.currentAttemptId), 'cancelled', at);
}
function session(state, event, at) {
  assert(['active', 'paused', 'ended'].includes(event.status), 'Invalid observation session status');
  state.session = { status: event.status, updatedAt: at, evidence: event.evidence };
}

const HANDLERS = Object.freeze({ plan: recordPlan, 'work-add': addWork, 'work-revise': reviseWork, phase: recordPhase,
  prepare, dispatch, progress, wait, result, review, integration, fail, retry, cancel, session });

function applyObservation(original, event) {
  validateObservation(original); object(event, 'event'); text(event.evidence, 'event evidence');
  assert(Object.hasOwn(HANDLERS, event.type), `Unknown observation event type: ${event.type}`);
  assert(Buffer.byteLength(JSON.stringify(event)) <= 60000, 'Observation event exceeds size limit');
  const state = clone(original); const at = now();
  HANDLERS[event.type](state, event, at);
  state.lastRecordedAt = at; state.seq++;
  boundedPush(state.events, { seq: state.seq, at, type: event.type, itemId: event.itemId || null,
    attemptId: event.attemptId || null, evidence: event.evidence,
    reason: typeof event.reason === 'string' ? event.reason : null, details: clone(event) }, 500);
  state.droppedEvents = state.seq - state.events.length;
  validateObservation(state);
  return state;
}

module.exports = { createObservation, applyObservation, validateObservation, projectObservation };
