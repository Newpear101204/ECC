'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { parseArgs, main } = require('../../scripts/orchestrate');
const { classifyWork } = require('../../scripts/lib/orchestration/classify');

test('small and ordered work avoids orchestration without pretending risk means parallelism', () => {
  assert.equal(classifyWork({ kind: 'question' }).mode, 'direct');
  assert.equal(classifyWork({ kind: 'change', small: true, risk: 'high' }).mode, 'direct');
  assert.equal(classifyWork({ kind: 'feature', independentStreams: 1 }).mode, 'sequential');
  assert.equal(classifyWork({ kind: 'feature', independentStreams: 3 }).mode, 'parallel');
  assert.equal(classifyWork({ kind: 'feature', independentStreams: 3, mode: 'direct' }).mode, 'direct');
  assert.throws(() => classifyWork({ mode: 'parallel', independentStreams: 1 }), /independent/i);
});

test('CLI rejects unknown flags and requires explicit JSON state path', () => {
  assert.throws(() => parseArgs(['status', '--other']), /Unknown/);
  assert.throws(() => parseArgs(['status']), /state/);
  assert.throws(() => parseArgs(['status', '--state', 'customer.db']), /JSON|json/);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-orchestrate-cli-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  for (const args of [['init', '-q'], ['config', 'user.email', 'fixture@example.invalid'],
    ['config', 'user.name', 'Fixture'], ['commit', '--allow-empty', '-qm', 'fixture']]) {
    const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('ecc-orchestrate-cli-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const state = path.join(root, 'run.json');
  const plan = path.join(root, 'plan.json');
  fs.writeFileSync(plan, JSON.stringify({ schemaVersion: 1, id: 'sample', repoRoot: repo,
    baseRef: 'HEAD', approved: false, maxWorkers: 3, tasks: [{ id: 'a', title: 'Map code',
      kind: 'explore', acceptance: ['Entry identified'], scope: [], dependsOn: [],
      inputs: [], validation: [], permissions: { database: 'none', executeTests: false } }] }));
  return { root, repo, state, plan };
}

test('init pins baseline, refuses overwrite, and approval is separate from execution', async t => {
  const f = fixture(t);
  const lines = [];
  const out = value => lines.push(value);
  assert.equal(await main(['init', f.plan, '--state', f.state], { out }), 0);
  const first = JSON.parse(fs.readFileSync(f.state, 'utf8'));
  assert.match(first.baseRef, /^[a-f0-9]{40,64}$/);
  assert.equal(first.approved, false);
  await assert.rejects(main(['init', f.plan, '--state', f.state], { out }), /exist/i);
  assert.equal(await main(['approve', '--state', f.state, '--by', 'operator', '--evidence', 'User approved this plan'], { out }), 0);
  assert.equal(JSON.parse(fs.readFileSync(f.state)).approved, true);
  for (const action of ['claim', 'submit']) {
    await assert.rejects(main(['dispatch', '--state', f.state, '--command',
      JSON.stringify({ action, taskId: 'a', workerId: 'reader', changedFiles: [] })], { out }), /prepare\/submit/);
  }
  assert.equal(await main(['status', '--state', f.state, '--json'], { out }), 0);
  assert.ok(lines.some(line => line.includes('ready')));
  await assert.rejects(main(['run', '--state', f.state, '--execute'], { out }), /worker-command/);
  const before = fs.readFileSync(f.state, 'utf8');
  assert.equal(await main(['run', '--state', f.state], { out }), 0);
  assert.equal(fs.readFileSync(f.state, 'utf8'), before);
});

test('prepared read-only tasks reject source edits after submission before review', async t => {
  const f = fixture(t);
  const lines = [];
  const out = value => lines.push(value);
  await main(['init', f.plan, '--state', f.state], { out });
  await main(['approve', '--state', f.state, '--by', 'owner', '--evidence', 'Fixture plan'], { out });
  await main(['prepare', '--state', f.state, '--task', 'a', '--worker', 'reader',
    '--worktree-root', path.join(f.root, 'worktrees')], { out });
  const prepared = JSON.parse(lines.at(-1));
  const result = path.join(f.root, 'result.json');
  const identity = { runId: 'sample', taskId: 'a', attemptId: prepared.attemptId };
  fs.writeFileSync(result, JSON.stringify({ ...identity, attemptId: 'a-previous',
    summary: 'Stale output', checks: [], artifacts: [] }));
  await assert.rejects(main(['submit', '--state', f.state, '--task', 'a', '--attempt', prepared.attemptId,
    '--result', result], { out }), /identity/);
  fs.writeFileSync(result, JSON.stringify({ ...identity, summary: 'Entry identified', checks: [], artifacts: [] }));
  await main(['submit', '--state', f.state, '--task', 'a', '--attempt', prepared.attemptId,
    '--result', result], { out });
  const task = JSON.parse(fs.readFileSync(f.state)).tasks[0];
  fs.writeFileSync(path.join(prepared.worktree, 'late.txt'), 'unreviewed');
  const review = { action: 'review', taskId: 'a', attemptId: prepared.attemptId,
    outputHash: task.output.outputHash, revision: task.output.revision,
    verdict: 'approved', reviewer: 'reviewer', evidence: 'Fixture', criteria: ['Entry identified'] };
  await assert.rejects(main(['dispatch', '--state', f.state, '--command', JSON.stringify(review)], { out }), /changed since submission/);
  assert.equal(JSON.parse(fs.readFileSync(f.state)).tasks[0].status, 'needs_review');
});

test('CLI cannot fake review/integration for a code task with an unavailable worktree', async t => {
  const f = fixture(t);
  const plan = JSON.parse(fs.readFileSync(f.plan));
  plan.tasks[0].kind = 'code';
  plan.tasks[0].scope = ['src'];
  plan.approved = true;
  fs.writeFileSync(f.plan, JSON.stringify(plan));
  const out = () => {};
  await main(['init', f.plan, '--state', f.state], { out });
  const command = { action: 'claim', taskId: 'a', workerId: 'writer', worktree: path.join(f.root, 'missing') };
  await assert.rejects(main(['dispatch', '--state', f.state, '--command', JSON.stringify(command)], { out }), /worktree|runtime/i);
  await assert.rejects(main(['dispatch', '--state', f.state, '--command', JSON.stringify({ action: 'integrate', taskId: 'a' })], { out }), /integrate/);
});

test('manual handoff isolates code, seals actual output, and records only a verified integration receipt', async t => {
  const f = fixture(t);
  const plan = JSON.parse(fs.readFileSync(f.plan));
  plan.tasks[0].kind = 'code';
  plan.tasks[0].scope = ['src'];
  fs.writeFileSync(f.plan, JSON.stringify(plan));
  const lines = [];
  const out = value => lines.push(value);
  await main(['init', f.plan, '--state', f.state], { out });
  await main(['approve', '--state', f.state, '--by', 'owner', '--evidence', 'Authorized fixture plan'], { out });
  await main(['prepare', '--state', f.state, '--task', 'a', '--worker', 'writer',
    '--worktree-root', path.join(f.root, 'worktrees')], { out });
  const prepared = JSON.parse(lines.at(-1));
  assert.notEqual(prepared.worktree, f.repo);
  const packet = JSON.parse(fs.readFileSync(prepared.packetFile));
  assert.equal(packet.task.permissions.database, 'none');
  assert.ok(packet.constraints.some(line => line.includes('No database')));
  fs.mkdirSync(path.join(prepared.worktree, 'src'));
  fs.writeFileSync(path.join(prepared.worktree, 'src/example.txt'), 'reviewed output');
  const result = path.join(f.root, 'result.json');
  fs.writeFileSync(result, JSON.stringify({ runId: 'sample', taskId: 'a', attemptId: prepared.attemptId,
    summary: 'Entry identified', revision: 'forged',
    changedFiles: [], checks: [], artifacts: [] }));
  await main(['submit', '--state', f.state, '--task', 'a', '--attempt', prepared.attemptId, '--result', result], { out });
  let task = JSON.parse(fs.readFileSync(f.state)).tasks[0];
  assert.equal(task.status, 'needs_review');
  assert.notEqual(task.output.revision, 'forged');
  assert.deepEqual(task.output.changedFiles, ['src/example.txt']);
  const review = { action: 'review', taskId: 'a', attemptId: prepared.attemptId,
    outputHash: task.output.outputHash, revision: task.output.revision,
    verdict: 'approved', reviewer: 'independent-reviewer', evidence: 'Inspected fixture diff',
    criteria: ['Entry identified'] };
  await main(['dispatch', '--state', f.state, '--command', JSON.stringify(review)], { out });
  task = JSON.parse(fs.readFileSync(f.state)).tasks[0];
  assert.equal(task.status, 'accepted');
  fs.mkdirSync(path.join(f.repo, 'src'));
  fs.writeFileSync(path.join(f.repo, 'src/example.txt'), 'reviewed output');
  for (const args of [['add', 'src/example.txt'], ['commit', '-qm', 'integrated fixture']]) {
    const r = spawnSync('git', args, { cwd: f.repo, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: f.repo, encoding: 'utf8' }).stdout.trim();
  await main(['integrate', '--state', f.state, '--task', 'a', '--commit', commit,
    '--by', 'integrator', '--evidence', 'Fixture content integrated'], { out });
  assert.equal(JSON.parse(fs.readFileSync(f.state)).tasks[0].status, 'integrated');
  await assert.rejects(main(['run', '--state', f.state, '--execute', '--worker-command', JSON.stringify([process.execPath, '-e', 'process.exit(0)'])], { out }), /sandbox|blocked/);
});
