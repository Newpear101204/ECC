'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const { test } = require('node:test');
const { createOrchestrationDashboard } = require('../../scripts/lib/orchestration/dashboard');
const { renderDashboardHtml, dashboardScript } = require('../../scripts/lib/orchestration/dashboard-ui');

const run = () => ({
  schemaVersion: 1, id: 'example', approved: true, paused: false, maxWorkers: 3,
  tasks: [{ id: 'T1', title: '<img src=x onerror=alert(1)>', kind: 'code', status: 'needs_review',
    dependsOn: [{ taskId: 'T0', gate: 'integrated' }], currentAttemptId: 'T1-1',
    attempts: [{ id: 'T1-1', workerId: 'worker-a', worktree: '/safe/worktree', lastActivity: '2026-11-11T10:00:00Z' }],
    output: { revision: 'revision-a', summary: 'Submitted', changedFiles: ['src/task.js'],
      checks: [{ name: 'unit', status: 'passed', evidence: 'fixture log' }], artifacts: ['report.md'] },
    review: null, integration: null, blockedReason: 'Review required' }],
  events: [{ seq: 1, type: 'submit', taskId: 'T1', at: '2026-11-11T10:00:00Z' }]
});

function request(url, { method = 'GET', headers = {}, path } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers, ...(path ? { path } : {}) }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('dashboard serves an explicit snapshot and read-only assets without storage initialization', async t => {
  let reads = 0;
  const app = createOrchestrationDashboard({ port: 0, readSnapshot: () => { reads++; return run(); } });
  await app.listen();
  t.after(() => app.close());
  const page = await request(app.url);
  assert.equal(page.status, 200);
  assert.match(page.body, /Orchestration/);
  assert.match(page.headers['content-security-policy'], /script-src 'self'/);
  assert.equal(reads, 0);
  const asset = await request(app.url + '/assets/dashboard.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['content-type'], /javascript/);
  const api = await request(app.url + '/api/orchestration');
  assert.equal(api.status, 200);
  assert.equal(JSON.parse(api.body).id, 'example');
  assert.equal(reads, 1);
  const post = await request(app.url + '/api/orchestration/command', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(reads, 1);
  const arbitrary = await request(app.url + '/report.md');
  assert.equal(arbitrary.status, 404);
  assert.equal((await request(app.url, { path: 'http://[' })).status, 400);
});

test('dashboard rejects non-loopback bindings and untrusted Host/Origin before reading', async t => {
  for (const host of ['0.0.0.0', 'example.local', '127.0.0.1.evil.test', '::']) {
    assert.throws(() => createOrchestrationDashboard({ host, readSnapshot: run }), /loopback/i);
  }
  let reads = 0;
  const app = createOrchestrationDashboard({ port: 0, readSnapshot: () => { reads++; return run(); } });
  await app.listen();
  t.after(() => app.close());
  assert.equal((await request(app.url + '/api/orchestration', { headers: { Host: 'evil.test' } })).status, 403);
  assert.equal((await request(app.url + '/api/orchestration', { headers: { Origin: 'https://evil.test' } })).status, 403);
  assert.equal((await request(app.url + '/api/orchestration', { headers: { Origin: 'http://127.0.0.1:1' } })).status, 403);
  assert.equal(reads, 0);
});

test('unreadable or invalid snapshots return unavailable, not an empty healthy board', async t => {
  for (const readSnapshot of [() => { throw new Error('private detail'); }, () => ({}), () => ({ tasks: [] })]) {
    const app = createOrchestrationDashboard({ port: 0, readSnapshot });
    await app.listen();
    t.after(() => app.close());
    const response = await request(app.url + '/api/orchestration');
    assert.equal(response.status, 503);
    assert.doesNotMatch(response.body, /private detail/);
    assert.equal(JSON.parse(response.body).error, 'Run unavailable or invalid');
  }
});

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.textContent = ''; this.dataset = {}; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  setAttribute(name, value) { this[name] = value; }
}

function browser(fetch) {
  const ids = Object.fromEntries(['connection', 'run-summary', 'task-list', 'event-list'].map(id => [id, new Element('div')]));
  const context = {
    document: { getElementById: id => ids[id], createElement: tag => new Element(tag) },
    fetch, setTimeout: () => 0, clearTimeout: () => {},
    Date, JSON, String, Array, Object, Number,
  };
  vm.createContext(context);
  vm.runInContext(dashboardScript(), context);
  return { context, ids };
}
function textOf(element) { return element.textContent + element.children.map(textOf).join(' '); }
const settle = () => new Promise(resolve => setImmediate(resolve));

test('browser displays untrusted fields as text, task evidence, and event timeline', async () => {
  const { ids } = browser(async () => ({ ok: true, json: async () => run() }));
  await settle();
  const tasks = textOf(ids['task-list']);
  for (const expected of ['<img src=x onerror=alert(1)>', 'worker-a', '/safe/worktree', 'T1-1',
    'revision-a', 'unit', 'passed', 'fixture log', 'report.md', 'T0', 'integrated', 'Review required']) {
    assert.ok(tasks.includes(expected), expected);
  }
  assert.match(textOf(ids['event-list']), /submit/);
  assert.match(ids.connection.textContent, /Live/);
  assert.doesNotMatch(dashboardScript(), /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(renderDashboardHtml(), /<img|https?:\/\//);
});

test('browser clears a stale board and marks it offline after HTTP or envelope failure', async () => {
  for (const fetch of [async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({}) }),
    async () => { throw new Error('offline'); }]) {
    const { ids } = browser(fetch);
    await settle();
    assert.match(ids.connection.textContent, /Offline/);
    assert.match(textOf(ids['task-list']), /unavailable/i);
  }
});
