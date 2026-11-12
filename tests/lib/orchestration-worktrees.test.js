'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chooseBaseline, createTaskWorktree, fingerprintWorktree, verifyIntegrationCommit } = require('../../scripts/lib/orchestration/worktrees');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-worker-tree-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.autocrlf', 'false');
  fs.writeFileSync(path.join(repo, 'sample.txt'), 'base\n');
  git('add', 'sample.txt');
  git('commit', '-qm', 'fixture base');
  t.after(() => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, repo, git, base: git('rev-parse', 'HEAD') };
}

test('code worktree is isolated and fingerprint changes with tracked and untracked edits', t => {
  const f = fixture(t);
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.base, tasks: [] };
  const task = { id: 'backend', dependsOn: [] };
  const tree = createTaskWorktree({ state, task, attemptId: 'backend-1', worktreeRoot: path.join(f.root, 'trees') });
  assert.notEqual(tree.worktree, f.repo);
  assert.equal(fs.readFileSync(path.join(tree.worktree, 'sample.txt'), 'utf8'), 'base\n');
  const before = fingerprintWorktree(tree.worktree);
  fs.writeFileSync(path.join(tree.worktree, 'sample.txt'), 'changed\n');
  fs.writeFileSync(path.join(tree.worktree, 'added.txt'), 'new\n');
  const after = fingerprintWorktree(tree.worktree);
  assert.notEqual(after.revision, before.revision);
  assert.deepEqual(after.changedFiles, ['added.txt', 'sample.txt']);
  assert.equal(fs.readFileSync(path.join(f.repo, 'sample.txt'), 'utf8'), 'base\n');
  assert.throws(() => createTaskWorktree({ state, task, attemptId: 'backend-1', worktreeRoot: path.join(f.root, 'trees') }), /exist|branch/i);
});

test('baseline includes integrated dependencies and rejects mutable refs', t => {
  const f = fixture(t);
  const state = { repoRoot: f.repo, baseRef: f.base, tasks: [] };
  assert.equal(chooseBaseline(state, { dependsOn: [] }), f.base);
  assert.throws(() => chooseBaseline({ ...state, baseRef: 'HEAD' }, { dependsOn: [] }), /pinned/i);
  fs.writeFileSync(path.join(f.repo, 'sample.txt'), 'integration\n');
  f.git('commit', '-qam', 'fixture integrated');
  const integrated = f.git('rev-parse', 'HEAD');
  state.tasks = [{ id: 'upstream', integration: { commit: integrated } }];
  assert.equal(chooseBaseline(state, { dependsOn: [{ taskId: 'upstream', gate: 'integrated' }] }), integrated);
});

test('worktree roots cannot be inside source repo or symlink destinations', t => {
  const f = fixture(t);
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.base, tasks: [] };
  const task = { id: 'task', dependsOn: [] };
  assert.throws(() => createTaskWorktree({ state, task, attemptId: 'task-1', worktreeRoot: path.join(f.repo, 'nested') }), /outside/i);
  const target = path.join(f.root, 'real'); fs.mkdirSync(target);
  const link = path.join(f.root, 'link'); fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => createTaskWorktree({ state, task, attemptId: 'task-1', worktreeRoot: link }), /symlink/i);
});

test('fingerprinting rejects sensitive or database files without reading their content', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, 'local.sqlite'), 'not a database');
  assert.throws(() => fingerprintWorktree(f.repo), /database|sensitive/i);
});

test('integration receipt verifies exact reviewed content and rejects later edits', t => {
  const f = fixture(t);
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.base, tasks: [] };
  const task = { id: 'task', dependsOn: [], currentAttemptId: 'task-1', attempts: [] };
  const tree = createTaskWorktree({ state, task, attemptId: 'task-1', worktreeRoot: path.join(f.root, 'trees') });
  task.attempts.push({ id: 'task-1', worktree: tree.worktree, baseRevision: f.base });
  fs.writeFileSync(path.join(tree.worktree, 'sample.txt'), 'reviewed\n');
  task.output = fingerprintWorktree(tree.worktree);
  assert.throws(() => verifyIntegrationCommit(state, task, f.base), /reviewed output/);
  fs.writeFileSync(path.join(f.repo, 'sample.txt'), 'reviewed\n');
  f.git('commit', '-qam', 'operator integrated');
  const integrated = f.git('rev-parse', 'HEAD');
  assert.equal(verifyIntegrationCommit(state, task, integrated).commit, integrated);
  fs.writeFileSync(path.join(tree.worktree, 'sample.txt'), 'changed after review\n');
  assert.throws(() => verifyIntegrationCommit(state, task, integrated), /changed after submission/);
});

test('staged executable-mode changes alter fingerprints and integration must match modes', t => {
  const f = fixture(t);
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.base, tasks: [] };
  const task = { id: 'task', dependsOn: [], currentAttemptId: 'task-1', attempts: [] };
  const tree = createTaskWorktree({ state, task, attemptId: 'task-1', worktreeRoot: path.join(f.root, 'trees') });
  const before = fingerprintWorktree(tree.worktree);
  execFileSync('git', ['update-index', '--chmod=+x', 'sample.txt'], { cwd: tree.worktree, windowsHide: true });
  const after = fingerprintWorktree(tree.worktree);
  assert.notEqual(before.revision, after.revision);
  assert.deepEqual(after.changedFiles, ['sample.txt']);
  task.attempts = [{ id: 'task-1', worktree: tree.worktree, baseRevision: f.base }];
  task.output = after;
  assert.throws(() => verifyIntegrationCommit(state, task, f.base), /mode differs/);
});

test('tracked credential files are rejected before creating an executor checkout', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, '.env'), 'FICTIONAL_FIXTURE=1');
  f.git('add', '.env'); f.git('commit', '-qm', 'fixture unsafe tracked file');
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.git('rev-parse', 'HEAD'), tasks: [] };
  const root = path.join(f.root, 'trees');
  assert.throws(() => createTaskWorktree({ state, task: { id: 'task', dependsOn: [] }, attemptId: 'task-1', worktreeRoot: root }), /Sensitive/);
  assert.equal(fs.existsSync(root), false);
});

test('configured Git filter commands are refused before checkout can execute them', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, '.gitattributes'), 'sample.txt filter=fixture\n');
  f.git('add', '.gitattributes'); f.git('commit', '-qm', 'fixture attributes');
  const marker = path.join(f.root, 'filter-ran.txt');
  f.git('config', 'filter.fixture.smudge', `echo fixture > "${marker.replaceAll('\\', '/')}"`);
  const state = { id: 'run', repoRoot: f.repo, baseRef: f.git('rev-parse', 'HEAD'), tasks: [] };
  const root = path.join(f.root, 'trees');
  assert.throws(() => createTaskWorktree({ state, task: { id: 'task', dependsOn: [] }, attemptId: 'task-1', worktreeRoot: root }), /filter/i);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.existsSync(root), false);
});
