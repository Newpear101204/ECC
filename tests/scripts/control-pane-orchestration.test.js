'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseOrchestrationArgs } = require('../../scripts/control-pane');

test('orchestration control-pane mode requires a JSON run and cannot enable actions', () => {
  const parsed = parseOrchestrationArgs(['node', 'control-pane', '--orchestration', 'run.json', '--port', '0', '--no-open']);
  assert.ok(parsed.filePath.endsWith('run.json'));
  assert.equal(parsed.port, 0);
  assert.equal(parsed.readOnly, true);
  assert.throws(() => parseOrchestrationArgs(['node', 'control-pane', '--orchestration', 'live.db']), /json/i);
  assert.throws(() => parseOrchestrationArgs(['node', 'control-pane', '--orchestration', 'run.json', '--db', 'existing.db']), /Unknown/);
});

test('DB-free branch serves a real core snapshot without loading SQLite modules', async t => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const Module = require('node:module');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-orchestration-pane-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('ecc-orchestration-pane-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const filePath = path.join(directory, 'run.json');
  const store = require('../../scripts/lib/orchestration/file-store').createFileStore(filePath);
  store.init({ schemaVersion: 1, id: 'pane', repoRoot: directory, baseRef: 'fictional-revision',
    maxWorkers: 3, approved: false, tasks: [{ id: 'read', title: 'Read code', kind: 'explore',
      acceptance: ['Entry located'], scope: [], dependsOn: [], inputs: [], validation: [],
      permissions: { database: 'none', executeTests: false } }] });
  const originalLoad = Module._load;
  Module._load = function guardedLoad(name, ...args) {
    if (/sql\.js|state-store|control-pane[/\\]state/.test(name)) throw new Error('Database path must not load');
    return originalLoad.call(this, name, ...args);
  };
  let app;
  try {
    app = await require('../../scripts/control-pane').main(['node', 'control-pane',
      '--orchestration', filePath, '--port', '0', '--no-open']);
    const response = await fetch(new URL('/api/orchestration', app.url));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.id, 'pane');
    assert.equal(payload.tasks.length, 1);
  } finally {
    if (app) await app.close();
    Module._load = originalLoad;
  }
});
