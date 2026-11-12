'use strict';
/* global document */

function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ECC Orchestration</title><style>
:root{color-scheme:dark;font:15px system-ui;background:#10151c;color:#e1e8f0}
body{max-width:1200px;margin:0 auto;padding:24px}h1{margin-bottom:8px}
p{line-height:1.6;color:#b5c1cf}#connection{padding:8px 12px;border:1px solid #466477;border-radius:6px;display:inline-block}
article{border:1px solid #364253;border-radius:8px;padding:16px;margin:12px 0;background:#17212c}
h3{margin:0 0 8px;font-size:17px}.status{color:#86c7fd}.meta{color:#b5c1cf;white-space:pre-wrap;overflow-wrap:anywhere}
details{margin-top:12px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
li{margin:8px 0;overflow-wrap:anywhere}.empty{padding:16px;border:1px dashed #475569}
@media(max-width:600px){body{padding:14px}article{padding:12px}}
</style></head><body><h1>ECC Orchestration</h1>
<div id="connection" role="status" aria-live="polite">Connecting…</div>
<p>Read-only view. Task completion requires evidence, review, and integration gates. No database access.</p>
<p id="run-summary"></p><main><h2>Tasks</h2><div id="task-list"></div>
<h2>Event timeline</h2><ol id="event-list"></ol></main>
<script src="/assets/dashboard.js" defer></script></body></html>`;
}

function dashboardClient() {
  'use strict';
  const connection = document.getElementById('connection');
  const summary = document.getElementById('run-summary');
  const tasks = document.getElementById('task-list');
  const events = document.getElementById('event-list');
  function text(tag, content, className) {
    const node = document.createElement(tag);
    node.textContent = String(content === null || content === undefined ? '—' : content);
    if (className) node.setAttribute('class', className);
    return node;
  }
  function list(value) { return Array.isArray(value) ? value : []; }
  function readable(value) {
    if (value === null || value === undefined) return '—';
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
  function currentAttempt(task) {
    return list(task.attempts).find(row => row.id === task.currentAttemptId)
      || list(task.attempts).slice(-1)[0] || {};
  }
  function taskMetadata(task) {
    const attempt = currentAttempt(task);
    const dependencies = list(task.dependsOn).map(row => typeof row === 'string'
      ? row : row.taskId + ' [' + row.gate + ']').join(', ') || 'None';
    return [
      'Worker: ' + (attempt.workerId || task.workerId || 'Unassigned'),
      'Attempt: ' + (task.currentAttemptId || attempt.id || 'None'),
      'Worktree: ' + (attempt.worktree || task.worktree || 'None'),
      'Last activity: ' + (attempt.lastActivity || attempt.lastActivityAt || task.updatedAt || 'Unknown'),
      'Dependencies: ' + dependencies,
      'Waiting: ' + readable(task.blockedReason || task.blocker || task.blockedReasons || task.reason),
    ].join('\n');
  }
  function taskDetails(task) {
    const output = task.output?.result || task.output || {};
    const details = document.createElement('details');
    details.appendChild(text('summary', 'Inputs, results and evidence'));
    for (const [label, value] of [
      ['Acceptance', task.acceptance], ['Scope', task.scope], ['Inputs', task.inputs],
      ['Summary', output.summary], ['Revision', output.revision || task.output?.revision],
      ['Output identity', task.output?.outputHash], ['Files changed', output.changedFiles],
      ['Checks', output.checks], ['Artifact paths', output.artifacts],
      ['Review', task.review], ['Integration', task.integration], ['Attempts', task.attempts],
    ]) {
      details.appendChild(text('h4', label));
      details.appendChild(text('pre', readable(value)));
    }
    return details;
  }
  function renderTask(task) {
    const card = document.createElement('article');
    card.appendChild(text('h3', task.id + ' · ' + (task.title || task.id)));
    card.appendChild(text('div', task.status, 'status'));
    card.appendChild(text('p', taskMetadata(task), 'meta'));
    card.appendChild(taskDetails(task));
    return card;
  }
  function render(value) {
    if (!value || value.schemaVersion !== 1 || typeof value.id !== 'string'
      || !Array.isArray(value.tasks) || !Array.isArray(value.events)) throw new Error('Invalid snapshot');
    if (value.tasks.some(task => !task || typeof task.id !== 'string' || typeof task.status !== 'string')) {
      throw new Error('Invalid task');
    }
    const running = value.tasks.filter(task => task.status === 'running').length;
    summary.textContent = 'Run: ' + value.id + ' · ' + (value.paused ? 'Paused' : value.approved ? 'Approved' : 'Awaiting approval')
      + ' · Running: ' + running + '/' + value.maxWorkers + ' · Tasks: ' + value.tasks.length;
    tasks.replaceChildren();
    for (const task of value.tasks) tasks.appendChild(renderTask(task));
    if (!value.tasks.length) tasks.appendChild(text('p', 'No tasks in this run.', 'empty'));
    events.replaceChildren();
    for (const event of value.events.slice(-100).reverse()) {
      events.appendChild(text('li', readable(event)));
    }
    if (!value.events.length) events.appendChild(text('li', 'No events recorded.'));
    connection.textContent = 'Live · refreshed ' + new Date().toLocaleTimeString();
  }
  async function refresh() {
    try {
      const response = await fetch('/api/orchestration', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Request failed');
      render(await response.json());
    } catch {
      connection.textContent = 'Offline · run state unavailable';
      summary.textContent = 'State could not be verified. No healthy or completed state is implied.';
      tasks.replaceChildren(text('p', 'Run state unavailable. Check the CLI and explicit JSON file.', 'empty'));
      events.replaceChildren();
    } finally {
      setTimeout(refresh, 2000);
    }
  }
  refresh();
}

function dashboardScript() { return '(' + dashboardClient.toString() + ')();'; }

module.exports = { renderDashboardHtml, dashboardScript };
