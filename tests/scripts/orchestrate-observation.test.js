'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { main, parseArgs } = require('../../scripts/orchestrate');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-observation-cli-'));
  const pids = new Set();
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  for (const args of [['init', '-q'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '--allow-empty', '-qm', 'fixture']]) {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  t.after(async () => {
    for (const pid of pids) {
      try { process.kill(pid); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    if (pids.size) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('ecc-observation-cli-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const manifest = path.join(root, 'manifest.json');
  const state = path.join(root, 'run.json');
  fs.writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, id: 'feature-watch', repoRoot: repo, baseRef: 'HEAD' }));
  const event = path.join(root, 'event.json');
  const out = () => {};
  async function record(value) {
    fs.writeFileSync(event, JSON.stringify(value));
    await main(['record', '--state', state, '--event', event], { out });
    return JSON.parse(fs.readFileSync(state, 'utf8'));
  }
  return { root, repo, manifest, state, event, out, record, pids };
}

test('an observation run starts before execution approval without preparing workers', async t => {
  const f = fixture(t);
  await main(['observe-init', f.manifest, '--state', f.state], { out: f.out });
  const state = JSON.parse(fs.readFileSync(f.state, 'utf8'));
  assert.equal(state.observationOnly, true);
  assert.equal(state.approved, false);
  assert.deepEqual(state.tasks, []);
  assert.match(state.baseRef, /^[a-f0-9]{40,64}$/);
  assert.equal(fs.existsSync(`${f.state}.artifacts`), false);
  await assert.rejects(main(['observe-init', f.manifest, '--state', f.state], { out: f.out }), /exist/i);
});

test('record exposes phase decisions, main-AI progress and source evidence without mutating execution', async t => {
  const f = fixture(t);
  await main(['observe-init', f.manifest, '--state', f.state], { out: f.out });
  await f.record({ type: 'plan', title: 'Feature request', reference: 'BA-v1', version: 'draft-1',
    summary: 'Establish requirements', evidence: 'User supplied feature brief' });
  await f.record({ type: 'work-add', items: [{ id: 'PLAN', title: 'Main AI consolidates requirements',
    phase: 'planning', owner: 'main', acceptance: ['Open business decisions identified'] }],
  evidence: 'Approved inspection scope' });
  await f.record({ type: 'phase', phase: 'planning', mode: 'sequential', reason: 'One shared contract to reconcile',
    ready: ['PLAN'], blocked: [], evidence: 'BA and current source references inspected' });
  const prepared = await f.record({ type: 'prepare', itemId: 'PLAN', workerId: 'main-ai', evidence: 'Main session owns consolidation' });
  const item = prepared.observability.items.find(row => row.id === 'PLAN');
  const final = await f.record({ type: 'progress', itemId: 'PLAN', attemptId: item.currentAttemptId,
    summary: 'Comparing BA to current code', evidence: 'Read-only source inspection in main session' });
  assert.equal(final.observability.items[0].status, 'working');
  assert.equal(final.observability.decisions.at(-1).reason, 'One shared contract to reconcile');
  assert.deepEqual(final.tasks, []);
  assert.equal(final.approved, false);
  const lines = [];
  await main(['status', '--state', f.state], { out: line => lines.push(line) });
  assert.ok(lines.some(line => /observation|recorded/i.test(line)));
  assert.ok(lines.some(line => line.includes('PLAN')));
});

test('record refuses invalid evidence and unsafe input without changing state', async t => {
  const f = fixture(t);
  await main(['observe-init', f.manifest, '--state', f.state], { out: f.out });
  const before = fs.readFileSync(f.state, 'utf8');
  fs.writeFileSync(f.event, JSON.stringify({ type: 'session', status: 'ended' }));
  await assert.rejects(main(['record', '--state', f.state, '--event', f.event], { out: f.out }), /evidence/i);
  assert.equal(fs.readFileSync(f.state, 'utf8'), before);
  const target = path.join(f.root, 'source.json');
  const link = path.join(f.root, 'linked.json');
  fs.writeFileSync(target, '{}');
  try { fs.symlinkSync(target, link); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) return; throw error; }
  await assert.rejects(main(['record', '--state', f.state, '--event', link], { out: f.out }), /unsafe|symlink/i);
  assert.equal(fs.readFileSync(f.state, 'utf8'), before);
});

test('new commands require explicit JSON state and event paths', () => {
  assert.equal(parseArgs(['view', '--state', 'run.json']).command, 'view');
  assert.equal(parseArgs(['observe-init', 'manifest.json', '--state', 'run.json']).positionals[0], 'manifest.json');
  assert.throws(() => parseArgs(['view', '--state', 'legacy.sqlite']), /JSON/);
});

test('CLI view returns a reusable real URL whose snapshot reflects later observations', async t => {
  const f = fixture(t);
  await main(['observe-init', f.manifest, '--state', f.state], { out: f.out });
  const lines = [];
  const out = line => lines.push(line);
  await main(['view', '--state', f.state], { out });
  const first = JSON.parse(lines.at(-1));
  assert.equal(first.reused, false);
  f.pids.add(first.pid);
  assert.match(first.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  const health = await (await fetch(`${first.url}/health`)).json();
  assert.equal(health.instanceId, first.instanceId);
  await f.record({ type: 'plan', title: 'Plan visible after refresh', reference: 'BA-v1', version: '1',
    summary: 'Observe actual source', evidence: 'User feature input' });
  const response = await fetch(`${first.url}/api/orchestration`);
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.id, 'feature-watch');
  assert.equal(snapshot.observability.plan.title, 'Plan visible after refresh');
  assert.deepEqual(snapshot.tasks, []);
  const rejected = await fetch(`${first.url}/api/orchestration`, { method: 'POST', body: '{}' });
  assert.equal(rejected.status, 405);
  await main(['view', '--state', f.state], { out });
  const reused = JSON.parse(lines.at(-1));
  assert.equal(reused.reused, true);
  assert.equal(reused.url, first.url);
  assert.equal(reused.pid, first.pid);
});
