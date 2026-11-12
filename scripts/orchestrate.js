#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { classifyWork } = require('./lib/orchestration/classify');

const VALUE_FLAGS = new Set(['state', 'command', 'input', 'by', 'evidence', 'task', 'commit',
  'worker-command', 'worktree-root', 'port', 'worker', 'attempt', 'result']);
const SWITCH_FLAGS = new Set(['execute', 'json', 'help']);
const COMMANDS = new Set(['classify', 'init', 'status', 'approve', 'dispatch', 'run', 'prepare', 'submit', 'integrate', 'serve']);

function usage() {
  return [
    'DB-free task orchestration. No default state path or database access.',
    '  node scripts/orchestrate.js classify --input <JSON assessment>',
    '  node scripts/orchestrate.js init <plan.json> --state <new-run.json>',
    '  node scripts/orchestrate.js status --state <run.json> [--json]',
    '  node scripts/orchestrate.js approve --state <run.json> --by <owner> --evidence <text>',
    '  node scripts/orchestrate.js dispatch --state <run.json> --command <JSON action>',
    '  node scripts/orchestrate.js prepare --state <run.json> --task <id> --worker <id> --worktree-root <directory>',
    '  node scripts/orchestrate.js submit --state <run.json> --task <id> --attempt <id> --result <result.json>',
    '  node scripts/orchestrate.js run --state <run.json> [--execute --worker-command <JSON argv> --worktree-root <directory>]',
    '  node scripts/orchestrate.js integrate --state <run.json> --task <id> --commit <SHA> --by <owner> --evidence <text>',
    '  node scripts/orchestrate.js serve --state <run.json> [--port 8765]',
    'run is preview-only. Real subprocess launch is blocked until a verified no-database sandbox adapter is available.',
    'prepare creates an isolated handoff; an authorized agent/operator performs the work, then submit checks the output.',
    'integrate records verified existing integration; it never commits, merges, or pushes.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = { command: argv[0] || 'help', positionals: [] };
  for (let i = 1; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) { options.positionals.push(item); continue; }
    const key = item.slice(2);
    if (SWITCH_FLAGS.has(key)) { options[key] = true; continue; }
    if (!VALUE_FLAGS.has(key)) throw new Error(`Unknown flag: ${item}`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw new Error(`Missing ${item} value.`);
    options[key === 'command' ? 'commandJson' : key] = argv[++i];
  }
  if (options.command === '--help' || options.command === 'help' || options.help) return { ...options, help: true };
  if (!COMMANDS.has(options.command)) throw new Error(`Unknown command: ${options.command}`);
  if (options.command !== 'classify') {
    if (!options.state) throw new Error('An explicit --state <run.json> is required.');
    if (path.extname(options.state).toLowerCase() !== '.json') throw new Error('State must be an explicit JSON file.');
    options.state = path.resolve(options.state);
  }
  if (options.positionals.length && options.command !== 'init') throw new Error('Unexpected positional argument.');
  return options;
}

function json(text, label) {
  if (typeof text !== 'string' || !text || Buffer.byteLength(text) > 1024 * 1024) {
    throw new Error(`${label} must be bounded JSON.`);
  }
  try { return JSON.parse(text); } catch { throw new Error(`Invalid ${label} JSON.`); }
}

function git(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  }).trim();
}

function readPlan(file) {
  if (!file) throw new Error('init requires one plan.json path.');
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid plan file.');
  const plan = json(fs.readFileSync(resolved, 'utf8'), 'plan');
  if (!plan.repoRoot || !path.isAbsolute(plan.repoRoot)) throw new Error('Plan repoRoot must be absolute.');
  const baseRef = git(plan.repoRoot, ['rev-parse', '--verify', '--end-of-options', `${plan.baseRef || 'HEAD'}^{commit}`]);
  // Importing a plan is not execution approval; record approval as a separate action.
  return { ...plan, baseRef, approved: false };
}

function findTask(state, id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) throw new Error(`Unknown task: ${id}`);
  return task;
}

function checkOutputRevision(state, task) {
  const attempt = task.attempts.find(item => item.id === task.currentAttemptId);
  if (!attempt?.worktree) {
    if (task.kind === 'code') throw new Error('Code review requires the original worktree.');
    return;
  }
  const { fingerprintWorktree } = require('./lib/orchestration/worktrees');
  const fingerprint = fingerprintWorktree(attempt.worktree);
  if (fingerprint.revision !== task.output?.revision) throw new Error('Worktree changed since submission; resubmit a new attempt.');
}

function dispatch(store, command) {
  if (!command || typeof command !== 'object' || Array.isArray(command)) throw new Error('Command must be an object.');
  if (command.action === 'integrate') throw new Error('Use integrate to verify the Git receipt before recording integration.');
  const state = store.read();
  const task = command.taskId ? findTask(state, command.taskId) : null;
  if (task && ['claim', 'submit'].includes(command.action)) {
    throw new Error('Task claim/submission requires prepare/submit and a verified worktree.');
  }
  if (task && command.action === 'review') checkOutputRevision(state, task);
  return store.dispatch(command);
}

function printStatus(state, out) {
  const snapshot = require('./lib/orchestration/model').snapshot(state);
  out(`Run ${state.id} | approved=${state.approved} paused=${state.paused} | running=${snapshot.runningCount}/${state.maxWorkers}`);
  for (const task of snapshot.tasks) {
    const attempt = task.attempts.find(item => item.id === task.currentAttemptId);
    const deps = task.dependsOn.map(d => `${d.taskId}:${d.gate}`).join(', ') || '-';
    out(`${task.id}\t${task.status}\t${attempt?.workerId || '-'}\t${task.title}\tdepends=${deps}`);
  }
  out('Full evidence, attempts, and events: status --json or the read-only dashboard.');
}

async function integrate(store, options) {
  const state = store.read();
  const task = findTask(state, options.task);
  checkOutputRevision(state, task);
  if (!options.commit || !/^[a-f0-9]{40,64}$/i.test(options.commit)) throw new Error('An existing full Git commit SHA is required.');
  if (task.kind !== 'code') throw new Error('Artifact tasks use the accepted gate; integrate is for code tasks.');
  const { verifyIntegrationCommit } = require('./lib/orchestration/worktrees');
  verifyIntegrationCommit(state, task, options.commit);
  return store.dispatch({ action: 'integrate', taskId: task.id,
    attemptId: task.currentAttemptId, outputHash: task.output?.outputHash,
    revision: task.output?.revision, commit: options.commit,
    integrator: options.by, evidence: options.evidence });
}

function runPreview(store, options, out) {
  if (options.execute) {
    if (!options['worker-command']) throw new Error('--worker-command JSON argv is required for execution.');
    throw new Error('Worker process execution is blocked: no verified no-database sandbox adapter is configured. Use prepare/submit with an authorized agent; arbitrary executables are not a sandbox.');
  }
  printStatus(store.read(), out);
  out('Preview only; no workers or worktrees created.');
}

async function serve(store, options, out) {
  store.read();
  const app = require('./lib/orchestration/dashboard').createOrchestrationDashboard({
    filePath: options.state, port: options.port === undefined ? 8765 : Number(options.port), readOnly: true
  });
  await app.listen();
  out(`Read-only orchestration dashboard: ${app.url}`);
  const stop = async () => { await app.close(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  app.server.once('close', () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  });
}

async function main(argv = process.argv.slice(2), { out = console.log } = {}) {
  const options = parseArgs(argv);
  if (options.help) { out(usage()); return 0; }
  if (options.command === 'classify') {
    out(JSON.stringify(classifyWork(json(options.input, 'assessment')), null, 2));
    return 0;
  }
  const { createFileStore } = require('./lib/orchestration/file-store');
  const store = createFileStore(options.state);
  if (options.command === 'init') {
    if (options.positionals.length !== 1) throw new Error('init requires one plan.json path.');
    const state = store.init(readPlan(options.positionals[0]));
    out(JSON.stringify(require('./lib/orchestration/model').snapshot(state), null, 2));
  } else if (options.command === 'status') {
    const state = store.read();
    if (options.json) out(JSON.stringify(require('./lib/orchestration/model').snapshot(state), null, 2));
    else printStatus(state, out);
  } else if (options.command === 'approve') {
    store.dispatch({ action: 'approve', approver: options.by, evidence: options.evidence });
    out('Plan approved. No workers started.');
  } else if (options.command === 'dispatch') {
    out(JSON.stringify(dispatch(store, json(options.commandJson, 'command')), null, 2));
  } else if (options.command === 'prepare' || options.command === 'submit') {
    const handoff = require('./lib/orchestration/handoff');
    const result = options.command === 'prepare'
      ? handoff.prepareTask({ store, taskId: options.task, workerId: options.worker, worktreeRoot: options['worktree-root'] })
      : handoff.submitTask({ store, taskId: options.task, attemptId: options.attempt, resultFile: options.result });
    out(JSON.stringify(result, null, 2));
  } else if (options.command === 'integrate') {
    out(JSON.stringify(await integrate(store, options), null, 2));
  } else if (options.command === 'run') {
    runPreview(store, options, out);
  } else if (options.command === 'serve') {
    await serve(store, options, out);
  }
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`[orchestration] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs, usage, dispatch };
