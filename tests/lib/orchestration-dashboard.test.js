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
  const ids = Object.fromEntries(['connection', 'run-summary', 'task-list', 'event-list',
    'observation-overview', 'phase-list', 'observation-list', 'agent-list', 'change-list',
    'observation-events'].map(id => [id, new Element('div')]));
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
  assert.match(ids.connection.textContent, /Connected/);
  assert.doesNotMatch(dashboardScript(), /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(renderDashboardHtml(), /<img|https?:\/\//);
});

function observedRun() {
  const value = run();
  value.observationOnly = true;
  value.tasks = [];
  value.observability = {
    schemaVersion: 1,
    plan: { title: 'Registration UI', reference: 'plans/registration.md', version: 'v2',
      summary: 'Approved interaction', at: '2026-11-17T10:00:00Z' },
    session: { status: 'active', updatedAt: '2026-11-17T10:00:00Z', evidence: 'Main AI session record' },
    lastRecordedAt: '2026-11-17T10:02:00Z',
    items: [
      { id: 'PLAN', title: 'Contract consolidation', phase: 'planning', owner: 'main', status: 'working',
        dependsOn: [], inputs: ['BA-v2'], attempts: [{ id: 'PLAN-1', workerId: 'main-ai', dispatch: null }] },
      { id: 'UI-A', title: '<script>untrusted()</script>', phase: 'implementation', owner: 'agent', status: 'prepared',
        currentAttemptId: 'UI-A-1', dependsOn: ['PLAN'], scope: ['src/a'], attempts: [{ id: 'UI-A-1',
          workerId: 'worker-a', worktree: '/isolated/a', dispatch: null }],
        wait: { waitingFor: 'dependency', reason: 'Contract decision pending', evidence: 'Q-01' } },
      { id: 'UI-B', title: 'Form', phase: 'implementation', owner: 'agent', status: 'result_received',
        currentAttemptId: 'UI-B-1', dependsOn: [], attempts: [{ id: 'UI-B-1', workerId: 'worker-b',
          dispatch: { provider: 'native', tool: 'spawn_agent', agentRef: '/root/form-worker', reference: 'call-123',
            evidence: 'Tool result recorded', at: '2026-11-17T10:01:00Z' } }],
        output: { revision: 'pinned-revision', outputHash: 'output-hash', summary: 'Submitted form', checks: [
          { name: 'component', status: 'not-run', evidence: 'Execution not authorized' }] },
        review: { verdict: 'changes_requested', evidence: 'Missing empty state' } }
    ],
    decisions: [{ phase: 'implementation', mode: 'parallel', reason: 'Disjoint ownership after contract',
      ready: ['UI-B'], blocked: [{ itemId: 'UI-A', reason: 'Needs contract answer' }], evidence: 'Code survey' }],
    changes: [{ type: 'work-revise', itemId: 'UI-B', reason: 'Added empty-state criterion', evidence: 'Reviewer finding' }],
    planHistory: [{ title: 'Registration UI', version: 'v1', reference: 'plans/registration-v1.md' }],
    events: [{ seq: 4, type: 'dispatch', itemId: 'UI-B', evidence: 'call-123', details: { agentRef: '/root/form-worker' } }],
    summary: { total: 3, counts: { prepared: 1, working: 1, result_received: 1 },
      preparedAwaitingDispatch: 1, dispatchRecorded: 1, mainWorking: 1, waiting: 0,
      readyItemIds: ['UI-B'], warnings: ['Dispatch references do not prove process liveness'] }
  };
  return value;
}

test('observation page exposes plan, phase rationale, main work and dispatch evidence separately', async () => {
  const { ids } = browser(async () => ({ ok: true, json: async () => observedRun() }));
  await settle();
  const overview = textOf(ids['observation-overview']);
  for (const expected of ['Registration UI', 'plans/registration.md', 'v2', 'Main AI session record',
    '2026-11-17T10:02:00Z', 'coordinator', 'liveness']) assert.ok(overview.includes(expected), expected);
  const phase = textOf(ids['phase-list']);
  for (const expected of ['implementation', 'parallel', 'Disjoint ownership', 'Needs contract answer']) {
    assert.ok(phase.includes(expected), expected);
  }
  const work = textOf(ids['observation-list']);
  for (const expected of ['Main AI', 'Contract consolidation', 'Prepared', 'awaiting dispatch',
    '<script>untrusted()</script>', 'Contract decision pending', 'pinned-revision', 'not-run', 'Missing empty state']) {
    assert.ok(work.includes(expected), expected);
  }
  const agents = textOf(ids['agent-list']);
  for (const expected of ['worker-a', 'No dispatch receipt', '/root/form-worker', 'spawn_agent', 'call-123']) {
    assert.ok(agents.includes(expected), expected);
  }
  assert.match(textOf(ids['change-list']), /Added empty-state criterion/);
  assert.match(textOf(ids['observation-events']), /call-123/);
  assert.doesNotMatch(dashboardScript(), /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(ids['run-summary'].textContent, /Running:|live agents|%/i);
});

test('legacy claimed attempts are not represented as verified live agents', async () => {
  const snapshot = run();
  snapshot.tasks[0].status = 'running';
  const { ids } = browser(async () => ({ ok: true, json: async () => snapshot }));
  await settle();
  assert.match(textOf(ids['task-list']), /Claimed.*not.*live/i);
  assert.match(textOf(ids['observation-overview']), /No observation ledger/);
  assert.doesNotMatch(ids['run-summary'].textContent, /Running:/);
});

test('retry has no current assignment while old dispatch remains explicitly historical', async () => {
  const snapshot = observedRun();
  const task = run().tasks[0];
  task.status = 'pending';
  task.currentAttemptId = null;
  task.attempts[0].status = 'failed';
  snapshot.tasks = [task];
  const item = snapshot.observability.items[2];
  item.status = 'planned';
  item.currentAttemptId = null;
  item.attempts[0].status = 'failed';
  snapshot.observability.items = [item];
  const { ids } = browser(async () => ({ ok: true, json: async () => snapshot }));
  await settle();
  const currentMetadata = textOf(ids['task-list'].children[0].children[2]);
  assert.match(currentMetadata, /Worker: Unassigned/);
  assert.match(currentMetadata, /Attempt: None/);
  assert.match(currentMetadata, /Worktree: None/);
  assert.doesNotMatch(currentMetadata, /worker-a|T1-1|safe\/worktree/);
  const attempts = textOf(ids['agent-list']);
  assert.match(attempts, /Historical attempt/);
  assert.match(attempts, /Attempt status: failed/);
  assert.match(attempts, /call-123/);
  assert.doesNotMatch(attempts, /Attempt role: Current/);
  assert.match(textOf(ids['observation-list']), /Current attempt: None/);
});

test('recorded progress labels do not equate a result, acceptance or integration with live activity', async () => {
  const snapshot = observedRun();
  snapshot.observability.items = ['planned', 'dispatched', 'accepted', 'integrated', 'waiting'].map((status, index) => ({
    id: 'STATE-' + index, title: status, phase: 'implementation', owner: 'agent', status, dependsOn: [], attempts: []
  }));
  const { ids } = browser(async () => ({ ok: true, json: async () => snapshot }));
  await settle();
  const work = textOf(ids['observation-list']);
  for (const label of ['Proposed / not started', 'Dispatch recorded', 'Acceptance recorded', 'Integration recorded', 'Waiting']) {
    assert.ok(work.includes(label), label);
  }
  assert.doesNotMatch(work, /\d+%|ETA|live worker/i);
});

test('invalid observation envelopes clear all work rather than presenting partial healthy data', async () => {
  const snapshot = observedRun();
  snapshot.observability.items[0].owner = 'unknown';
  const { ids } = browser(async () => ({ ok: true, json: async () => snapshot }));
  await settle();
  assert.match(ids.connection.textContent, /Offline/);
  assert.equal(textOf(ids['observation-list']), '');
  assert.doesNotMatch(textOf(ids['observation-overview']), /Registration UI/);
});

test('observation boards are cleared after a later failed refresh and polling remains two seconds', async () => {
  let calls = 0;
  const timers = [];
  const ids = Object.fromEntries(['connection', 'run-summary', 'task-list', 'event-list',
    'observation-overview', 'phase-list', 'observation-list', 'agent-list', 'change-list',
    'observation-events'].map(id => [id, new Element('div')]));
  const context = { document: { getElementById: id => ids[id], createElement: tag => new Element(tag) },
    fetch: async () => ++calls === 1 ? { ok: true, json: async () => observedRun() } : { ok: false },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return 0; },
    Date, JSON, String, Array, Object, Number };
  vm.createContext(context);
  vm.runInContext(dashboardScript(), context);
  await settle();
  assert.match(textOf(ids['observation-list']), /Contract consolidation/);
  assert.equal(timers[0].delay, 2000);
  await timers[0].callback();
  assert.match(ids.connection.textContent, /Offline/);
  for (const id of ['phase-list', 'observation-list', 'agent-list', 'change-list', 'observation-events']) {
    assert.doesNotMatch(textOf(ids[id]), /Contract consolidation|call-123|pinned-revision/);
  }
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
