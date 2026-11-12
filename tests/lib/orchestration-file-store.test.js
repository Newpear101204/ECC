'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { createFileStore } = require('../../scripts/lib/orchestration/file-store');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-orchestration-json-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('ecc-orchestration-json-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, file: path.join(root, 'run', 'state.json') };
}
function plan() {
  return { schemaVersion: 1, id: 'run', repoRoot: process.cwd(), baseRef: 'HEAD', approved: true, maxWorkers: 3,
    tasks: [{ id: 'a', title: 'Read code', kind: 'explore', scope: ['src'], acceptance: ['Map'],
      dependsOn: [], inputs: [], validation: [], permissions: { database: 'none', executeTests: false } }] };
}

test('initialization and dispatch persist JSON across independent readers without clobbering', t => {
  const { file, root } = fixture(t);
  const store = createFileStore(file);
  store.init(plan());
  assert.throws(() => store.init(plan()), /exist/i);
  store.dispatch({ action: 'claim', taskId: 'a', workerId: 'explorer' });
  assert.equal(createFileStore(file).read().tasks[0].status, 'running');
  assert.equal(fs.readdirSync(path.dirname(file)).length, 1);
  assert.ok(fs.readFileSync(file, 'utf8').startsWith('{'));
  assert.ok(!fs.readdirSync(root).some(n => /sqlite|\.db$/.test(n)));
});

test('held lock reports busy without deleting lock or replaying a command', t => {
  const { file } = fixture(t);
  const store = createFileStore(file);
  store.init(plan());
  fs.mkdirSync(`${file}.lock`);
  assert.throws(() => store.dispatch({ action: 'claim', taskId: 'a', workerId: 'worker' }), /busy|lock/i);
  assert.ok(fs.existsSync(`${file}.lock`));
  assert.equal(store.read().tasks[0].status, 'ready');
});

test('rejects malformed persisted state, oversized input and nonregular targets', t => {
  const { file, root } = fixture(t);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{"schemaVersion":99}');
  assert.throws(() => createFileStore(file).read(), /schema|version|state/i);
  fs.writeFileSync(file, 'x'.repeat(4 * 1024 * 1024 + 1));
  assert.throws(() => createFileStore(file).read(), /large|size|limit/i);
  assert.throws(() => createFileStore(root).read(), /file|directory|regular/i);
  assert.throws(() => createFileStore(path.join(root, 'state.db')).init(plan()), /json|database/i);
  assert.ok(!fs.existsSync(path.join(root, 'state.db')));
});

test('symlinked state file and ancestor are rejected without touching target', t => {
  const { file, root } = fixture(t);
  const target = path.join(root, 'target');
  fs.mkdirSync(target);
  const link = path.join(root, 'linked');
  try { fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('Platform denies creating test symlink'); return; } throw error; }
  assert.throws(() => createFileStore(path.join(link, 'state.json')).init(plan()), /symlink|unsafe|link/i);
  assert.deepEqual(fs.readdirSync(target), []);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try { fs.symlinkSync(path.join(target, 'state.json'), file, 'file'); }
  catch (error) { if (error.code === 'EPERM') return; throw error; }
  assert.throws(() => createFileStore(file).init(plan()), /symlink|unsafe|link/i);
});

test('a separate process cannot duplicate an already claimed task', t => {
  const { file } = fixture(t);
  const store = createFileStore(file);
  store.init(plan());
  store.dispatch({ action: 'claim', taskId: 'a', workerId: 'first' });
  const modulePath = require.resolve('../../scripts/lib/orchestration/file-store');
  const child = spawnSync(process.execPath, ['-e',
    'const {createFileStore}=require(process.argv[1]); try {createFileStore(process.argv[2]).dispatch({action:"claim",taskId:"a",workerId:"second"});process.exit(7)}catch(e){process.stdout.write(e.message)}',
    modulePath, file], { encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.match(child.stdout, /ready|running|state/i);
  assert.equal(store.read().tasks[0].attempts.length, 1);
});

test('concurrent processes have a single winner for a ready task', async t => {
  const { file } = fixture(t);
  const store = createFileStore(file);
  store.init(plan());
  const modulePath = require.resolve('../../scripts/lib/orchestration/file-store');
  const code = 'const {createFileStore}=require(process.argv[1]);try {createFileStore(process.argv[2]).dispatch({action:"claim",taskId:"a",workerId:process.argv[3]});console.log("claimed")}catch(e){console.log("rejected:"+e.message)}';
  function run(worker) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', code, modulePath, file, worker], { windowsHide: true });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.on('error', reject);
      child.on('close', status => status === 0 ? resolve(output.trim()) : reject(new Error(`child exited ${status}`)));
    });
  }
  const results = await Promise.all([run('first'), run('second')]);
  assert.equal(results.filter(r => r === 'claimed').length, 1);
  assert.equal(results.filter(r => r.startsWith('rejected:')).length, 1);
  assert.equal(store.read().tasks[0].attempts.length, 1);
});

test('persisted accepted status cannot omit its review receipt', t => {
  const { file } = fixture(t);
  const store = createFileStore(file);
  store.init(plan());
  store.dispatch({ action: 'claim', taskId: 'a', workerId: 'worker' });
  const current = store.read();
  store.dispatch({ action: 'submit', taskId: 'a', attemptId: current.tasks[0].currentAttemptId,
    result: { summary: 'Map', revision: 'content-v1', artifacts: ['map.md'], checks: [], changedFiles: [] } });
  const tampered = store.read();
  tampered.tasks[0].status = 'accepted';
  tampered.tasks[0].attempts[0].status = 'accepted';
  fs.writeFileSync(file, JSON.stringify(tampered));
  assert.throws(() => store.read(), /review/i);
});
