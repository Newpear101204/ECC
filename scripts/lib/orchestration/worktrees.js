'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const SHA = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function git(cwd, args, options = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^GIT_(?:DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|CONFIG|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)/.test(key)) delete env[key];
  }
  // Host-global aliases, credentials, and filter drivers are not part of a run.
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
  return execFileSync('git', ['-c', 'core.hooksPath=', '-c', 'core.fsmonitor=false', ...args],
    { cwd, env, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, ...options });
}

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function assertNoSymlinks(candidate) {
  const absolute = path.resolve(candidate);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink paths are not permitted for orchestration worktrees');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return absolute;
}

function commitAt(repoRoot, revision) {
  if (typeof revision !== 'string' || !SHA.test(revision)) throw new Error('A pinned Git commit SHA is required');
  const resolved = git(repoRoot, ['rev-parse', '--verify', `${revision}^{commit}`]).trim();
  if (!SHA.test(resolved)) throw new Error('Invalid resolved Git commit');
  return resolved;
}

function ancestor(repoRoot, before, after) {
  try { git(repoRoot, ['merge-base', '--is-ancestor', before, after], { stdio: ['ignore', 'pipe', 'pipe'] }); return true; }
  catch (error) { if (error.status === 1) return false; throw error; }
}

function chooseBaseline(state, task) {
  const base = commitAt(state.repoRoot, state.baseRef);
  const required = (task.dependsOn || []).filter(x => x.gate === 'integrated').map(dep => {
    const upstream = state.tasks.find(t => t.id === dep.taskId);
    if (!upstream?.integration?.commit) throw new Error(`Missing integrated commit for dependency ${dep.taskId}`);
    return commitAt(state.repoRoot, upstream.integration.commit);
  });
  const candidates = [...new Set([base, ...required])];
  const chosen = candidates.find(candidate => [base, ...required].every(other => ancestor(state.repoRoot, other, candidate)));
  if (!chosen) throw new Error('Dependency commits need an integrated common descendant before dispatch');
  return chosen;
}

function assertNoGitFilters(repoRoot) {
  let configured;
  try {
    configured = git(repoRoot, ['config', '--get-regexp', '^filter\\..*\\.(clean|smudge|process)$'], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) { if (error.status === 1) return; throw error; }
  if (configured.trim()) throw new Error('Configured Git filter commands are not permitted in orchestration checkouts');
}

function taskWorktreePath({ state, task, attemptId, worktreeRoot }) {
  for (const id of [state.id, task.id, attemptId]) if (!ID.test(id)) throw new Error('Unsafe task/worktree identifier');
  if (!worktreeRoot) throw new Error('An explicit worktreeRoot outside the source repository is required');
  const root = assertNoSymlinks(worktreeRoot);
  if (inside(state.repoRoot, root)) throw new Error('worktreeRoot must be outside the source repository');
  const worktree = path.join(root, `${state.id}-${attemptId}`);
  return { worktree, branch: `ecc-orchestration/${state.id}/${attemptId}`, root };
}

function createTaskWorktree(options) {
  const { state, task } = options;
  const target = taskWorktreePath(options);
  const baseRevision = chooseBaseline(state, task);
  assertNoGitFilters(state.repoRoot);
  // Inspect names/modes only: never copy credentials, live DB files or symlinks
  // into an executor checkout. This is not an OS sandbox.
  for (const entry of git(state.repoRoot, ['ls-tree', '-r', '-z', baseRevision]).split('\0').filter(Boolean)) {
    const separator = entry.indexOf('\t');
    const mode = entry.slice(0, 6);
    const relative = entry.slice(separator + 1);
    assertPublicPath(relative);
    if (!['100644', '100755'].includes(mode)) throw new Error('Executor checkouts do not admit symlinks or submodules');
  }
  if (fs.existsSync(target.worktree)) throw new Error('Worktree destination already exists');
  fs.mkdirSync(target.root, { recursive: true, mode: 0o700 });
  assertNoSymlinks(target.root);
  git(state.repoRoot, ['worktree', 'add', '-b', target.branch, '--', target.worktree, baseRevision], { stdio: ['ignore', 'pipe', 'pipe'] });
  return { worktree: target.worktree, branch: target.branch, baseRevision };
}

function assertPublicPath(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || path.posix.isAbsolute(relative)
    || [...relative].some(character => character.charCodeAt(0) < 32) || /[<>:"|?*]/.test(relative)
    || relative.split('/').some(p => !p || p === '..' || p === '.' || p.toLowerCase() === '.git')
    || /(?:^|\/)\.env(?:\.|$)|\.(?:db|sqlite|sqlite3|pem|key|p12|pfx)$/i.test(relative)
    || /(?:^|\/)(?:secrets?\.(?:json|ya?ml)|credentials|telegram-token\.xml|\.mcp\.json)$/i.test(relative)) {
    throw new Error('Sensitive or database paths cannot be inspected as worker artifacts');
  }
}

function fileBytes(worktree, relative) {
  assertPublicPath(relative);
  const absolute = path.resolve(worktree, relative);
  if (!inside(worktree, absolute)) throw new Error('Changed path escapes worktree');
  assertNoSymlinks(absolute);
  let stat;
  try { stat = fs.lstatSync(absolute); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('Worker artifact is not a bounded regular file');
  return fs.readFileSync(absolute);
}

function fingerprintWorktree(worktree) {
  assertNoSymlinks(worktree);
  assertNoGitFilters(worktree);
  const head = git(worktree, ['rev-parse', '--verify', 'HEAD']).trim();
  const tracked = git(worktree, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', '--no-renames', '-z', 'HEAD', '--']).split('\0').filter(Boolean);
  const untracked = git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const changedFiles = [...new Set([...tracked, ...untracked])].sort();
  const hash = crypto.createHash('sha256').update(head)
    .update(git(worktree, ['diff', '--no-ext-diff', '--no-textconv', '--raw', '--no-abbrev', '--no-renames', '-z', 'HEAD', '--']))
    .update(git(worktree, ['ls-files', '--stage', '-z']));
  let bytes = 0;
  for (const file of changedFiles) {
    const content = fileBytes(worktree, file);
    bytes += content?.length || 0;
    if (bytes > 16 * MAX_FILE_BYTES) throw new Error('Worker changes exceed the fingerprint limit');
    hash.update('\0').update(file).update('\0').update(content === null ? 'deleted' : 'file');
    if (content) hash.update(content);
  }
  return { revision: hash.digest('hex'), head, changedFiles };
}

function effectiveFileMode(worktree, relative) {
  const stat = fs.statSync(path.join(worktree, relative));
  if (process.platform !== 'win32') return stat.mode & 0o111 ? '100755' : '100644';
  const stage = git(worktree, ['ls-files', '--stage', '-z', '--', relative]);
  return stage ? stage.slice(0, 6) : '100644';
}

function currentAttempt(task) {
  const attempt = task.attempts.find(a => a.id === task.currentAttemptId);
  if (!attempt?.worktree) throw new Error('Task has no current worktree');
  return attempt;
}

function validateOutputRevision(state, task) {
  const attempt = currentAttempt(task);
  const actual = fingerprintWorktree(attempt.worktree);
  if (actual.revision !== task.output?.revision) throw new Error('Worker output changed after submission; a new attempt is required');
  return actual;
}

function verifyIntegrationCommit(state, task, commit) {
  const actualCommit = commitAt(state.repoRoot, commit);
  const integrationHead = git(state.repoRoot, ['rev-parse', '--verify', 'HEAD']).trim();
  if (!ancestor(state.repoRoot, actualCommit, integrationHead)) throw new Error('Integration commit is not on the integration checkout HEAD');
  const current = validateOutputRevision(state, task);
  const tree = currentAttempt(task).worktree;
  for (const file of task.output.changedFiles) {
    const bytes = fileBytes(tree, file);
    const descriptor = git(state.repoRoot, ['ls-tree', '-z', actualCommit, '--', file]);
    if (bytes === null && descriptor) throw new Error(`Integration commit does not contain reviewed output for ${file}`);
    if (bytes !== null && !descriptor) throw new Error(`Integration commit is missing ${file}`);
    const mode = descriptor.slice(0, 6);
    if (bytes !== null && mode !== effectiveFileMode(tree, file)) throw new Error(`Integration commit mode differs for ${file}`);
    const integrated = descriptor ? git(state.repoRoot, ['show', `${actualCommit}:${file}`], { encoding: null, stdio: ['ignore', 'pipe', 'pipe'] }) : null;
    if (bytes === null ? integrated !== null : integrated === null || !bytes.equals(integrated)) {
      throw new Error(`Integration commit does not contain reviewed output for ${file}`);
    }
  }
  return { commit: actualCommit, revision: current.revision };
}

module.exports = { chooseBaseline, createTaskWorktree, fingerprintWorktree, taskWorktreePath, validateOutputRevision, verifyIntegrationCommit };
