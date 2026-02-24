const API_BASE = window.location.origin;
const N8N_WEBHOOK_URL = 'https://n8n.aix.devx.systems/webhook/cbc9a13e-952e-4708-83d4-eac803e99a93';
const N8N_TRAINER_WEBHOOK_URL = 'https://n8n.aix.devx.systems/webhook/trainer-micro';
const N8N_COMPARE_WEBHOOK_URL = 'https://n8n.aix.devx.systems/webhook/compare-micro';
const N8N_AGENT_COMBINED_URL = 'https://n8n.aix.devx.systems/webhook/agent-combined-flow';
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
  if (view === 'launcher') {
    loadAgentDropdown();
    if (submittedWorkflowId) pollSubmittedWorkflow();
  }
  if (view === 'events') loadEvents();
  if (view === 'train') loadSavedAgents();
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

  loadAgentDropdown();
  startPolling();
  renderBPMN();
});

let cachedAgents = [];

async function loadAgentDropdown() {
  try {
    const res = await fetch(`${API_BASE}/api/agents`);
    cachedAgents = await res.json();
    const select = document.getElementById('agent-select');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Default (No Agent)</option>';
    cachedAgents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.agentName;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  } catch (err) {
    console.error('Load agent dropdown error:', err);
  }
}

async function submitWorkflow(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const source1Input = document.getElementById('source1');
  const source2Input = document.getElementById('source2');
  const description = document.getElementById('description').value;
  const agentSelect = document.getElementById('agent-select');
  const selectedAgentId = agentSelect ? agentSelect.value : '';

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

    showToast(`Submission accepted. Your workflow ID: ${workflowId}`, 'success');

    submittedWorkflowId = workflowId;
    showSubmittedCard(workflow);

    if (selectedAgentId) {
      const agent = cachedAgents.find(a => String(a.id) === selectedAgentId);
      if (agent) {
        await submitAgentCombinedViaForm(source1Input, source2Input, workflowId, agent);
      }
    } else {
      await submitToN8nViaForm(source1Input, source2Input, workflowId, description);
    }

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

function submitAgentCombinedViaForm(source1Input, source2Input, workflowId, agent) {
  return new Promise((resolve) => {
    const iframeName = 'agent_frame_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = N8N_AGENT_COMBINED_URL;
    form.enctype = 'multipart/form-data';
    form.target = iframeName;
    form.style.display = 'none';

    if (source1Input.files.length > 0) {
      const f1 = document.createElement('input');
      f1.type = 'file';
      f1.name = 'makerFile';
      const dt1 = new DataTransfer();
      dt1.items.add(source1Input.files[0]);
      f1.files = dt1.files;
      form.appendChild(f1);
    }

    if (source2Input.files.length > 0) {
      const f2 = document.createElement('input');
      f2.type = 'file';
      f2.name = 'checkerFile';
      const dt2 = new DataTransfer();
      dt2.items.add(source2Input.files[0]);
      f2.files = dt2.files;
      form.appendChild(f2);
    }

    const addHidden = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    addHidden('workflowId', workflowId);
    addHidden('makerPrompt', agent.makerPrompt || '');
    addHidden('checkerPrompt', agent.checkerPrompt || '');
    addHidden('comparePrompt', agent.comparePrompt || '');
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

  const caIdRow = wf.eventId ? `
      <div class="submitted-info-row">
        <span class="submitted-label">CA ID</span>
        <span class="submitted-value">
          <a href="#" class="caid-link" onclick="navigateToEvent('${wf.eventId}'); return false;" data-testid="link-caid-${wf.eventId}">
            <i data-lucide="external-link" class="caid-link-icon"></i> ${wf.eventId}
          </a>
        </span>
      </div>` : '';

  card.innerHTML = `
    <div class="card-header">
      <i data-lucide="activity" class="header-icon"></i>
      <h2>Submitted Event Status</h2>
    </div>
    <div class="submitted-card-body">
      <div class="submitted-info-row">
        <span class="submitted-label">Workflow ID</span>
        <span class="submitted-value" data-testid="text-submitted-id">${wf.workflowId}</span>
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
      ${caIdRow}
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
  if (!list) return;
  if (!allWorkflows.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="inbox" class="empty-svg"></i><p>No workflows yet. Upload files to get started.</p></div>`;
    lucide.createIcons();
    return;
  }

  const sortedWF = performSort([...allWorkflows], workflowSort.field, workflowSort.dir);

  list.innerHTML = sortedWF.map(wf => `
    <div class="wf-card" onclick="viewWorkflowEvent('${wf.eventId || ''}', '${wf.workflowId}')" data-testid="card-workflow-${wf.workflowId.substring(0, 8)}">
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
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">No events found</td></tr>';
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

function navigateToEvent(eventId) {
  switchView('events');
  setTimeout(() => viewEventDetail(eventId), 300);
}

function closeModal() {
  document.getElementById('event-modal').classList.remove('active');
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

  elementRegistry.forEach(function (element) {
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

function generateSessionId() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRN-${dd}${mm}${yyyy}-${rand}`;
}

let trainState = {
  sessionId: generateSessionId(),
  step: 1,
  makerFinalized: false,
  checkerFinalized: false,
  compareFinalized: false
};

(function initTrainSession() {
  const el = document.getElementById('train-session-id');
  if (el) el.value = trainState.sessionId;
})();

async function checkTrainResults(type) {
  const sessionId = trainState.sessionId;
  const promptEl = document.getElementById(`train-${type}-prompt`);
  const prompt = promptEl ? promptEl.value.trim() : '';

  if (!prompt) {
    showToast('Please enter a prompt first', 'warning');
    return;
  }

  let file = null;
  if (type === 'maker') {
    const fileInput = document.getElementById('train-maker-file');
    if (!fileInput.files.length) { showToast('Please upload a Maker file', 'warning'); return; }
    file = fileInput.files[0];
  } else if (type === 'checker') {
    const fileInput = document.getElementById('train-checker-file');
    if (!fileInput.files.length) { showToast('Please upload a Checker file', 'warning'); return; }
    file = fileInput.files[0];
  }

  const resultsPanel = document.getElementById(`results-${type}`);
  const resultsContent = document.getElementById(`results-${type}-content`);
  resultsPanel.style.display = 'block';
  resultsContent.innerHTML = '<div class="loading-results"><i data-lucide="loader" class="spin"></i> Processing with AI Agent...</div>';
  lucide.createIcons();

  try {
    const sessionRes = await fetch(`${API_BASE}/api/training/session/${sessionId}`);
    const session = await sessionRes.json();

    let extraFields = {};
    if (type === 'compare') {
      extraFields.makerResult = session.makerResult || '';
      extraFields.checkerResult = session.checkerResult || '';
      extraFields.makerPrompt = session.makerPrompt || document.getElementById('train-maker-prompt')?.value || '';
      extraFields.checkerPrompt = session.checkerPrompt || document.getElementById('train-checker-prompt')?.value || '';
    }

    await submitTrainerViaBrowserForm(sessionId, type, prompt, file, extraFields);

    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} check initiated. Waiting for AI...`, 'info');

    pollTrainingResults(sessionId, type);

  } catch (err) {
    console.error('Training error:', err);
    resultsContent.textContent = 'Error: ' + err.message;
    showToast('Error: ' + err.message, 'error');
  }
}

function submitTrainerViaBrowserForm(sessionId, type, prompt, file, extraFields) {
  return new Promise((resolve) => {
    const iframeName = 'trainer_frame_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const webhookUrl = (type === 'compare') ? N8N_COMPARE_WEBHOOK_URL : N8N_TRAINER_WEBHOOK_URL;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = webhookUrl;
    form.enctype = 'multipart/form-data';
    form.target = iframeName;
    form.style.display = 'none';

    if (file) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'file';
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      form.appendChild(fileInput);
    }

    const addHidden = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    addHidden('sessionId', sessionId);
    addHidden('type', type);
    addHidden('prompt', prompt);
    addHidden('baseUrl', CALLBACK_BASE_URL);
    addHidden('callbackUrl', `${CALLBACK_BASE_URL}/api/training/callback`);

    if (extraFields) {
      Object.entries(extraFields).forEach(([key, val]) => {
        if (val) addHidden(key, val);
      });
    }

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

function pollTrainingResults(sessionId, type) {
  const resultsContent = document.getElementById(`results-${type}-content`);
  const finalizeBtn = document.getElementById(`btn-finalize-${type}`);

  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/training/session/${sessionId}`);
      const session = await res.json();

      let result = null;
      if (type === 'maker') result = session.makerResult;
      else if (type === 'checker') result = session.checkerResult;
      else if (type === 'compare') result = session.compareResult;

      if (result) {
        clearInterval(pollInterval);
        resultsContent.textContent = formatJSON(result);
        if (finalizeBtn) finalizeBtn.disabled = false;
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} results ready!`, 'success');
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 3000);

  // Timeout after 60 seconds
  setTimeout(() => {
    clearInterval(pollInterval);
    if (resultsContent.textContent.includes('Processing')) {
      resultsContent.textContent = 'Time out waiting for results. Please try again.';
    }
  }, 60000);
}

function finalizeStep(step) {
  const stepNames = { 1: 'maker', 2: 'checker', 3: 'compare' };
  const name = stepNames[step];

  trainState[`${name}Finalized`] = true;

  const section = document.getElementById(`train-step-${step}`);
  section.classList.add('finalized');

  const prompt = document.getElementById(`train-${name}-prompt`);
  if (prompt) {
    prompt.disabled = true;
    const sessionId = trainState.sessionId;
    const promptValue = prompt.value.trim();
    fetch(`${API_BASE}/api/training/session/${sessionId}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: name, prompt: promptValue })
    }).catch(err => console.error('Save prompt error:', err));
  }

  const indicator = document.getElementById(`step-indicator-${step}`);
  indicator.classList.remove('active');
  indicator.classList.add('done');

  const nextStep = step + 1;
  if (nextStep <= 4) {
    const nextSection = document.getElementById(`train-step-${nextStep}`);
    nextSection.classList.remove('locked');
    const lockBadge = document.getElementById(`lock-badge-${nextStep}`);
    if (lockBadge) lockBadge.style.display = 'none';
    const nextIndicator = document.getElementById(`step-indicator-${nextStep}`);
    nextIndicator.classList.add('active');
  }

  if (step === 3) {
    renderAgentSummary();
  }

  showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} prompt finalized`, 'success');
  lucide.createIcons();
}

function renderAgentSummary() {
  const makerPrompt = document.getElementById('train-maker-prompt').value.trim();
  const checkerPrompt = document.getElementById('train-checker-prompt').value.trim();
  const comparePrompt = document.getElementById('train-compare-prompt').value.trim();

  const summary = document.getElementById('agent-summary');
  summary.innerHTML = `
    <div class="agent-summary-row"><span class="agent-summary-label">Maker Prompt</span><span class="agent-summary-value">${makerPrompt.substring(0, 80)}${makerPrompt.length > 80 ? '...' : ''}</span></div>
    <div class="agent-summary-row"><span class="agent-summary-label">Checker Prompt</span><span class="agent-summary-value">${checkerPrompt.substring(0, 80)}${checkerPrompt.length > 80 ? '...' : ''}</span></div>
    <div class="agent-summary-row"><span class="agent-summary-label">Compare Prompt</span><span class="agent-summary-value">${comparePrompt.substring(0, 80)}${comparePrompt.length > 80 ? '...' : ''}</span></div>
  `;
}

async function saveAgent() {
  const agentName = document.getElementById('train-agent-name').value.trim();
  if (!agentName) { showToast('Please enter an agent name', 'warning'); return; }

  const payload = {
    agentName: agentName,
    makerPrompt: document.getElementById('train-maker-prompt').value.trim(),
    checkerPrompt: document.getElementById('train-checker-prompt').value.trim(),
    comparePrompt: document.getElementById('train-compare-prompt').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to save agent', 'error');
      return;
    }
    showToast(`Agent "${agentName}" saved successfully`, 'success');
    loadSavedAgents();
    resetTrainForm();
  } catch (err) {
    console.error('Save agent error:', err);
    showToast('Error saving agent', 'error');
  }
}

function resetTrainForm() {
  trainState = { step: 1, makerFinalized: false, checkerFinalized: false, compareFinalized: false };

  ['train-maker-prompt', 'train-checker-prompt', 'train-compare-prompt'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    el.disabled = false;
  });
  document.getElementById('train-agent-name').value = '';
  document.getElementById('agent-summary').innerHTML = '';
  ['results-maker', 'results-checker', 'results-compare'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  ['train-maker-file', 'train-checker-file'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['train-maker-file-name', 'train-checker-file-name'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('visible');
  });
  document.querySelectorAll('#view-train .file-input-wrap').forEach(z => z.classList.remove('has-file'));

  ['btn-finalize-maker', 'btn-finalize-checker', 'btn-finalize-compare'].forEach(id => {
    document.getElementById(id).disabled = true;
  });

  for (let i = 1; i <= 4; i++) {
    const section = document.getElementById(`train-step-${i}`);
    section.classList.remove('finalized');
    if (i > 1) section.classList.add('locked');

    const indicator = document.getElementById(`step-indicator-${i}`);
    indicator.classList.remove('active', 'done');
    if (i === 1) indicator.classList.add('active');

    const lockBadge = document.getElementById(`lock-badge-${i}`);
    if (lockBadge) lockBadge.style.display = '';
  }

  lucide.createIcons();
}

async function loadSavedAgents() {
  try {
    const res = await fetch(`${API_BASE}/api/agents`);
    const agents = await res.json();
    const section = document.getElementById('saved-agents-section');
    const list = document.getElementById('saved-agents-list');

    if (agents.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = agents.map(a => `
      <div class="saved-agent-accordion" data-testid="agent-item-${a.id}">
        <div class="saved-agent-header" onclick="toggleAgentAccordion(this)">
          <div class="saved-agent-left">
            <div class="saved-agent-icon"><i data-lucide="bot"></i></div>
            <div class="saved-agent-info">
              <div class="saved-agent-name">${a.agentName}</div>
              <div class="saved-agent-meta">Created ${formatDetailedTime(a.createdAt)}</div>
            </div>
          </div>
          <div class="saved-agent-right">
            <button class="btn-delete-agent" onclick="event.stopPropagation(); deleteAgent(${a.id}, '${a.agentName}')" data-testid="button-delete-agent-${a.id}" title="Delete Agent">
              <i data-lucide="trash-2"></i>
            </button>
            <i data-lucide="chevron-down" class="accordion-chevron"></i>
          </div>
        </div>
        <div class="saved-agent-body">
          <div class="prompt-accordion">
            <div class="prompt-accordion-header" onclick="this.parentElement.classList.toggle('open')">
              <div class="prompt-accordion-title"><i data-lucide="file-text" class="prompt-label-icon"></i> Maker Prompt</div>
              <i data-lucide="chevron-down" class="prompt-accordion-chevron"></i>
            </div>
            <div class="prompt-accordion-body">
              <pre class="agent-prompt-content">${a.makerPrompt || '(empty)'}</pre>
            </div>
          </div>
          <div class="prompt-accordion">
            <div class="prompt-accordion-header" onclick="this.parentElement.classList.toggle('open')">
              <div class="prompt-accordion-title"><i data-lucide="file-check" class="prompt-label-icon"></i> Checker Prompt</div>
              <i data-lucide="chevron-down" class="prompt-accordion-chevron"></i>
            </div>
            <div class="prompt-accordion-body">
              <pre class="agent-prompt-content">${a.checkerPrompt || '(empty)'}</pre>
            </div>
          </div>
          <div class="prompt-accordion">
            <div class="prompt-accordion-header" onclick="this.parentElement.classList.toggle('open')">
              <div class="prompt-accordion-title"><i data-lucide="git-compare" class="prompt-label-icon"></i> Compare Prompt</div>
              <i data-lucide="chevron-down" class="prompt-accordion-chevron"></i>
            </div>
            <div class="prompt-accordion-body">
              <pre class="agent-prompt-content">${a.comparePrompt || '(empty)'}</pre>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    console.error('Load agents error:', err);
  }
}

function toggleAgentAccordion(header) {
  const accordion = header.parentElement;
  accordion.classList.toggle('open');
}

async function deleteAgent(id, name) {
  if (!confirm(`Delete agent "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(`Agent "${name}" deleted`, 'success');
    loadSavedAgents();
  } catch (err) {
    console.error('Delete agent error:', err);
    showToast('Failed to delete agent', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}
