'use strict';

const { validateObservation } = require('./observation-validation');

const STATUSES = ['planned', 'prepared', 'dispatched', 'working', 'waiting', 'result_received',
  'accepted', 'integrated', 'changes_requested', 'failed', 'cancelled'];
const countsFor = items => Object.fromEntries(STATUSES.map(status => [status, items.filter(item => item.status === status).length]));

function projectObservation(original) {
  validateObservation(original);
  const state = JSON.parse(JSON.stringify(original));
  const dependencyBlockers = item => item.dependsOn.filter(id => !['accepted', 'integrated'].includes(state.items.find(row => row.id === id)?.status));
  state.items = state.items.map(item => ({ ...item, dependencyBlockers: dependencyBlockers(item) }));
  const current = item => item.attempts.find(attempt => attempt.id === item.currentAttemptId);
  const outstanding = item => ['prepared', 'dispatched', 'working', 'waiting'].includes(item.status);
  const preparedAwaitingDispatch = state.items.filter(item => item.owner === 'agent' && outstanding(item) && current(item) && !current(item).dispatch).length;
  const dispatchRecorded = state.items.filter(item => item.owner === 'agent' && outstanding(item) && current(item)?.dispatch).length;
  const readyItemIds = state.items.filter(item => item.status === 'planned' && !item.dependencyBlockers.length).map(item => item.id);
  const warnings = [
    'Observation evidence is coordinator-recorded; native references do not prove current process liveness or identity.',
    'Observed review/integration receipts do not verify filesystem contents or alter execution-task gates.'
  ];
  if (preparedAwaitingDispatch) warnings.push(`${preparedAwaitingDispatch} prepared agent items have no dispatch receipt; do not count them as started workers.`);
  if (state.session.status !== 'active') warnings.push(`Coordinator session recorded ${state.session.status}; this does not prove worker processes stopped or terminated.`);
  const decision = state.decisions.at(-1);
  if (decision?.ready.some(id => state.items.find(item => item.id === id).dependencyBlockers.length)) {
    warnings.push('Latest phase decision declares ready work with unresolved observation dependencies.');
  }
  state.summary = { total: state.items.length, counts: countsFor(state.items), preparedAwaitingDispatch, dispatchRecorded,
    mainWorking: state.items.filter(item => item.owner === 'main' && item.status === 'working').length,
    waiting: state.items.filter(item => item.status === 'waiting' || item.dependencyBlockers.length).length,
    readyItemIds, currentPhase: decision?.phase || null,
    phaseCounts: [...new Set(state.items.map(item => item.phase))].map(phase => {
      const items = state.items.filter(item => item.phase === phase);
      return { phase, total: items.length, counts: countsFor(items) };
    }), warnings };
  return state;
}

module.exports = { projectObservation };
