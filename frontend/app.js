// ============================================
// Test orchestrator - Frontend Application
// ============================================

const API_BASE = window.location.origin;
const N8N_WEBHOOK_URL = 'https://n8n.aix.devx.systems/webhook-test/cbc9a13e-952e-4708-83d4-eac803e99a93';
// Dynamically send whatever public URL we are currently accessing the frontend through
const CALLBACK_BASE_URL = window.location.origin;
let allWorkflows = [];
let allEvents = [];
let currentFilter = 'all';
let pollingInterval = null;

// ============= VIEW SWITCHING =============

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'launcher') refreshWorkflows();
  if (view === 'events') loadEvents();
  if (view === 'dashboard') loadDashboard();
  if (view === 'bpmn') renderBPMN();
}

// ============= THEME =============

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const btn = document.querySelector('.theme-btn');
  btn.textContent = document.body.classList.contains('light-theme') ? '🌙' : '☀️';
}

// ============= FILE UPLOAD =============

function handleFileSelect(input, nameId) {
  const nameEl = document.getElementById(nameId);
  const zone = input.closest('.upload-zone');
  if (input.files.length > 0) {
    nameEl.textContent = `✅ ${input.files[0].name} (${formatBytes(input.files[0].size)})`;
    nameEl.classList.add('visible');
    zone.classList.add('has-file');
  }
}

// Drag & drop
document.addEventListener('DOMContentLoaded', () => {
  ['dropzone-source1', 'dropzone-source2'].forEach(id => {
    const zone = document.getElementById(id);
    if (!zone) return;
    const input = zone.querySelector('input[type=file]');

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        handleFileSelect(input, input.id === 'source1' ? 'source1-name' : 'source2-name');
      }
    });
  });

  // Start polling
  startPolling();
  refreshWorkflows();
  renderBPMN();
});

// ============= WORKFLOW SUBMISSION =============
// Uses hidden HTML form POST to n8n webhook (bypasses CORS + sends SSO cookies)

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
  btn.innerHTML = '<span class="btn-icon">⏳</span> Launching...';

  try {
    // Step 1: Create workflow record in Spring Boot
    const createData = new FormData();
    if (source1Input.files[0]) createData.append('source1', source1Input.files[0]);
    if (source2Input.files[0]) createData.append('source2', source2Input.files[0]);
    createData.append('description', description);

    const res = await fetch(`${API_BASE}/api/workflows`, { method: 'POST', body: createData });
    const workflow = await res.json();
    const workflowId = workflow.workflowId;

    showToast(`Workflow created: ${workflowId.substring(0, 8)}... Sending to n8n...`, 'info');

    // Step 2: Send files to n8n via hidden form POST (sends SSO cookies!)
    await submitToN8nViaForm(source1Input, source2Input, workflowId, description);

    showToast('🚀 Workflow sent to n8n! Check Executions tab.', 'success');

    // Step 3: Update status to PARSING
    try {
      await fetch(`${API_BASE}/api/workflows/${workflowId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PARSING' })
      });
    } catch (e) { /* non-critical */ }

    // Reset form
    document.getElementById('workflow-form').reset();
    ['source1-name', 'source2-name'].forEach(id => {
      document.getElementById(id).classList.remove('visible');
      document.getElementById(id).textContent = '';
    });
    document.querySelectorAll('.upload-zone').forEach(z => z.classList.remove('has-file'));

    refreshWorkflows();
  } catch (err) {
    console.error('Workflow error:', err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = '<span class="btn-icon">🚀</span> Launch Workflow';
  }
}

// Hidden form POST to n8n — bypasses CORS and sends SSO cookies automatically
function submitToN8nViaForm(source1Input, source2Input, workflowId, description) {
  return new Promise((resolve) => {
    // Create hidden iframe to capture response (prevents page navigation)
    const iframeName = 'n8n_frame_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Build hidden form — same as the working HTML form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = N8N_WEBHOOK_URL;
    form.enctype = 'multipart/form-data';
    form.target = iframeName;  // Submit into hidden iframe
    form.style.display = 'none';

    // Add files to the hidden form using DataTransfer (safest way to copy files programmatically)
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

    // Add hidden fields
    const addHidden = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    addHidden('workflowId', workflowId);
    addHidden('description', description || '');
    addHidden('baseUrl', CALLBACK_BASE_URL); // Send base URL so n8n can route dynamically
    addHidden('callbackUrl', `${CALLBACK_BASE_URL}/api/workflows/${workflowId}/status`);

    document.body.appendChild(form);

    // Clean up after iframe loads
    iframe.onload = () => {
      console.log('>>> n8n form POST completed');
      setTimeout(() => {
        try { document.body.removeChild(form); } catch (e) { }
        try { document.body.removeChild(iframe); } catch (e) { }
      }, 2000);
      resolve(true);
    };

    console.log('>>> Submitting hidden form to n8n:', N8N_WEBHOOK_URL);
    form.submit();

    // Fallback timeout
    setTimeout(() => { resolve(true); }, 15000);
  });
}

// ============= SORTING STATE =============
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

// ============= WORKFLOW LIST =============

async function refreshWorkflows() {
  try {
    const res = await fetch(`${API_BASE}/api/workflows`);
    allWorkflows = await res.json();
    renderWorkflowList();
    updateStats();
  } catch (err) {
    console.error('Refresh error:', err);
  }
}

function renderWorkflowList() {
  const list = document.getElementById('workflow-list');
  if (!allWorkflows.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No workflows yet. Upload files to get started!</div>
      </div>`;
    return;
  }

  // Generate sort controls and apply sort
  let html = `
    <div class="wf-sort-controls" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
      <span style="font-size: 14px; font-weight: 500; color: var(--text-muted)">Sort by:</span>
      <select onchange="updateWFSort('field', this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-normal);">
        <option value="createdAt" ${workflowSort.field === 'createdAt' ? 'selected' : ''}>Created Date</option>
        <option value="status" ${workflowSort.field === 'status' ? 'selected' : ''}>Status</option>
        <option value="eventType" ${workflowSort.field === 'eventType' ? 'selected' : ''}>Event Type</option>
      </select>
      <button onclick="updateWFSort('dir', '${workflowSort.dir === 'desc' ? 'asc' : 'desc'}')" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-normal); cursor: pointer;">
        ${workflowSort.dir === 'desc' ? '⬇️ Desc' : '⬆️ Asc'}
      </button>
    </div>
  `;

  const sortedWF = performSort([...allWorkflows], workflowSort.field, workflowSort.dir);

  html += sortedWF.map(wf => `
    <div class="workflow-card" onclick="viewWorkflowEvent('${wf.eventId || ''}', '${wf.workflowId}')">
      <div class="wf-info">
        <div class="wf-id">${wf.workflowId.substring(0, 8)}...</div>
        <div class="wf-desc">${wf.description || 'No description'}</div>
        <div class="wf-files">📊 ${wf.source1FileName || 'N/A'} &nbsp;|&nbsp; 📄 ${wf.source2FileName || 'N/A'}</div>
        ${wf.cusip ? `<div class="wf-files">ID: <strong>${wf.cusip}</strong> &nbsp; Type: <span class="type-badge type-${getTypeClass(wf.eventType)}">${wf.eventType || 'Detecting...'}</span></div>` : ''}
        <div class="wf-time">${formatDetailedTime(wf.createdAt)} (${timeAgo(wf.createdAt)})</div>
      </div>
      <div class="wf-status">
        <span class="status-badge status-${wf.status}">${getStatusIcon(wf.status)} ${formatStatus(wf.status)}</span>
      </div>
    </div>
  `).join('');

  list.innerHTML = html;
}

function updateWFSort(type, value) {
  if (type === 'field') workflowSort.field = value;
  if (type === 'dir') workflowSort.dir = value;
  renderWorkflowList();
}

function updateStats() {
  const total = allWorkflows.length;
  const completed = allWorkflows.filter(w => w.status === 'COMPLETED').length;
  const inProgress = allWorkflows.filter(w => !['COMPLETED', 'COMPLETED_WITH_FAILURE', 'FAILED'].includes(w.status)).length;
  const failed = allWorkflows.filter(w => ['COMPLETED_WITH_FAILURE', 'FAILED'].includes(w.status)).length;

  animateValue('stat-total-workflows', total);
  animateValue('stat-completed', completed);
  animateValue('stat-in-progress', inProgress);
  animateValue('stat-failed', failed);
}

function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  el.textContent = target;
  el.style.transform = 'scale(1.2)';
  setTimeout(() => el.style.transform = 'scale(1)', 200);
}

// ============= EVENTS =============

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

  // Update header arrows
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '');
  const activeIcon = document.getElementById(`sort-${eventSort.field}`);
  if (activeIcon) activeIcon.textContent = eventSort.dir === 'desc' ? '⬇️' : '⬆️';

  if (!allEvents.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">No events found</td></tr>';
    return;
  }

  const sortedEvents = performSort([...allEvents], eventSort.field, eventSort.dir);

  tbody.innerHTML = sortedEvents.map(ev => `
    <tr>
      <td><code style="font-size:12px">${ev.eventId}</code></td>
      <td><span class="type-badge type-${getTypeClass(ev.eventType)}">${ev.eventType}</span></td>
      <td><strong>${ev.cusip}</strong></td>
      <td>${ev.principalRate?.toFixed(2) || '-'}</td>
      <td>${ev.securityCalledAmount ? ev.securityCalledAmount.toLocaleString() : '-'}</td>
      <td>${ev.payableDate || '-'}</td>
      <td><span class="status-badge status-${ev.status?.replace(/\s/g, '-')}">${ev.status}</span></td>
      <td><span style="font-size: 11px; color: var(--text-muted);">${formatDetailedTime(ev.createdAt)}</span></td>
      <td>${ev.confidenceScore ? `${(ev.confidenceScore * 100).toFixed(0)}%` : '-'}</td>
      <td class="actions-cell">
        <button class="btn-view" onclick="viewEventDetail('${ev.eventId}')">View</button>
      </td>
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
  const tbody = document.getElementById('events-tbody');
  const temp = allEvents;
  allEvents = filtered;
  renderEventsTable();
  allEvents = temp;
}

// ============= EVENT DETAIL MODAL =============

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
          <div class="source-box">
            <h4>📊 Source 1 (XLSX)</h4>
            <pre>${formatJSON(ev.source1Data)}</pre>
          </div>
          <div class="source-box">
            <h4>📄 Source 2 (PDF)</h4>
            <pre>${formatJSON(ev.source2Data)}</pre>
          </div>
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

// ============= DASHBOARD =============

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
    container.innerHTML = '<div class="empty-state"><div class="empty-text">No data yet</div></div>';
    return;
  }
  const max = Math.max(...byType.map(t => t.count));
  const colors = { 'Full Call': '#ef4444', 'Partial Call': '#f59e0b', 'Redemption': '#3b82f6', 'Reorg': '#8b5cf6' };

  container.innerHTML = `<div class="chart-bar-group">${byType.map(t => `
    <div class="chart-bar-item">
      <div class="chart-bar-label">${t.event_type}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(t.count / max * 100)}%;background:${colors[t.event_type] || '#6366f1'}">
          ${t.count}
        </div>
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
  if (gauge) gauge.style.background = `conic-gradient(var(--success) ${pct * 3.6}deg, var(--bg-elevated) ${pct * 3.6}deg)`;
  const value = document.getElementById('gauge-value');
  if (value) value.textContent = `${pct}%`;
}

function renderAuditTrail(audits) {
  const container = document.getElementById('audit-list');
  if (!audits || !audits.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text">No audit entries yet</div></div>';
    return;
  }

  const actionColors = {
    'WORKFLOW_CREATED': '#3b82f6', 'N8N_TRIGGERED': '#6366f1',
    'STATUS_PARSING': '#f59e0b', 'STATUS_EVENT_CREATED': '#10b981',
    'STATUS_VERIFYING': '#8b5cf6', 'STATUS_COMPLETED': '#10b981',
    'EVENT_CREATED': '#10b981', 'EVENT_UPDATED': '#6366f1',
    'STATUS_FAILED': '#ef4444', 'N8N_TRIGGER_FAILED': '#ef4444'
  };

  container.innerHTML = audits.slice(0, 30).map(a => `
    <div class="audit-item">
      <div class="audit-dot" style="background:${actionColors[a.action] || '#64748b'}"></div>
      <div class="audit-action">${a.action}</div>
      <div class="audit-details">${a.details || ''}</div>
      <div class="audit-time">${timeAgo(a.createdAt)}</div>
    </div>
  `).join('');
}

// ============= BPMN VIEWER =============

function renderBPMN() {
  const container = document.getElementById('bpmn-diagram');
  container.innerHTML = `
    <div class="bpmn-flow">
      ${bpmnNode('circle', '▶', 'Start', '#3b82f6')}
      ${bpmnArrow()}
      ${bpmnNode('rect', '📂', 'Receive Files\\n(Webhook)', '#3b82f6')}
      ${bpmnArrow()}
      ${bpmnNode('diamond', '⊕', 'Parallel\\nGateway', '#6366f1')}
      ${bpmnArrow()}
      <div class="bpmn-parallel-group">
        <div class="bpmn-parallel-label">⚡ PARALLEL EXECUTION</div>
        <div class="bpmn-parallel-row">
          ${bpmnNode('rect', '📊', 'Parse XLSX\\n(Source 1)', '#f59e0b')}
          ${bpmnArrow()}
          ${bpmnNode('rect', '🤖', 'AI Extract\\nJSON', '#f59e0b')}
          ${bpmnArrow()}
          ${bpmnNode('diamond', '?', 'Event Type\\nRouter', '#8b5cf6')}
        </div>
        <div class="bpmn-parallel-row">
          ${bpmnNode('rect', '📄', 'Parse PDF\\n(Source 2)', '#f59e0b')}
          ${bpmnArrow()}
          ${bpmnNode('rect', '🤖', 'AI Extract\\nJSON', '#f59e0b')}
        </div>
      </div>
      ${bpmnArrow()}
      ${bpmnNode('rect', '💾', 'Create\\nEvent', '#10b981')}
      ${bpmnArrow()}
      ${bpmnNode('diamond', '⊕', 'Merge\\nGateway', '#6366f1')}
      ${bpmnArrow()}
      ${bpmnNode('rect', '⚖️', 'Compare\\nS1 vs S2', '#8b5cf6')}
      ${bpmnArrow()}
      ${bpmnNode('diamond', '?', 'Match?', '#f59e0b')}
      ${bpmnArrow()}
      ${bpmnNode('rect', '✅', 'Update\\nStatus', '#10b981')}
      ${bpmnArrow()}
      ${bpmnNode('rect', '📢', 'Status\\nCallback', '#3b82f6')}
      ${bpmnArrow()}
      ${bpmnNode('circle', '⏹', 'End', '#10b981')}
    </div>
  `;
}

function bpmnNode(shape, icon, label, color) {
  const shapeClass = shape === 'circle' ? 'circle' : shape === 'diamond' ? 'diamond' : '';
  return `
    <div class="bpmn-node">
      <div class="bpmn-shape ${shapeClass}" style="background:${color}20;border:2px solid ${color}">
        <span>${icon}</span>
      </div>
      <div class="bpmn-node-label">${label.replace(/\\n/g, '<br>')}</div>
    </div>
  `;
}

function bpmnArrow() {
  return '<div class="bpmn-arrow">→</div>';
}

// ============= POLLING =============

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    const activeView = document.querySelector('.view.active');
    if (activeView?.id === 'view-launcher') refreshWorkflows();
  }, 3000);
}

// ============= UTILITIES =============

function getStatusIcon(status) {
  const icons = {
    'STARTED': '🔵', 'PARSING': '🟡', 'EVENT_CREATED': '🟢',
    'VERIFYING': '🔵', 'COMPLETED': '✅', 'COMPLETED_WITH_FAILURE': '❌', 'FAILED': '❌'
  };
  return icons[status] || '⚪';
}

function formatStatus(status) {
  const labels = {
    'STARTED': 'Started', 'PARSING': 'Parsing Files...',
    'EVENT_CREATED': 'Event Created', 'VERIFYING': 'Verifying...',
    'COMPLETED': 'Completed', 'COMPLETED_WITH_FAILURE': 'Completed (Issues)', 'FAILED': 'Failed'
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
  const date = new Date(dateStr);
  return date.toLocaleString();
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
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  toast.style.cssText = `
    position:fixed;top:80px;right:24px;z-index:9999;
    padding:14px 24px;border-radius:8px;
    background:${colors[type]};color:white;
    font-size:14px;font-weight:500;font-family:Inter,sans-serif;
    box-shadow:0 10px 40px rgba(0,0,0,0.3);
    animation:slideIn 0.3s ease;
    max-width:400px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
