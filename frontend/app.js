const API_BASE = window.location.origin;
const N8N_WEBHOOK_URL = 'https://n8n.aix.devx.systems/webhook/cbc9a13e-952e-4708-83d4-eac803e99a93';
const CALLBACK_BASE_URL = window.location.origin;
let allWorkflows = [];
let allEvents = [];
let currentFilter = 'all';
let pollingInterval = null;
let submittedWorkflowId = null;

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  if (view === 'launcher' && submittedWorkflowId) pollSubmittedWorkflow();
  if (view === 'events') loadEvents();
  if (view === 'dashboard') loadDashboard();
  if (view === 'bpmn') renderBPMN();
  lucide.createIcons();
}

function handleFileSelect(input, nameId) {
  const nameEl = document.getElementById(nameId);
  const zone = input.closest('.file-input-wrap');
  if (input.files.length > 0) {
    nameEl.textContent = `${input.files[0].name} (${formatBytes(input.files[0].size)})`;
    nameEl.classList.add('visible');
    zone.classList.add('has-file');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  ['dropzone-source1', 'dropzone-source2'].forEach(id => {
    const zone = document.getElementById(id);
    if (!zone) return;
    const input = zone.querySelector('input[type=file]');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
    zone.addEventListener('dragleave', () => zone.style.borderColor = '');
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        handleFileSelect(input, input.id === 'source1' ? 'source1-name' : 'source2-name');
      }
    });
  });

  startPolling();
  renderBPMN();
});

async function submitWorkflow(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const source1Input = document.getElementById('source1');
  const source2Input = document.getElementById('source2');
  const description = document.getElementById('description').value;

  if (!source1Input.files.length && !source2Input.files.length) {
    showToast('Please upload at least one file', 'warning');
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = 'Submitting...';

  try {
    const createData = new FormData();
    if (source1Input.files[0]) createData.append('source1', source1Input.files[0]);
    if (source2Input.files[0]) createData.append('source2', source2Input.files[0]);
    createData.append('description', description);

    const res = await fetch(`${API_BASE}/api/workflows`, { method: 'POST', body: createData });
    const workflow = await res.json();
    const workflowId = workflow.workflowId;

    showToast(`Submission accepted. Your workflow ID: ${workflowId.substring(0, 12)}...`, 'success');

    submittedWorkflowId = workflowId;
    showSubmittedCard(workflow);

    await submitToN8nViaForm(source1Input, source2Input, workflowId, description);

    try {
      await fetch(`${API_BASE}/api/workflows/${workflowId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PARSING' })
      });
    } catch (err) { }

    document.getElementById('workflow-form').reset();
    ['source1-name', 'source2-name'].forEach(id => {
      const el = document.getElementById(id);
      el.classList.remove('visible');
      el.textContent = '';
    });
    document.querySelectorAll('.file-input-wrap').forEach(z => z.classList.remove('has-file'));
    pollSubmittedWorkflow();
  } catch (err) {
    console.error('Workflow error:', err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = '<i data-lucide="send" class="btn-svg"></i> Submit';
    lucide.createIcons();
  }
}

function submitToN8nViaForm(source1Input, source2Input, workflowId, description) {
  return new Promise((resolve) => {
    const iframeName = 'n8n_frame_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = N8N_WEBHOOK_URL;
    form.enctype = 'multipart/form-data';
    form.target = iframeName;
    form.style.display = 'none';

    if (source1Input.files.length > 0) {
      const newSource1 = document.createElement('input');
      newSource1.type = 'file';
      newSource1.name = 'source1';
      const dt1 = new DataTransfer();
      dt1.items.add(source1Input.files[0]);
      newSource1.files = dt1.files;
      form.appendChild(newSource1);
    }

    if (source2Input.files.length > 0) {
      const newSource2 = document.createElement('input');
      newSource2.type = 'file';
      newSource2.name = 'source2';
      const dt2 = new DataTransfer();
      dt2.items.add(source2Input.files[0]);
      newSource2.files = dt2.files;
      form.appendChild(newSource2);
    }

    const addHidden = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    addHidden('workflowId', workflowId);
    addHidden('description', description || '');
    addHidden('baseUrl', CALLBACK_BASE_URL);
    addHidden('callbackUrl', `${CALLBACK_BASE_URL}/api/workflows/${workflowId}/status`);

    document.body.appendChild(form);

    iframe.onload = () => {
      setTimeout(() => {
        try { document.body.removeChild(form); } catch (e) { }
        try { document.body.removeChild(iframe); } catch (e) { }
      }, 2000);
      resolve(true);
    };

    form.submit();
    setTimeout(() => { resolve(true); }, 15000);
  });
}

function showSubmittedCard(wf) {
  const card = document.getElementById('submitted-workflow-card');
  card.style.display = 'block';
  renderSubmittedCard(wf);
}

function renderSubmittedCard(wf) {
  const card = document.getElementById('submitted-workflow-card');
  const statusMap = {
    'STARTED': 'Started', 'PARSING': 'In Progress',
    'EVENT_CREATED': 'Event Created', 'VERIFYING': 'Verifying',
    'COMPLETED': 'Completed', 'COMPLETED_WITH_FAILURE': 'Failed', 'FAILED': 'Failed'
  };
  const statusLabel = statusMap[wf.status] || wf.status;
  const isComplete = wf.status === 'COMPLETED';
  const isFailed = wf.status === 'FAILED' || wf.status === 'COMPLETED_WITH_FAILURE';
  const statusClass = isComplete ? 'status-completed' : isFailed ? 'status-failed' : 'status-progress';

  card.innerHTML = `
    <div class="card-header">
      <i data-lucide="activity" class="header-icon"></i>
      <h2>Submitted Event Status</h2>
    </div>
    <div class="submitted-card-body">
      <div class="submitted-info-row">
        <span class="submitted-label">Workflow ID</span>
        <span class="submitted-value" data-testid="text-submitted-id">${wf.workflowId.substring(0, 16)}...</span>
      </div>
      <div class="submitted-info-row">
        <span class="submitted-label">Description</span>
        <span class="submitted-value" data-testid="text-submitted-desc">${wf.description || 'No description'}</span>
      </div>
      <div class="submitted-info-row">
        <span class="submitted-label">Source 1</span>
        <span class="submitted-value">${wf.source1FileName || '—'}</span>
      </div>
      <div class="submitted-info-row">
        <span class="submitted-label">Source 2</span>
        <span class="submitted-value">${wf.source2FileName || '—'}</span>
      </div>
      <div class="submitted-info-row">
        <span class="submitted-label">Status</span>
        <span class="submitted-status ${statusClass}" data-testid="text-submitted-status">
          <i data-lucide="${isComplete ? 'check-circle-2' : isFailed ? 'alert-circle' : 'loader'}" class="status-icon-sm"></i>
          ${statusLabel}
        </span>
      </div>
      ${buildProgressBar(wf)}
    </div>
  `;
  lucide.createIcons();
}

function pollSubmittedWorkflow() {
  if (!submittedWorkflowId) return;
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workflows`);
      const workflows = await res.json();
      const wf = workflows.find(w => w.workflowId === submittedWorkflowId);
      if (wf) {
        renderSubmittedCard(wf);
        if (wf.status === 'COMPLETED' || wf.status === 'FAILED' || wf.status === 'COMPLETED_WITH_FAILURE') {
          clearInterval(interval);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, 3000);
}

let workflowSort = { field: 'createdAt', dir: 'desc' };

let eventSort = { field: 'createdAt', dir: 'desc' };

function performSort(array, sortKey, direction) {
  return array.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

async function refreshWorkflows() {
  try {
    const res = await fetch(`${API_BASE}/api/workflows`);
    allWorkflows = await res.json();
    renderWorkflowList();

  } catch (err) {
    console.error('Refresh error:', err);
  }
}

const WORKFLOW_STEPS = [
  { key: 'STARTED', label: 'Agent Started', icon: 'play' },
  { key: 'PARSING', label: 'Creation in Progress', icon: 'cog' },
  { key: 'VERIFYING', label: 'Verification in Progress', icon: 'shield-check' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check-circle-2' }
];

function getStepIndex(status) {
  if (status === 'STARTED') return 0;
  if (status === 'PARSING' || status === 'EVENT_CREATED') return 1;
  if (status === 'VERIFYING') return 2;
  if (status === 'COMPLETED') return 3;
  if (status === 'COMPLETED_WITH_FAILURE' || status === 'FAILED') return -1;
  return 0;
}

function buildProgressBar(wf) {
  const stepIdx = getStepIndex(wf.status);
  const isFailed = wf.status === 'FAILED' || wf.status === 'COMPLETED_WITH_FAILURE';
  const isComplete = wf.status === 'COMPLETED';
  const fillPct = isComplete ? 100 : isFailed ? 0 : (stepIdx / (WORKFLOW_STEPS.length - 1)) * 100;

  const createdTime = formatShortTime(wf.createdAt);
  const updatedTime = formatShortTime(wf.updatedAt);

  let stepsHtml = WORKFLOW_STEPS.map((step, i) => {
    let dotClass = '';
    let labelClass = '';
    let timeStr = '';

    if (isFailed) {
      dotClass = i === 0 ? 'done' : (i <= 1 ? 'error' : '');
      if (i === 0) timeStr = createdTime;
    } else if (i < stepIdx) {
      dotClass = 'done';
      if (i === 0) timeStr = createdTime;
    } else if (i === stepIdx) {
      dotClass = isComplete ? 'done' : 'active';
      labelClass = isComplete ? 'done' : 'active';
      timeStr = i === 0 ? createdTime : updatedTime;
    }

    const iconName = (dotClass === 'error') ? 'x' : (dotClass === 'done' ? 'check' : step.icon);

    return `<div class="progress-step">
      <div class="step-dot ${dotClass}"><i data-lucide="${iconName}"></i></div>
      <div class="step-label ${labelClass}">${step.label}</div>
      ${timeStr ? `<div class="step-time">${timeStr}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="progress-bar-wrap">
    <div class="progress-steps">
      <div class="progress-line"><div class="progress-line-fill" style="width:${fillPct}%"></div></div>
      ${stepsHtml}
    </div>
  </div>`;
}

function renderWorkflowList() {
  const list = document.getElementById('workflow-list');
  if (!allWorkflows.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="inbox" class="empty-svg"></i><p>No workflows yet. Upload files to get started.</p></div>`;
    lucide.createIcons();
    return;
  }

  const sortedWF = performSort([...allWorkflows], workflowSort.field, workflowSort.dir);

  list.innerHTML = sortedWF.map(wf => `
    <div class="wf-card" onclick="viewWorkflowEvent('${wf.eventId || ''}', '${wf.workflowId}')" data-testid="card-workflow-${wf.workflowId.substring(0,8)}">
      <div class="wf-card-top">
        <div class="wf-card-info">
          <div class="wf-id">${wf.workflowId.substring(0, 12)}...</div>
          <div class="wf-desc">${wf.description || 'No description'}</div>
          <div class="wf-files">
            <i data-lucide="file-spreadsheet" class="wf-files-svg"></i> ${wf.source1FileName || 'N/A'}
            <span style="color:var(--text-muted);margin:0 4px">|</span>
            <i data-lucide="file-check" class="wf-files-svg"></i> ${wf.source2FileName || 'N/A'}
          </div>
          ${wf.cusip ? `<div class="wf-files">ID: <strong>${wf.cusip}</strong> &nbsp; <span class="type-badge type-${getTypeClass(wf.eventType)}">${wf.eventType || 'Detecting...'}</span></div>` : ''}
          <div class="wf-time">${formatDetailedTime(wf.createdAt)} (${timeAgo(wf.createdAt)})</div>
        </div>
        <span class="status-badge status-${wf.status}">${formatStatus(wf.status)}</span>
      </div>
      ${buildProgressBar(wf)}
    </div>
  `).join('');

  lucide.createIcons();
}


async function loadEvents() {
  try {
    let url = `${API_BASE}/api/events`;
    if (currentFilter !== 'all') url += `?status=${encodeURIComponent(currentFilter)}`;
    const res = await fetch(url);
    allEvents = await res.json();
    renderEventsTable();
  } catch (err) {
    console.error('Load events error:', err);
  }
}

function renderEventsTable() {
  const tbody = document.getElementById('events-tbody');
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '');
  const activeIcon = document.getElementById(`sort-${eventSort.field}`);
  if (activeIcon) activeIcon.textContent = eventSort.dir === 'desc' ? ' \u2193' : ' \u2191';

  if (!allEvents.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">No events found</td></tr>';
    return;
  }

  const sortedEvents = performSort([...allEvents], eventSort.field, eventSort.dir);

  tbody.innerHTML = sortedEvents.map(ev => `
    <tr>
      <td><code style="font-size:11px;background:var(--bg-body);padding:2px 6px;border-radius:3px">${ev.eventId}</code></td>
      <td><span class="type-badge type-${getTypeClass(ev.eventType)}">${ev.eventType}</span></td>
      <td><strong>${ev.cusip}</strong></td>
      <td>${ev.principalRate?.toFixed(2) || '-'}</td>
      <td>${ev.securityCalledAmount ? ev.securityCalledAmount.toLocaleString() : '-'}</td>
      <td>${ev.payableDate || '-'}</td>
      <td><span class="status-badge status-${ev.status?.replace(/\s/g, '-')}">${ev.status}</span></td>
      <td style="font-size:11px;color:var(--text-muted)">${formatDetailedTime(ev.createdAt)}</td>
      <td>${ev.confidenceScore ? `${(ev.confidenceScore * 100).toFixed(0)}%` : '-'}</td>
      <td><button class="btn-view" onclick="viewEventDetail('${ev.eventId}')" data-testid="button-view-event-${ev.eventId}">View</button></td>
    </tr>
  `).join('');
}

function updateEventSort(field) {
  if (eventSort.field === field) {
    eventSort.dir = eventSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    eventSort.field = field;
    eventSort.dir = 'desc';
  }
  renderEventsTable();
}

function filterEvents(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  loadEvents();
}

function searchEvents(query) {
  if (!query) { renderEventsTable(); return; }
  const filtered = allEvents.filter(ev =>
    (ev.cusip?.toLowerCase().includes(query.toLowerCase())) ||
    (ev.eventId?.toLowerCase().includes(query.toLowerCase())) ||
    (ev.eventType?.toLowerCase().includes(query.toLowerCase()))
  );
  const temp = allEvents;
  allEvents = filtered;
  renderEventsTable();
  allEvents = temp;
}

async function viewEventDetail(eventId) {
  try {
    const res = await fetch(`${API_BASE}/api/events/${eventId}`);
    const ev = await res.json();

    document.getElementById('modal-title').textContent = `Event: ${ev.eventId}`;
    document.getElementById('modal-body').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Event ID</div><div class="detail-value">${ev.eventId}</div></div>
        <div class="detail-item"><div class="detail-label">CUSIP</div><div class="detail-value">${ev.cusip}</div></div>
        <div class="detail-item"><div class="detail-label">Event Type</div><div class="detail-value"><span class="type-badge type-${getTypeClass(ev.eventType)}">${ev.eventType}</span></div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge status-${ev.status?.replace(/\s/g, '-')}">${ev.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Principal Rate</div><div class="detail-value">${ev.principalRate?.toFixed(2) || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">Premium Rate</div><div class="detail-value">${ev.premiumRate?.toFixed(2) || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">Security Called Amount</div><div class="detail-value">${ev.securityCalledAmount?.toLocaleString() || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">Payable Date</div><div class="detail-value">${ev.payableDate || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">Confidence Score</div><div class="detail-value">${ev.confidenceScore ? `${(ev.confidenceScore * 100).toFixed(0)}%` : '-'}</div></div>
        <div class="detail-item full-width"><div class="detail-label">Remarks</div><div class="detail-value">${ev.remarks || 'None'}</div></div>
      </div>
      ${ev.source1Data || ev.source2Data ? `
        <div class="source-comparison">
          <div class="source-box"><h4>Source 1 (Maker)</h4><pre>${formatJSON(ev.source1Data)}</pre></div>
          <div class="source-box"><h4>Source 2 (Checker)</h4><pre>${formatJSON(ev.source2Data)}</pre></div>
        </div>
      ` : ''}
    `;
    document.getElementById('event-modal').classList.add('active');
  } catch (err) {
    showToast('Error loading event details', 'error');
  }
}

function viewWorkflowEvent(eventId, workflowId) {
  if (eventId) {
    switchView('events');
    setTimeout(() => viewEventDetail(eventId), 300);
  }
}

function closeModal() {
  document.getElementById('event-modal').classList.remove('active');
}

async function loadDashboard() {
  try {
    const [statsRes, auditRes] = await Promise.all([
      fetch(`${API_BASE}/api/stats`),
      fetch(`${API_BASE}/api/audit`)
    ]);
    const stats = await statsRes.json();
    const audits = await auditRes.json();
    renderTypeChart(stats.byType);
    renderVerificationGauge(stats.byStatus);
    renderAuditTrail(audits);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderTypeChart(byType) {
  const container = document.getElementById('chart-by-type');
  if (!byType || !byType.length) {
    container.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
    return;
  }
  const max = Math.max(...byType.map(t => t.count));
  const colors = { 'Full Call': '#dc2626', 'Partial Call': '#d97706', 'Redemption': '#2563eb', 'Reorg': '#7c3aed' };
  container.innerHTML = `<div class="chart-bar-group">${byType.map(t => `
    <div class="chart-bar-item">
      <div class="chart-bar-label">${t.event_type}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(t.count / max * 100)}%;background:${colors[t.event_type] || '#4f46e5'}">${t.count}</div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderVerificationGauge(byStatus) {
  if (!byStatus || !byStatus.length) return;
  const total = byStatus.reduce((s, b) => s + b.count, 0);
  const verified = byStatus.find(b => b.status === 'Verified')?.count || 0;
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const gauge = document.querySelector('.gauge');
  if (gauge) gauge.style.background = `conic-gradient(var(--success) ${pct * 3.6}deg, var(--bg-body) ${pct * 3.6}deg)`;
  const value = document.getElementById('gauge-value');
  if (value) value.textContent = `${pct}%`;
}

function renderAuditTrail(audits) {
  const container = document.getElementById('audit-list');
  if (!audits || !audits.length) {
    container.innerHTML = '<div class="empty-state"><p>No audit entries yet</p></div>';
    return;
  }
  const actionColors = {
    'WORKFLOW_CREATED': '#2563eb', 'N8N_TRIGGERED': '#4f46e5',
    'STATUS_PARSING': '#d97706', 'STATUS_EVENT_CREATED': '#059669',
    'STATUS_VERIFYING': '#7c3aed', 'STATUS_COMPLETED': '#059669',
    'EVENT_CREATED': '#059669', 'EVENT_UPDATED': '#4f46e5',
    'STATUS_FAILED': '#dc2626', 'N8N_TRIGGER_FAILED': '#dc2626'
  };
  container.innerHTML = audits.slice(0, 30).map(a => `
    <div class="audit-item">
      <div class="audit-dot" style="background:${actionColors[a.action] || '#94a3b8'}"></div>
      <div class="audit-action">${a.action}</div>
      <div class="audit-details">${a.details || ''}</div>
      <div class="audit-time">${timeAgo(a.createdAt)}</div>
    </div>
  `).join('');
}

let bpmnViewer = null;

async function renderBPMN() {
  const canvas = document.getElementById('bpmn-canvas');
  const processName = document.getElementById('bpmn-process-name');

  if (bpmnViewer) {
    bpmnViewer.destroy();
    bpmnViewer = null;
  }

  canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)"><i data-lucide="loader" class="spin" style="margin-right:8px"></i> Loading BPMN diagram...</div>';
  lucide.createIcons();

  try {
    const res = await fetch('/api/bpmn/ca-event-processing');
    if (!res.ok) throw new Error('Failed to load BPMN');
    const xml = await res.text();

    canvas.innerHTML = '';
    bpmnViewer = new BpmnJS({ container: canvas });

    const result = await bpmnViewer.importXML(xml);

    const canvasModule = bpmnViewer.get('canvas');
    canvasModule.zoom('fit-viewport');

    const defs = bpmnViewer.getDefinitions();
    if (defs && defs.rootElements) {
      const proc = defs.rootElements.find(e => e.$type === 'bpmn:Process');
      if (proc && proc.name) {
        processName.textContent = proc.name;
      }
    }

    applyBpmnStyling();

  } catch (err) {
    canvas.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);flex-direction:column;gap:8px">
      <i data-lucide="alert-triangle" style="width:32px;height:32px;color:#f59e0b"></i>
      <span>Failed to load BPMN diagram</span>
      <span style="font-size:11px">${err.message}</span>
    </div>`;
    lucide.createIcons();
  }
}

function applyBpmnStyling() {
  if (!bpmnViewer) return;
  const elementRegistry = bpmnViewer.get('elementRegistry');
  const canvas = bpmnViewer.get('canvas');

  elementRegistry.forEach(function(element) {
    const bo = element.businessObject;
    if (!bo) return;

    if (bo.$type === 'bpmn:ServiceTask') {
      canvas.addMarker(element.id, 'bpmn-service-task');
    } else if (bo.$type === 'bpmn:UserTask') {
      canvas.addMarker(element.id, 'bpmn-user-task');
    } else if (bo.$type === 'bpmn:ParallelGateway') {
      canvas.addMarker(element.id, 'bpmn-parallel-gw');
    } else if (bo.$type === 'bpmn:ExclusiveGateway') {
      canvas.addMarker(element.id, 'bpmn-exclusive-gw');
    } else if (bo.$type === 'bpmn:StartEvent') {
      canvas.addMarker(element.id, 'bpmn-start-event');
    } else if (bo.$type === 'bpmn:EndEvent') {
      canvas.addMarker(element.id, 'bpmn-end-event');
    }
  });
}

function bpmnZoomIn() {
  if (!bpmnViewer) return;
  const c = bpmnViewer.get('canvas');
  c.zoom(c.zoom() * 1.2);
}

function bpmnZoomOut() {
  if (!bpmnViewer) return;
  const c = bpmnViewer.get('canvas');
  c.zoom(c.zoom() / 1.2);
}

function bpmnFitView() {
  if (!bpmnViewer) return;
  bpmnViewer.get('canvas').zoom('fit-viewport');
}

function bpmnResetZoom() {
  if (!bpmnViewer) return;
  bpmnViewer.get('canvas').zoom(1.0);
}

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    const activeView = document.querySelector('.view.active');
    if (activeView?.id === 'view-launcher') refreshWorkflows();
  }, 3000);
}

function formatStatus(status) {
  const labels = {
    'STARTED': 'Started', 'PARSING': 'In Progress',
    'EVENT_CREATED': 'Event Created', 'VERIFYING': 'Verifying',
    'COMPLETED': 'Completed', 'COMPLETED_WITH_FAILURE': 'Failed', 'FAILED': 'Failed'
  };
  return labels[status] || status;
}

function getTypeClass(type) {
  if (!type) return 'unknown';
  const t = type.toLowerCase();
  if (t.includes('full call')) return 'full-call';
  if (t.includes('partial call')) return 'partial-call';
  if (t.includes('redemption')) return 'redemption';
  if (t.includes('reorg')) return 'reorg';
  return 'unknown';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDetailedTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

function formatShortTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatJSON(data) {
  if (!data) return 'No data available';
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return JSON.stringify(parsed, null, 2);
  } catch { return data; }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}
