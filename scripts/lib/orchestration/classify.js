'use strict';

const PHASES = new Set(['discovery', 'planning', 'plan-review', 'implementation',
  'code-review', 'integration', 'verification']);

/** Classify the current assessment only; phase labels do not persist a workflow mode. */
function classifyWork(assessment = {}) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) {
    throw new Error('A work assessment object is required.');
  }
  const { phase, mode, kind = 'change', small = false, independentStreams = 0 } = assessment;
  if (phase !== undefined && !PHASES.has(phase)) throw new Error('Invalid phase.');
  if (mode && !['direct', 'sequential', 'parallel'].includes(mode)) throw new Error('Invalid mode.');
  if (!Number.isSafeInteger(independentStreams) || independentStreams < 0) {
    throw new Error('independentStreams must be a nonnegative integer.');
  }
  if (mode === 'parallel' && independentStreams < 2) {
    throw new Error('Parallel work requires at least two verified independent streams.');
  }
  const result = (selectedMode, reason) => phase === undefined
    ? { mode: selectedMode, reason } : { phase, mode: selectedMode, reason };
  if (mode) return result(mode, 'Explicit operator choice; execution permissions remain separate.');
  if (kind === 'question' || small) {
    return result('direct', 'Handle directly without a board or worktree; retain appropriate validation.');
  }
  if (independentStreams >= 2) {
    return result('parallel', 'Bounded independent streams can benefit from separate workers.');
  }
  return result('sequential', 'One ordered workstream; use a brief plan without parallel-worker overhead.');
}

module.exports = { classifyWork };
