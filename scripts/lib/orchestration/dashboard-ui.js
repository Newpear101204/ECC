'use strict';
/* global document */

function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ECC Orchestration · Plan execution</title><style>
:root{color-scheme:dark;font:15px system-ui;background:#10151c;color:#e1e8f0}
body{max-width:1400px;margin:0 auto;padding:24px}h1{margin-bottom:8px}h2{font-size:21px;margin-top:28px}
p{line-height:1.6;color:#b5c1cf}a{color:#8fcfff}nav{display:flex;flex-wrap:wrap;gap:16px;margin:20px 0}
#connection{padding:8px 12px;border:1px solid #466477;border-radius:6px;display:inline-block}
article{border:1px solid #364253;border-radius:8px;padding:16px;margin:12px 0;background:#17212c;min-width:0}
h3{margin:0 0 8px;font-size:17px}h4{margin:16px 0 4px}.status{color:#86c7fd}
.meta{color:#b5c1cf;white-space:pre-wrap;overflow-wrap:anywhere}.warning{color:#ffd794}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:12px}.grid article{margin:0}
details{margin-top:12px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
li{margin:8px 0;overflow-wrap:anywhere}.empty{padding:16px;border:1px dashed #475569}
.notice{padding:14px;border-left:3px solid #5898c6;background:#152331}.tag{font-size:13px;color:#a9d4bc}
@media(max-width:600px){body{padding:14px}article{padding:12px}nav{gap:10px}}
</style></head><body><header><h1>ECC Orchestration</h1>
<div id="connection" role="status" aria-live="polite">Connecting…</div>
<p class="notice">Read-only plan execution view. Coordinator-reported observations and execution receipts are separate.
Recorded dispatch is not proof that an agent is alive. No database access or autonomous scheduling.</p>
<p id="run-summary"></p>
<nav aria-label="Dashboard sections"><a href="#overview">Overview</a><a href="#phases">Phase decisions</a>
<a href="#work">Plan vs actual</a><a href="#agents">Agent evidence</a><a href="#history">History</a>
<a href="#execution">Execution gates</a></nav></header><main>
<section id="overview"><h2>Recorded plan and progress</h2><div id="observation-overview"></div></section>
<section id="phases"><h2>Phase decisions: why sequential or parallel?</h2><div id="phase-list" class="grid"></div></section>
<section id="work"><h2>Plan vs actual work</h2><div id="observation-list" class="grid"></div></section>
<section id="agents"><h2>Agent and attempt evidence</h2><div id="agent-list" class="grid"></div></section>
<section id="history"><h2>Plan changes</h2><div id="change-list"></div><h2>Observation timeline</h2><ol id="observation-events"></ol></section>
<section id="execution"><h2>Managed execution gates</h2>
<p>Existing task receipts retain their own scope, review and integration checks.
A claimed execution attempt may still be awaiting native dispatch.</p><div id="task-list" class="grid"></div>
<h2>Execution event timeline</h2><ol id="event-list"></ol></section>
</main><script src="/assets/dashboard.js" defer></script></body></html>`;
}

function dashboardClient() {
  'use strict';
  const byId = id => document.getElementById(id);
  const connection = byId('connection');
  const summary = byId('run-summary');
  const tasks = byId('task-list');
  const events = byId('event-list');
  const observationIds = ['observation-overview', 'phase-list', 'observation-list',
    'agent-list', 'change-list', 'observation-events'];
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
  function row(parent, label, value, className) {
    parent.appendChild(text('p', label + ': ' + readable(value), className || 'meta'));
  }
  function empty(parent, message) { parent.appendChild(text('p', message, 'empty')); }
  function currentAttempt(task) {
    return list(task.attempts).find(attempt => attempt.id === task.currentAttemptId) || {};
  }
  function taskMetadata(task) {
    const attempt = currentAttempt(task);
    const dependencies = list(task.dependsOn).map(dep => typeof dep === 'string'
      ? dep : dep.taskId + ' [' + dep.gate + ']').join(', ') || 'None';
    return [
      'Worker: ' + (attempt.workerId || 'Unassigned'),
      'Attempt: ' + (task.currentAttemptId || 'None'),
      'Worktree: ' + (attempt.worktree || 'None'),
      'Last activity: ' + (attempt.lastActivity || attempt.lastActivityAt || task.updatedAt || 'Unknown'),
      'Dependencies: ' + dependencies,
      'Waiting: ' + readable(task.wait || task.blockedReason || task.blocker || task.blockedReasons || task.reason),
    ].join(String.fromCharCode(10));
  }
  function taskDetails(task) {
    const output = task.output?.result || task.output || {};
    const details = document.createElement('details');
    details.appendChild(text('summary', 'Inputs, results and evidence'));
    for (const [label, value] of [
      ['Plan version', task.planVersion], ['Acceptance', task.acceptance], ['Scope', task.scope], ['Inputs', task.inputs],
      ['Summary', output.summary], ['Revision', output.revision || task.output?.revision],
      ['Output identity', task.output?.outputHash], ['Files changed', output.changedFiles],
      ['Checks', output.checks], ['Artifact paths', output.artifacts],
      ['Review', task.review], ['Integration', task.integration], ['Wait', task.wait], ['Attempts', task.attempts],
    ]) {
      details.appendChild(text('h4', label));
      details.appendChild(text('pre', readable(value)));
    }
    return details;
  }
  function renderExecutionTask(task) {
    const card = document.createElement('article');
    card.appendChild(text('h3', task.id + ' · ' + (task.title || task.id)));
    const status = task.status === 'running'
      ? 'Claimed / prepared — not verified live execution' : task.status;
    card.appendChild(text('div', status, 'status'));
    card.appendChild(text('p', taskMetadata(task), 'meta'));
    card.appendChild(taskDetails(task));
    return card;
  }
  function observationStatus(item) {
    const labels = {
      planned: 'Proposed / not started', prepared: 'Prepared · awaiting dispatch',
      dispatched: 'Dispatch recorded · liveness unverified', result_received: 'Result received · review pending',
      accepted: 'Acceptance recorded', integrated: 'Integration recorded', changes_requested: 'Changes requested',
      failed: 'Failure recorded', cancelled: 'Cancellation recorded', waiting: 'Waiting',
    };
    if (item.status === 'working') return item.owner === 'main'
      ? 'Main AI activity recorded' : 'Agent progress recorded · liveness unverified';
    return labels[item.status] || 'Unknown recorded status: ' + item.status;
  }
  function renderObservationOverview(observation) {
    const target = byId('observation-overview');
    const plan = observation.plan;
    if (plan) {
      target.appendChild(text('h3', plan.title));
      row(target, 'Plan source', plan.reference);
      row(target, 'Version', plan.version);
      row(target, 'Plan summary', plan.summary);
    } else empty(target, 'No plan reference recorded yet.');
    row(target, 'Recorded session', observation.session?.status || 'Unknown');
    row(target, 'Session evidence', observation.session?.evidence);
    row(target, 'Last coordinator record', observation.lastRecordedAt || 'Unknown');
    target.appendChild(text('p', 'These are coordinator-reported observations, not independently authenticated tool activity or process liveness.', 'notice'));
    const counts = observation.summary?.counts || {};
    row(target, 'Recorded work counts', Object.entries(counts).map(([key, count]) => key + ': ' + count).join(' · ') || 'None');
    row(target, 'Main AI working records', observation.summary?.mainWorking ?? 0);
    row(target, 'Prepared awaiting dispatch', observation.summary?.preparedAwaitingDispatch ?? 0);
    row(target, 'Outstanding dispatch receipts', observation.summary?.dispatchRecorded ?? 0);
    for (const warning of list(observation.summary?.warnings)) target.appendChild(text('p', warning, 'warning'));
    const last = Date.parse(observation.lastRecordedAt);
    if (Number.isFinite(last) && Date.now() - last > 60000) {
      target.appendChild(text('p', 'Last work record is over one minute old. A successful refresh does not imply work is progressing.', 'warning'));
    }
  }
  function renderDecisions(observation) {
    const target = byId('phase-list');
    const decisions = list(observation.decisions);
    if (!decisions.length) return empty(target, 'No phase decision recorded. A mode has not been established by this view.');
    for (const decision of decisions.slice(-30).reverse()) {
      const card = document.createElement('article');
      card.appendChild(text('h3', decision.phase + ' · ' + decision.mode));
      row(card, 'Reason', decision.reason);
      row(card, 'Ready work', list(decision.ready).join(', ') || 'None');
      row(card, 'Blocked work', decision.blocked);
      row(card, 'Evidence', decision.evidence);
      row(card, 'Recorded at', decision.at);
      target.appendChild(card);
    }
  }
  function renderWork(items) {
    const target = byId('observation-list');
    if (!items.length) return empty(target, 'No work items recorded. No agent activity is implied.');
    for (const item of items) {
      const card = document.createElement('article');
      card.appendChild(text('h3', item.id + ' · ' + item.title));
      card.appendChild(text('div', observationStatus(item), 'status'));
      row(card, 'Owner', item.owner === 'main' ? 'Main AI' : 'Agent');
      row(card, 'Phase', item.phase);
      row(card, 'Dependencies', list(item.dependsOn).join(', ') || 'None');
      row(card, 'Linked execution task', item.taskId || 'None — observation only');
      row(card, 'Current attempt', item.currentAttemptId || 'None');
      if (item.wait) row(card, 'Waiting', item.wait, 'warning');
      card.appendChild(taskDetails(item));
      target.appendChild(card);
    }
  }
  function renderAgents(items) {
    const target = byId('agent-list');
    const agentItems = items.filter(item => item.owner === 'agent');
    if (!agentItems.length) return empty(target, 'No agent-owned work recorded.');
    for (const item of agentItems) {
      const attempts = list(item.attempts);
      if (!attempts.length) {
        const card = document.createElement('article');
        card.appendChild(text('h3', item.id + ' · proposed agent work'));
        empty(card, 'No prepared attempt or dispatch receipt.');
        target.appendChild(card);
      }
      for (const attempt of attempts) {
        const card = document.createElement('article');
        card.appendChild(text('h3', item.id + ' / ' + attempt.id));
        row(card, 'Attempt role', attempt.id === item.currentAttemptId ? 'Current attempt' : 'Historical attempt (not current)');
        row(card, 'Attempt status', attempt.status || 'Unknown');
        row(card, 'Worker', attempt.workerId);
        row(card, 'Worktree', attempt.worktree);
        row(card, 'Last recorded activity', attempt.lastActivityAt);
        if (attempt.dispatch) {
          for (const label of ['provider', 'tool', 'agentRef', 'reference', 'evidence', 'at']) row(card, label, attempt.dispatch[label]);
          card.appendChild(text('p', 'Dispatch receipt recorded; process liveness is not independently verified.', 'warning'));
        } else empty(card, 'No dispatch receipt. Prepared work is not proof an agent started.');
        target.appendChild(card);
      }
    }
  }
  function renderHistory(observation) {
    const changes = byId('change-list');
    for (const change of list(observation.changes).slice(-50).reverse()) changes.appendChild(text('pre', readable(change)));
    if (!list(observation.changes).length) empty(changes, 'No plan/work changes recorded.');
    if (list(observation.planHistory).length) {
      const details = document.createElement('details');
      details.appendChild(text('summary', 'Previous plan versions'));
      details.appendChild(text('pre', readable(observation.planHistory)));
      changes.appendChild(details);
    }
    const target = byId('observation-events');
    row(target, 'Timeline coverage', 'Showing latest ' + Math.min(100, list(observation.events).length)
      + ' of ' + list(observation.events).length + ' retained observations');
    for (const event of list(observation.events).slice(-100).reverse()) target.appendChild(text('li', readable(event)));
    if (!list(observation.events).length) empty(target, 'No observation events recorded.');
    if (observation.droppedEvents) row(target, 'Older bounded events omitted', observation.droppedEvents);
  }
  function renderObservation(observation) {
    for (const id of observationIds) byId(id).replaceChildren();
    if (!observation) {
      empty(byId('observation-overview'), 'No observation ledger in this run. Only managed execution receipts are available.');
      return;
    }
    if (observation.schemaVersion !== 1 || !Array.isArray(observation.items)
      || observation.items.some(item => !item || typeof item.id !== 'string' || typeof item.status !== 'string'
        || !['main', 'agent'].includes(item.owner))) {
      throw new Error('Invalid observation ledger');
    }
    renderObservationOverview(observation);
    renderDecisions(observation);
    renderWork(observation.items);
    renderAgents(observation.items);
    renderHistory(observation);
  }
  function render(value) {
    if (!value || value.schemaVersion !== 1 || typeof value.id !== 'string'
      || !Array.isArray(value.tasks) || !Array.isArray(value.events)) throw new Error('Invalid snapshot');
    if (value.tasks.some(task => !task || typeof task.id !== 'string' || typeof task.status !== 'string')) throw new Error('Invalid task');
    renderObservation(value.observability);
    const claimed = value.tasks.filter(task => task.status === 'running').length;
    summary.textContent = 'Run: ' + value.id + ' · ' + (value.observationOnly ? 'Observation only' : 'Managed execution')
      + ' · Execution tasks: ' + value.tasks.length + ' · Claimed attempts: ' + claimed
      + (value.observationOnly ? '' : ' · Approval: ' + (value.approved ? 'recorded' : 'required') + ' · Paused: ' + Boolean(value.paused))
      + ' · Claims and dispatch records are not a live-agent count.';
    tasks.replaceChildren();
    for (const task of value.tasks) tasks.appendChild(renderExecutionTask(task));
    if (!value.tasks.length) empty(tasks, 'No managed execution tasks. Observation work does not authorize execution.');
    events.replaceChildren();
    for (const event of value.events.slice(-100).reverse()) events.appendChild(text('li', readable(event)));
    if (!value.events.length) events.appendChild(text('li', 'No execution events recorded.'));
    connection.textContent = 'Connected · JSON refreshed ' + new Date().toLocaleTimeString();
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
      for (const id of observationIds) byId(id).replaceChildren();
      empty(byId('observation-overview'), 'Observation state unavailable.');
    } finally {
      setTimeout(refresh, 2000);
    }
  }
  refresh();
}

function dashboardScript() { return '(' + dashboardClient.toString() + ')();'; }

module.exports = { renderDashboardHtml, dashboardScript };
