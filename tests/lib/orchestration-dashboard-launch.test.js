'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createFileStore } = require('../../scripts/lib/orchestration/file-store');
const { openDashboard } = require('../../scripts/lib/orchestration/dashboard-launch');

function request(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, res => {
      let body = '';
      res.on('data', value => { body += value; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(1000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    req.end();
  });
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-dashboard-launch-'));
  const filePath = path.join(root, 'run.json');
  const pids = new Set();
  t.after(() => {
    for (const pid of pids) {
      try { process.kill(pid); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('ecc-dashboard-launch-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  createFileStore(filePath).init({ schemaVersion: 1, id: 'launch-fixture',
    repoRoot: root, baseRef: 'fixture-base', maxWorkers: 1, tasks: [
      { id: 'inspect', title: 'Read source', kind: 'explore', acceptance: ['Source mapped'],
        permissions: { database: 'none', executeTests: false } }
    ] });
  return { root, filePath, pids, marker: `${filePath}.dashboard.json` };
}

test('starts a passive JSON dashboard and reuses only its verified instance', async t => {
  const f = fixture(t);
  const original = fs.readFileSync(f.filePath, 'utf8');
  const first = await openDashboard({ filePath: f.filePath });
  f.pids.add(first.pid);
  assert.equal(first.reused, false);
  assert.equal(first.runId, 'launch-fixture');
  assert.match(first.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  const health = await request(first.url + '/health');
  assert.equal(JSON.parse(health.body).instanceId, first.instanceId);
  assert.equal((await request(first.url + '/api/orchestration', 'POST')).status, 405);
  const second = await openDashboard({ filePath: f.filePath });
  assert.equal(second.reused, true);
  assert.equal(second.url, first.url);
  assert.equal(second.pid, first.pid);
  assert.equal(fs.readFileSync(f.filePath, 'utf8'), original);
});

test('a stopped dashboard gets a new instance without killing stale metadata PIDs', async t => {
  const f = fixture(t);
  const first = await openDashboard({ filePath: f.filePath });
  process.kill(first.pid);
  for (let attempt = 0; attempt < 20; attempt++) {
    try { await request(first.url + '/health'); } catch { break; }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  const metadata = JSON.parse(fs.readFileSync(f.marker, 'utf8'));
  fs.writeFileSync(f.marker, JSON.stringify({ ...metadata, pid: process.pid }));
  const next = await openDashboard({ filePath: f.filePath });
  f.pids.add(next.pid);
  assert.equal(next.reused, false);
  assert.notEqual(next.instanceId, first.instanceId);
  assert.equal(process.kill(process.pid, 0), true);
});

test('invalid marker destinations and existing locks fail closed', async t => {
  const f = fixture(t);
  fs.writeFileSync(f.marker, JSON.stringify({ schemaVersion: 1, filePath: f.filePath,
    runId: 'launch-fixture', pid: process.pid, instanceId: 'fixture', url: 'http://example.com:80' }));
  await assert.rejects(openDashboard({ filePath: f.filePath }), /metadata|loopback|URL/i);
  fs.unlinkSync(f.marker);
  fs.mkdirSync(`${f.marker}.lock`);
  await assert.rejects(openDashboard({ filePath: f.filePath }), /lock|another|busy/i);
  assert.ok(fs.statSync(`${f.marker}.lock`).isDirectory());
});

test('symlink state or metadata cannot redirect dashboard file access', async t => {
  const f = fixture(t);
  const alias = path.join(f.root, 'alias.json');
  try { fs.symlinkSync(f.filePath, alias); } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('File symlinks unavailable'); return; }
    throw error;
  }
  await assert.rejects(openDashboard({ filePath: alias }), /symlink|Unsafe/i);
  fs.symlinkSync(f.filePath, f.marker);
  await assert.rejects(openDashboard({ filePath: f.filePath }), /symlink|Unsafe|regular/i);
});

test('port conflict rejects startup and releases its launch lock', async t => {
  const f = fixture(t);
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  await assert.rejects(openDashboard({ filePath: f.filePath, port: server.address().port }), /EADDRINUSE|address|startup/i);
  assert.equal(fs.existsSync(`${f.marker}.lock`), false);
  assert.equal(fs.existsSync(f.marker), false);
});

test('hardlinked metadata is refused without changing the linked target', async t => {
  const f = fixture(t);
  const target = path.join(f.root, 'foreign.json');
  fs.writeFileSync(target, 'keep this content');
  fs.linkSync(target, f.marker);
  await assert.rejects(openDashboard({ filePath: f.filePath }), /Unsafe|regular/i);
  assert.equal(fs.readFileSync(target, 'utf8'), 'keep this content');
});

test('invalid ports/timeouts and symlinked directory ancestors fail before launch', async t => {
  const f = fixture(t);
  for (const port of [-1, 65536, 1.5, '0']) {
    await assert.rejects(openDashboard({ filePath: f.filePath, port }), /port/);
  }
  for (const timeoutMs of [0, 99, 30001, Infinity]) {
    await assert.rejects(openDashboard({ filePath: f.filePath, timeoutMs }), /timeout/);
  }
  const alias = path.join(f.root, 'linked-directory');
  fs.symlinkSync(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(openDashboard({ filePath: path.join(alias, 'run.json') }), /symlink|Unsafe/);
  assert.equal(fs.existsSync(f.marker), false);
});

test('health probes have an absolute deadline even when a stale local server streams data', async t => {
  const f = fixture(t);
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(' ');
    const timer = setInterval(() => res.write(' '), 20);
    res.once('close', () => clearInterval(timer));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const foreignPort = server.address().port;
  fs.writeFileSync(f.marker, JSON.stringify({ schemaVersion: 1, filePath: f.filePath,
    runId: 'launch-fixture', pid: process.pid, instanceId: crypto.randomUUID(),
    url: `http://127.0.0.1:${foreignPort}` }));
  const startedAt = Date.now();
  const launched = await openDashboard({ filePath: f.filePath, timeoutMs: 1000 });
  f.pids.add(launched.pid);
  assert.equal(launched.reused, false);
  assert.notEqual(new URL(launched.url).port, String(foreignPort));
  assert.ok(Date.now() - startedAt < 3000, 'probe did not respect its wall-clock deadline');
});
