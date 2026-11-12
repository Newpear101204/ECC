'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runReady } = require('../../scripts/lib/orchestration/runtime');
const { createFileStore } = require('../../scripts/lib/orchestration/file-store');

function fixture(t, count = 10) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-worker-run-'));
  const repo = path.join(root, 'repo'); fs.mkdirSync(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim();
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  fs.writeFileSync(path.join(repo, 'sample.txt'), 'base'); git('add', 'sample.txt'); git('commit', '-qm', 'fixture');
  const filePath = path.join(root, 'run.json');
  const store = createFileStore(filePath);
  store.init({ schemaVersion: 1, id: 'run', repoRoot: repo, baseRef: git('rev-parse', 'HEAD'), approved: true, maxWorkers: 3,
    tasks: Array.from({ length: count }, (_, n) => ({ id: `t${n}`, title: `Task ${n}`, kind: 'explore', scope: ['sample.txt'], acceptance: ['Report'], dependsOn: [], inputs: [], validation: [], permissions: { database: 'none', executeTests: false } })) });
  const worker = path.join(root, 'fake-worker.cjs');
  fs.writeFileSync(worker, `const fs = require('node:fs');\nconst packet=JSON.parse(fs.readFileSync(process.env.ECC_ORCHESTRATION_TASK_FILE,'utf8'));\nsetTimeout(()=>{ fs.writeFileSync(process.env.ECC_ORCHESTRATION_RESULT_FILE, JSON.stringify({summary:'Observed fixture',revision:'fixture-revision',artifacts:[],checks:[],changedFiles:[]})); }, Number(packet.task.id.slice(1))===0?20:90);`);
  t.after(() => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, repo, filePath, store, worker, worktreeRoot: path.join(root, 'trees') };
}

test('production execution fails closed before any writes or worker spawn', async t => {
  const f = fixture(t, 1);
  const before = fs.readFileSync(f.filePath, 'utf8');
  await assert.rejects(runReady({ filePath: f.filePath, execute: true,
    workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot }), /verified.*sandbox.*unavailable/i);
  assert.equal(fs.readFileSync(f.filePath, 'utf8'), before);
  assert.equal(fs.existsSync(f.worktreeRoot), false);
  assert.equal(fs.existsSync(`${f.filePath}.runner-lock`), false);
});

test('dry run has no filesystem or process effects', async t => {
  const f = fixture(t, 1);
  const before = fs.readFileSync(f.filePath, 'utf8');
  const result = await runReady({ testHarness: true, filePath: f.filePath, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.started, 0);
  assert.equal(fs.readFileSync(f.filePath, 'utf8'), before);
  assert.equal(fs.existsSync(f.worktreeRoot), false);
});

test('test-only harness escape is refused outside Node test context', async t => {
  const f = fixture(t, 1);
  const context = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    await assert.rejects(runReady({ testHarness: true, filePath: f.filePath, execute: true,
      workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot }), /sandbox.*unavailable/i);
  } finally { if (context !== undefined) process.env.NODE_TEST_CONTEXT = context; }
  assert.equal(fs.existsSync(f.worktreeRoot), false);
  assert.equal(fs.existsSync(`${f.filePath}.runner-lock`), false);
});

test('ten independent tasks replenish at most three slots and await review', async t => {
  const f = fixture(t);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot, pollIntervalMs: 15 });
  assert.equal(result.started, 10);
  assert.equal(result.completed, 10);
  assert.equal(result.failed, 0);
  const state = f.store.read();
  assert.ok(state.tasks.every(x => x.status === 'needs_review'));
  let running = 0; let peak = 0;
  for (const event of state.events) {
    if (event.action === 'claim' || event.type === 'claim') { running++; peak = Math.max(peak, running); }
    if (['submit', 'fail'].includes(event.action || event.type)) running--;
  }
  assert.equal(peak, 3);
});

test('an exit zero without structured result fails instead of accepting', async t => {
  const f = fixture(t, 1);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, '-e', 'process.exit(0)'], worktreeRoot: f.worktreeRoot });
  assert.equal(result.failed, 1);
  assert.equal(f.store.read().tasks[0].status, 'failed');
});

test('pre-existing running attempt is not launched again', async t => {
  const f = fixture(t, 1);
  f.store.dispatch({ action: 'claim', taskId: 't0', workerId: 'previous', baseRevision: 'fixture' });
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.started, 0);
  assert.equal(f.store.read().tasks[0].status, 'running');
});

test('dependencies await accepted output and are passed at that exact revision', async t => {
  const f = fixture(t, 2);
  const state = f.store.read();
  state.tasks[1].dependsOn = [{ taskId: 't0', gate: 'accepted' }];
  // Adjust only this fresh fixture plan before any worker activity.
  fs.writeFileSync(f.filePath, JSON.stringify(state));
  let result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.started, 1);
  assert.equal(f.store.read().tasks[1].status, 'pending');
  const submitted = f.store.read().tasks[0];
  f.store.dispatch({ action: 'review', taskId: 't0', attemptId: submitted.currentAttemptId,
    revision: submitted.output.revision, outputHash: submitted.output.outputHash,
    verdict: 'approved', reviewer: 'independent', criteria: ['Report'], evidence: 'Compared fixture report' });
  result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.started, 1);
  const packet = JSON.parse(fs.readFileSync(path.join(f.root, 'artifacts', 'run', 't1-1', 'task.json'), 'utf8'));
  assert.equal(packet.dependencies[0].output.outputHash, submitted.output.outputHash);
  assert.equal(packet.dependencies[0].output.revision, submitted.output.revision);
});

test('code changes are fingerprinted independently and source checkout remains unchanged', async t => {
  const f = fixture(t, 1);
  const state = f.store.read(); state.tasks[0].kind = 'code';
  fs.writeFileSync(f.filePath, JSON.stringify(state));
  fs.writeFileSync(f.worker, `const fs=require('node:fs'); fs.writeFileSync('sample.txt','worker change'); fs.writeFileSync(process.env.ECC_ORCHESTRATION_RESULT_FILE,JSON.stringify({summary:'changed',revision:'false-report',changedFiles:[],checks:[],artifacts:[]}));`);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.completed, 1);
  const task = f.store.read().tasks[0];
  assert.deepEqual(task.output.changedFiles, ['sample.txt']);
  assert.match(task.output.revision, /^[a-f0-9]{64}$/);
  assert.equal(fs.readFileSync(path.join(f.repo, 'sample.txt'), 'utf8'), 'base');
});

test('worker cannot bypass changed-file scope by making a commit', async t => {
  const f = fixture(t, 1);
  const state = f.store.read(); state.tasks[0].kind = 'code';
  fs.writeFileSync(f.filePath, JSON.stringify(state));
  fs.writeFileSync(f.worker, `const fs=require('node:fs'); const {execFileSync}=require('node:child_process'); fs.writeFileSync('sample.txt','commit change'); execFileSync('git',['-c','core.hooksPath=','add','sample.txt']); execFileSync('git',['-c','core.hooksPath=','commit','-qm','unauthorized fixture commit']); fs.writeFileSync(process.env.ECC_ORCHESTRATION_RESULT_FILE,JSON.stringify({summary:'changed',revision:'false-report',changedFiles:[],checks:[],artifacts:[]}));`);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.failed, 1);
  assert.equal(f.store.read().tasks[0].status, 'failed');
});

test('approval and explicit executable gates prevent launches', async t => {
  const f = fixture(t, 1);
  const state = f.store.read(); state.approved = false;
  fs.writeFileSync(f.filePath, JSON.stringify(state));
  await assert.rejects(runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker] }), /approved/);
  await assert.rejects(runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: 'node worker' }), /argv/);
  await assert.rejects(runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: ['worker.cmd'] }), /native executable/);
  assert.equal(fs.existsSync(`${f.filePath}.runner-lock`), false);
});

test('runner ownership is exclusive and never removes an existing lock', async t => {
  const f = fixture(t, 1);
  const lock = `${f.filePath}.runner-lock`; fs.mkdirSync(lock);
  await assert.rejects(runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker] }), /Another runner/);
  assert.equal(fs.existsSync(lock), true);
});

test('abort stops only current children and preserves a failed result for explicit retry', async t => {
  const f = fixture(t, 1);
  fs.writeFileSync(f.worker, 'setTimeout(()=>{},10000)');
  const controller = new AbortController();
  const run = runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot, signal: controller.signal, pollIntervalMs: 15 });
  setTimeout(() => controller.abort(), 80);
  const result = await run;
  assert.equal(result.started, 1);
  assert.equal(result.failed, 1);
  assert.equal(f.store.read().tasks[0].status, 'failed');
  assert.equal(fs.existsSync(`${f.filePath}.runner-lock`), false);
});

test('process worker receives private homes and no inherited credential variables', async t => {
  const f = fixture(t, 1);
  fs.writeFileSync(f.worker, `const fs=require('node:fs'); const p=JSON.parse(fs.readFileSync(process.env.ECC_ORCHESTRATION_TASK_FILE,'utf8')); if(Object.keys(process.env).some(k=>/PASSWORD|TOKEN|SECRET|NODE_OPTIONS/i.test(k))) process.exit(2); if(process.env.HOME===process.env.ECC_ORCHESTRATION_PARENT_HOME || process.cwd()===p.repoRoot) process.exit(3); if(!process.env.CODEX_HOME.includes('artifacts') || process.env.ECC_ORCHESTRATION_DB_ACCESS!=='none') process.exit(4); fs.writeFileSync(process.env.ECC_ORCHESTRATION_RESULT_FILE,JSON.stringify({summary:'isolated',revision:'fixture',checks:[],changedFiles:[],artifacts:[]}));`);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.completed, 1);
});

test('read-only worker writes are detected in its isolated tree', async t => {
  const f = fixture(t, 1);
  fs.writeFileSync(f.worker, `const fs=require('node:fs');fs.writeFileSync('sample.txt','unapproved write');fs.writeFileSync(process.env.ECC_ORCHESTRATION_RESULT_FILE,JSON.stringify({summary:'claimed read-only',revision:'fixture',checks:[],changedFiles:[],artifacts:[]}));`);
  const result = await runReady({ testHarness: true, filePath: f.filePath, execute: true, workerCommand: [process.execPath, f.worker], worktreeRoot: f.worktreeRoot });
  assert.equal(result.failed, 1);
  assert.equal(fs.readFileSync(path.join(f.repo, 'sample.txt'), 'utf8'), 'base');
});
