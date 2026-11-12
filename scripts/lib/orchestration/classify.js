'use strict';

/** Classification is an explicit assessment, not a guess from prompt keywords. */
function classifyWork(assessment = {}) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) {
    throw new Error('A work assessment object is required.');
  }
  const { mode, kind = 'change', small = false, independentStreams = 0 } = assessment;
  if (mode && !['direct', 'sequential', 'parallel'].includes(mode)) throw new Error('Invalid mode.');
  if (!Number.isSafeInteger(independentStreams) || independentStreams < 0) {
    throw new Error('independentStreams must be a nonnegative integer.');
  }
  if (mode === 'parallel' && independentStreams < 2) {
    throw new Error('Parallel work requires at least two verified independent streams.');
  }
  if (mode) return { mode, reason: 'Explicit operator choice; execution permissions remain separate.' };
  if (kind === 'question' || small) {
    return { mode: 'direct', reason: 'Handle directly without a board or worktree; retain appropriate validation.' };
  }
  if (independentStreams >= 2) {
    return { mode: 'parallel', reason: 'Bounded independent streams can benefit from separate workers.' };
  }
  return { mode: 'sequential', reason: 'One ordered workstream; use a brief plan without parallel-worker overhead.' };
}

module.exports = { classifyWork };
