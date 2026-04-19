/* ═══════════════════════════════════════════════════════════════════════════════
   RESOLVO — Application Controller
   Role-specific views, no emojis, sky blue theme
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─── State ────────────────────────────────────────────────────────────────────
let currentView = '';
let userRole = window.RESOLVO_USER?.role || 'Customer Support Executive';
let complaints = [];
let chatHistory = [];
let failedTurns = 0;
let attachedImage = null;
let dialNumber = '';
let isDialListening = false;
let lastSuccessId = null;

// Audio
let audioRecorder = null;
let audioStream = null;
let audioContext = null;
let analyserNode = null;
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let audioSessions = [];
let currentTranscript = null;
let animFrameId = null;

// Sort
let currentSort = { field: 'date', dir: 'desc' };

// Models
const MODELS = ['gemma-3-27b-it', 'gemma-3-12b-it', 'gemma-3-4b-it', 'gemma-3-1b-it', 'gemini-2.0-flash'];
let currentModelIndex = 0;

// SVG icons for nav
const IC = {
  grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="2"></rect></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09c-.658.003-1.25.396-1.51 1z"></path></svg>',
  trend: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
  mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
};

// ─── Navigation per Role ──────────────────────────────────────────────────────
const NAV_ITEMS = {
  'Customer Support Executive': [
    { id: 'support', label: 'Support Dashboard', icon: IC.grid },
    { id: 'support-chat-nav', label: 'AI Resolution Chat', icon: IC.chat, sub: 'support-chat' },
  ],
  'Quality Assurance Team': [
    { id: 'complaints', label: 'Quality Analysis', icon: IC.clipboard },
    { id: 'ai-review', label: 'AI Re-Review', icon: IC.gear },
    { id: 'qat-email', label: 'Email Communication', icon: IC.mail },
  ],
  'Operations Manager': [
    { id: 'dashboard', label: 'Dashboard', icon: IC.trend },
    { id: 'ops-complaints', label: 'All Complaints', icon: IC.doc },
    { id: 'sla-settings', label: 'SLA Settings', icon: IC.clock },
    { id: 'backup', label: 'Backup & Export', icon: IC.download },
  ],
};

function buildSidebar() {
  const ul = document.getElementById('nav-links');
  ul.innerHTML = '';
  const items = NAV_ITEMS[userRole] || NAV_ITEMS['Customer Support Executive'];
  items.forEach(item => {
    const li = document.createElement('li');
    const viewTarget = item.sub || item.id;
    li.innerHTML = `<div class="nav-link" data-view="${item.id}" onclick="handleNavClick('${item.id}', '${item.sub || ''}')">${item.icon}<span>${item.label}</span></div>`;
    ul.appendChild(li);
  });
}

function handleNavClick(viewId, subView) {
  if (subView) {
    switchView('support');
    switchSubView(subView);
  } else {
    switchView(viewId);
  }
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-view="${viewId}"]`);
  if (link) link.classList.add('active');
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + viewId);
  if (target) target.classList.add('active');
  currentView = viewId;

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-view="${viewId}"]`);
  if (link) link.classList.add('active');

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'complaints') renderComplaintTable();
  if (viewId === 'support') renderSupportComplaints();
  if (viewId === 'ai-review') populateReviewDropdown();
  if (viewId === 'qat-email') populateQATEmailDropdown();
  if (viewId === 'ops-complaints') renderOpsComplaintTable();
  if (viewId === 'sla-settings') loadSLASettings();
  if (viewId === 'backup') updateBackupPreview();
}

function switchSubView(subId) {
  document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(subId);
  if (target) target.classList.add('active');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const roleSelect = document.getElementById('role-select');
  roleSelect.value = userRole;
  roleSelect.addEventListener('change', (e) => {
    userRole = e.target.value;
    document.getElementById('user-role-label').textContent = userRole;
    buildSidebar();
    const items = NAV_ITEMS[userRole];
    switchView(items[0].id);
  });

  buildSidebar();
  await fetchComplaints();
  initDialPad();
  initChatListeners();
  initDirectForm();

  document.getElementById('global-search')?.addEventListener('input', handleGlobalSearch);
  document.getElementById('support-search')?.addEventListener('input', renderSupportComplaints);
  document.getElementById('list-search')?.addEventListener('input', renderComplaintTable);
  document.getElementById('filter-cat')?.addEventListener('change', renderComplaintTable);
  document.getElementById('filter-pri')?.addEventListener('change', renderComplaintTable);
  document.getElementById('filter-stat')?.addEventListener('change', renderComplaintTable);
  document.getElementById('sort-by')?.addEventListener('change', renderComplaintTable);
  document.getElementById('review-complaint-select')?.addEventListener('change', previewReviewComplaint);

  // Ops filters
  document.getElementById('ops-list-search')?.addEventListener('input', renderOpsComplaintTable);
  document.getElementById('ops-filter-cat')?.addEventListener('change', renderOpsComplaintTable);
  document.getElementById('ops-filter-pri')?.addEventListener('change', renderOpsComplaintTable);
  document.getElementById('ops-filter-stat')?.addEventListener('change', renderOpsComplaintTable);

  const items = NAV_ITEMS[userRole];
  switchView(items[0].id);
});

// ─── Global Search ────────────────────────────────────────────────────────────
function handleGlobalSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return;
  if (currentView === 'complaints') {
    document.getElementById('list-search').value = q;
    renderComplaintTable();
  } else if (currentView === 'support') {
    document.getElementById('support-search').value = q;
    renderSupportComplaints();
  } else if (currentView === 'ops-complaints') {
    document.getElementById('ops-list-search').value = q;
    renderOpsComplaintTable();
  } else {
    // Navigate to appropriate table
    if (userRole === 'Quality Assurance Team') {
      switchView('complaints');
      document.getElementById('list-search').value = q;
      renderComplaintTable();
    } else if (userRole === 'Operations Manager') {
      switchView('ops-complaints');
      document.getElementById('ops-list-search').value = q;
      renderOpsComplaintTable();
    } else {
      document.getElementById('support-search').value = q;
      renderSupportComplaints();
    }
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchComplaints() {
  try { const r = await fetch('/api/complaints'); complaints = await r.json(); }
  catch (e) { console.error('Fetch error:', e); }
}

async function addComplaint(data) {
  try {
    const r = await fetch('/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const c = await r.json(); complaints.unshift(c); return c;
  } catch (e) { console.error('Add error:', e); }
}

async function updateComplaint(id, updates) {
  try {
    const r = await fetch(`/api/complaints/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    const u = await r.json(); const idx = complaints.findIndex(c => c.id === id); if (idx >= 0) complaints[idx] = u; return u;
  } catch (e) { console.error('Update error:', e); }
}

// ─── Dashboard (Ops) ──────────────────────────────────────────────────────────
async function renderDashboard() {
  try {
    const r = await fetch('/api/stats'); const s = await r.json();
    renderDashboardStats(s); renderDashboardCharts(s);
  } catch (e) { renderDashboardFallback(); }
}

function renderDashboardStats(s) {
  document.getElementById('stats-grid').innerHTML = [
    { t: 'Total Complaints', v: s.total, bg: '#eff6ff' },
    { t: 'Open Cases', v: s.open, bg: '#fef2f2' },
    { t: 'Resolved', v: s.resolved, bg: '#ecfdf5' },
    { t: 'Avg Resolution', v: s.avgResolutionTime + 'h', bg: '#eff6ff' },
    { t: 'SLA Breached', v: s.slaBreached, bg: '#fef2f2' },
    { t: 'Escalated', v: s.escalated, bg: '#f3e8ff' },
    { t: 'In Progress', v: s.inProgress, bg: '#fffbeb' },
    { t: 'High Priority Open', v: s.slaAtRisk, bg: '#fef2f2' },
  ].map(i => `<div class="card stat-card"><div><p class="stat-title">${i.t}</p><h3 class="stat-value">${i.v}</h3></div><div class="stat-icon" style="background:${i.bg};">${i.t[0]}</div></div>`).join('');
}

function renderDashboardCharts(stats) {
  const tc = document.getElementById('trend-chart');
  const cc = document.getElementById('category-chart');
  const pc = document.getElementById('priority-chart');
  if (!tc) return;
  Chart.getChart(tc)?.destroy(); Chart.getChart(cc)?.destroy(); Chart.getChart(pc)?.destroy();

  const rt = complaints.filter(c => c.resolutionTime).map(c => c.resolutionTime);
  const lb = complaints.filter(c => c.resolutionTime).map(c => c.id);

  new Chart(tc, {
    type: 'bar',
    data: { labels: lb.length ? lb : ['CMP-001'], datasets: [{ label: 'Resolution Time (hrs)', data: rt.length ? rt : [60],
      backgroundColor: (rt.length ? rt : [60]).map(t => t > 48 ? '#fecdd3' : t > 24 ? '#fde68a' : '#bfdbfe'),
      borderColor: (rt.length ? rt : [60]).map(t => t > 48 ? '#dc2626' : t > 24 ? '#d97706' : '#2563eb'),
      borderWidth: 1, borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#64748b' } } },
      scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } } } }
  });

  const cd = stats.categories || { Product: 2, Packaging: 5, Trade: 4 };
  new Chart(cc, { type: 'doughnut',
    data: { labels: Object.keys(cd), datasets: [{ data: Object.values(cd), backgroundColor: ['#2563eb', '#0284c7', '#7c3aed'], borderWidth: 0 }] },
    options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#64748b', usePointStyle: true } } } }
  });

  const pd = stats.priorities || { High: 3, Medium: 2, Low: 6 };
  new Chart(pc, { type: 'bar',
    data: { labels: Object.keys(pd), datasets: [{ data: Object.values(pd), backgroundColor: ['#dc2626', '#d97706', '#2563eb'], borderRadius: 6, barThickness: 30 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } },
      scales: { x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } }, y: { grid: { display: false }, ticks: { color: '#475569', font: { weight: 600 } } } } }
  });
}

function renderDashboardFallback() {
  document.getElementById('stats-grid').innerHTML = `
    <div class="card stat-card"><div><p class="stat-title">Total</p><h3 class="stat-value">${complaints.length}</h3></div></div>
    <div class="card stat-card"><div><p class="stat-title">High</p><h3 class="stat-value">${complaints.filter(c => c.priority === 'High').length}</h3></div></div>
    <div class="card stat-card"><div><p class="stat-title">Resolved</p><h3 class="stat-value">${complaints.filter(c => c.status === 'Resolved').length}</h3></div></div>
    <div class="card stat-card"><div><p class="stat-title">Open</p><h3 class="stat-value">${complaints.filter(c => c.status === 'Open').length}</h3></div></div>`;
}

// ─── Support Dashboard (CSE) ──────────────────────────────────────────────────
function renderSupportComplaints() {
  const q = document.getElementById('support-search')?.value?.toLowerCase() || '';
  const filtered = complaints.filter(c =>
    c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q)
  );
  const el = document.getElementById('support-complaint-list');
  if (!filtered.length) { el.innerHTML = '<div class="empty-history"><p>No complaints found.</p></div>'; return; }
  el.innerHTML = filtered.map(c => `
    <div class="complaint-item" onclick="showSupportDetail('${c.id}', this)">
      <div>
        <div class="item-id">${c.id}</div>
        <div class="item-title">${c.title}</div>
        <div class="item-meta">
          <span class="badge category-badge">${c.category || '--'}</span>
          <span class="status-tag ${(c.status || '').toLowerCase().replace(' ', '-')}">${c.status}</span>
          <span class="item-date">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
        </div>
      </div>
    </div>`).join('');
}

function showSupportDetail(id, el) {
  const c = complaints.find(x => x.id === id);
  if (!c) return;
  document.querySelectorAll('.complaint-item').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  const pane = document.getElementById('support-detail-pane');
  const pw = c.status === 'Resolved' ? '100%' : c.status === 'Escalated' ? '75%' : '15%';
  const sp = Math.round(((c.sentiment?.score || 0) + 1) * 50);
  const sc = sp < 40 ? 'var(--danger)' : sp > 60 ? 'var(--success)' : 'var(--warning)';

  pane.innerHTML = `
    <div class="card status-tracker-widget">
      <div class="status-main-row">
        <div><div class="status-label-txt">Status</div><div class="status-value-txt ${c.status === 'Resolved' ? 'sv-resolved' : 'sv-open'}">${c.status}</div></div>
        <div class="sla-block">
          <div class="sla-timer-lbl">${c.status === 'Resolved' ? 'Resolved in' : 'SLA Countdown'}</div>
          <div class="sla-timer-val" id="sla-s-${c.id}" ${c.status === 'Resolved' ? `style="color:var(--success)"` : ''}>${c.status === 'Resolved' ? (c.resolutionTime || '--') + 'h' : '--:--:--'}</div>
        </div>
      </div>
      <div class="progress-bar-wrap"><div class="progress-fill-bar" style="width:${pw}"></div></div>
      <div class="tracker-footer">Submitted ${c.createdAt ? new Date(c.createdAt).toLocaleString() : '--'}</div>
    </div>
    <div class="card" style="margin-top:1rem; padding:1.25rem;">
      <div class="section-hdr"><h3>AI Classification & Resolution</h3><span class="confidence-badge">Confidence: ${c.confidence || '--'}</span></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div><div class="insight-label">Category</div><span class="badge category-badge">${c.category || '--'}</span></div>
        <div><div class="insight-label">Priority</div><span class="badge priority-${(c.priority||'low').toLowerCase()}">${c.priority || '--'}</span></div>
      </div>
      <div><div class="insight-label">Sentiment</div>
        <div class="sentiment-display"><span style="font-weight:600;">${c.sentiment?.label || 'Neutral'} (${(c.sentiment?.score || 0).toFixed(2)})</span>
        <div class="sentiment-bar"><div class="sentiment-fill" style="width:${sp}%; background:${sc}"></div></div></div>
      </div>
      ${c.resolution ? `<div style="background:var(--primary-pale); border:1px solid #bfdbfe; border-radius:var(--radius-md); padding:1.25rem; margin-top:0.75rem;">
        <div style="font-weight:700; color:var(--primary); margin-bottom:0.4rem;">Recommended: ${c.resolution}</div>
        <p style="color:var(--text-secondary); font-size:0.85rem; line-height:1.6;">${c.resolutionExplanation || ''}</p></div>` : ''}
    </div>
    <div class="card" style="margin-top:1rem; padding:1.25rem;">
      <div class="section-hdr"><h3>Description</h3></div>
      <p style="font-size:0.9rem; line-height:1.7; color:var(--text-secondary);">${c.description || 'No description.'}</p>
    </div>
    ${c.status !== 'Resolved' ? `<div style="display:flex; gap:0.75rem; margin-top:1rem;">
      <button class="btn btn-primary" onclick="resolveFromSupport('${c.id}')">Mark Resolved</button>
      <button class="btn btn-outline" onclick="escalateFromSupport('${c.id}')">Escalate</button>
      <button class="btn btn-outline" onclick="window.open('/api/export/pdf/${c.id}')">Download PDF</button>
    </div>` : `<div style="margin-top:1rem;"><button class="btn btn-outline" onclick="window.open('/api/export/pdf/${c.id}')">Download PDF Report</button></div>`}`;

  if (c.status !== 'Resolved' && c.slaDeadline) startSLATimer(c.id, c.slaDeadline, `sla-s-${c.id}`);
}

function startSLATimer(id, deadline, elId) {
  const tick = () => {
    const el = document.getElementById(elId); if (!el) return;
    const d = new Date(deadline) - new Date();
    if (d <= 0) { el.textContent = 'OVERDUE'; el.style.color = 'var(--danger)'; return; }
    const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  tick(); setInterval(tick, 1000);
}

async function resolveFromSupport(id) { await updateComplaint(id, { status: 'Resolved' }); renderSupportComplaints(); showSupportDetail(id, null); }
async function escalateFromSupport(id) { await updateComplaint(id, { escalated: true }); renderSupportComplaints(); showSupportDetail(id, null); }

// ─── Channels ─────────────────────────────────────────────────────────────────
function selectComplaintType(type) {
  document.getElementById('type-selection-grid').style.display = 'none';
  document.querySelector('.channel-header').style.display = 'none';
  const containers = ['text-form-container', 'email-form-container', 'call-form-container', 'liveaudio-form-container', 'direct-form-container'];
  containers.forEach(c => document.getElementById(c).style.display = 'none');
  const map = { 'Text': 'text-form-container', 'Email': 'email-form-container', 'Call': 'call-form-container', 'LiveAudio': 'liveaudio-form-container', 'Direct': 'direct-form-container' };
  if (map[type]) document.getElementById(map[type]).style.display = 'block';
}

function backToChannels() {
  document.getElementById('type-selection-grid').style.display = 'flex';
  document.querySelector('.channel-header').style.display = 'block';
  ['text-form-container', 'email-form-container', 'call-form-container', 'liveaudio-form-container', 'direct-form-container'].forEach(c => document.getElementById(c).style.display = 'none');
}

function resetSubmitFlow() {
  document.getElementById('success-container').style.display = 'none';
  backToChannels(); switchSubView('support-new');
}

function showSuccess(c) {
  lastSuccessId = c.id;
  document.getElementById('success-container').style.display = 'block';
  ['text-form-container', 'email-form-container', 'call-form-container', 'liveaudio-form-container', 'direct-form-container'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('type-selection-grid').style.display = 'none';
  document.querySelector('.channel-header').style.display = 'none';
  document.getElementById('success-id').textContent = c.id;
}

function downloadComplaintPDF() { if (lastSuccessId) window.open('/api/export/pdf/' + lastSuccessId); }

// Text form
document.getElementById('text-complaint-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Classifying...';
  const c = await addComplaint({ type: 'Text', title: document.getElementById('txt-title').value, description: document.getElementById('txt-desc').value });
  btn.disabled = false; btn.textContent = 'Submit for AI Classification';
  if (c) showSuccess(c);
});

// Direct form
function initDirectForm() {
  document.getElementById('direct-complaint-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Classifying...';
    const c = await addComplaint({ type: document.getElementById('direct-channel').value, title: `${document.getElementById('direct-channel').value}: ${document.getElementById('direct-cname').value || 'Walk-in'}`, description: document.getElementById('direct-desc').value });
    btn.disabled = false; btn.textContent = 'Classify & Submit';
    if (c) {
      document.getElementById('direct-result').style.display = 'block';
      document.getElementById('direct-result').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div><strong style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted);">ID</strong><br><span class="id-tag">${c.id}</span></div>
          <div><strong style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted);">Category</strong><br><span class="badge category-badge">${c.category}</span></div>
          <div><strong style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted);">Priority</strong><br><span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span></div>
          <div><strong style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted);">Sentiment</strong><br>${c.sentiment?.label} (${(c.sentiment?.score||0).toFixed(2)})</div>
        </div>
        <div style="margin-top:1rem; padding:0.75rem; background:var(--primary-pale); border-radius:var(--radius-md); border:1px solid #bfdbfe;"><strong style="color:var(--primary);">Resolution: ${c.resolution || '--'}</strong></div>`;
    }
  });
}

// Email
async function generateAIDraft() {
  const to = document.getElementById('email-to').value, subj = document.getElementById('email-subject').value, body = document.getElementById('email-body').value;
  if (!to || !subj || !body) return;
  const btn = document.getElementById('ai-draft-btn');
  btn.querySelector('span').textContent = 'Drafting...';
  await new Promise(r => setTimeout(r, 1500));
  const needsHuman = ['talk to human', 'connect to agent'].some(k => body.toLowerCase().includes(k));
  const resp = needsHuman ? 'Connecting to human support agent...' : `Dear ${to},\n\nThank you for reaching out regarding "${subj}". We sincerely apologize for the inconvenience.\n\nAfter AI analysis, this has been classified as a priority case. You can expect an update within 24-48 hours.\n\nBest regards,\nResolvo Support Team`;
  document.getElementById('ai-draft-content').innerHTML = `<div class="ai-draft-result"><div class="email-chip">Draft Ready</div><div style="font-weight:700; margin-bottom:0.75rem;">Re: ${subj}</div><pre class="preview-body">${resp}</pre><div class="ai-footer"><button class="btn btn-primary" onclick="submitEmailComplaint()">Submit Complaint</button></div></div>`;
  btn.querySelector('span').textContent = 'Draft with AI';
  window._emailDraft = { to, subject: subj, body, aiResponse: resp, isEscalated: needsHuman };
}
async function submitEmailComplaint() {
  if (!window._emailDraft) return;
  const d = window._emailDraft;
  const c = await addComplaint({ type: 'Email', title: `Email: ${d.subject}`, emailSubject: d.subject, description: d.aiResponse, escalated: d.isEscalated });
  if (c) showSuccess(c);
}

// Dial pad
function initDialPad() { const g = document.getElementById('digits-grid'); if (!g) return; g.innerHTML = ['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => `<button class="digit-btn" onclick="dialDigit('${d}')">${d}</button>`).join(''); }
function dialDigit(d) { if (dialNumber.length < 10) { dialNumber += d; document.getElementById('dial-number').textContent = dialNumber || 'Enter Number'; document.getElementById('dial-error').style.display = 'none'; } }
function dialDelete() { dialNumber = dialNumber.slice(0, -1); document.getElementById('dial-number').textContent = dialNumber || 'Enter Number'; }
function handleDialCall() {
  if (dialNumber.length !== 10) { document.getElementById('dial-error').textContent = 'Must be 10 digits'; document.getElementById('dial-error').style.display = 'block'; return; }
  addComplaint({ type: 'Call', phoneNumber: dialNumber, description: `Call summary from ${dialNumber}` }).then(c => { if (c) showSuccess(c); dialNumber = ''; });
}
function toggleVoiceInput() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech not supported'); return; }
  const btn = document.getElementById('voice-btn');
  if (isDialListening) { isDialListening = false; btn.classList.remove('listening'); return; }
  const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = 'en-US';
  isDialListening = true; btn.classList.add('listening'); r.start();
  r.onresult = (e) => { dialNumber = e.results[0][0].transcript.replace(/\D/g, '').slice(0, 10); document.getElementById('dial-number').textContent = dialNumber; isDialListening = false; btn.classList.remove('listening'); };
  r.onerror = r.onend = () => { isDialListening = false; btn.classList.remove('listening'); };
}

// ─── Complaint Table (QAT + sorting) ─────────────────────────────────────────
function renderComplaintTable() {
  const q = document.getElementById('list-search')?.value?.toLowerCase() || '';
  const cf = document.getElementById('filter-cat')?.value || 'All';
  const pf = document.getElementById('filter-pri')?.value || 'All';
  const sf = document.getElementById('filter-stat')?.value || 'All';
  const sortVal = document.getElementById('sort-by')?.value || 'date-desc';

  let filtered = complaints.filter(c => {
    const ms = c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q);
    return ms && (cf === 'All' || c.category === cf) && (pf === 'All' || c.priority === pf) && (sf === 'All' || c.status === sf);
  });

  // Sort
  const priOrder = { High: 3, Medium: 2, Low: 1 };
  filtered.sort((a, b) => {
    switch (sortVal) {
      case 'date-asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'date-desc': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'priority-desc': return (priOrder[b.priority] || 0) - (priOrder[a.priority] || 0);
      case 'sentiment-asc': return (a.sentiment?.score || 0) - (b.sentiment?.score || 0);
      case 'resolution-asc': return (a.resolutionTime || 999) - (b.resolutionTime || 999);
      case 'resolution-desc': return (b.resolutionTime || 0) - (a.resolutionTime || 0);
      default: return 0;
    }
  });

  const tbody = document.getElementById('complaint-table-body');
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No complaints match filters.</td></tr>'; return; }
  tbody.innerHTML = filtered.map(c => {
    const sv = (c.sentiment?.score || 0).toFixed(3);
    return `<tr>
      <td><span class="id-tag">${c.id}</span></td>
      <td><div class="title-cell"><span style="font-weight:600">${c.title}</span><span class="item-subtext">${c.category || '--'}</span></div></td>
      <td><span class="badge priority-${c.priority?.toLowerCase()}">${c.priority}</span></td>
      <td><span style="font-family:monospace; font-size:0.8rem; color:${parseFloat(sv) < 0 ? 'var(--danger)' : 'var(--success)'};">${sv}</span></td>
      <td><span class="badge ${c.status === 'Open' ? 'badge-danger' : c.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
      <td>${c.resolutionTime ? c.resolutionTime + 'h' : '--'}</td>
      <td><button class="action-btn" onclick="showComplaintDetail('${c.id}')">View</button></td>
    </tr>`;
  }).join('');
}

function sortTable(field) {
  const sb = document.getElementById('sort-by');
  const map = { id: 'date-desc', title: 'date-desc', priority: 'priority-desc', sentiment: 'sentiment-asc', status: 'date-desc', resolutionTime: 'resolution-asc' };
  if (sb) { sb.value = map[field] || 'date-desc'; renderComplaintTable(); }
}

function clearFilters() {
  document.getElementById('filter-cat').value = 'All';
  document.getElementById('filter-pri').value = 'All';
  document.getElementById('filter-stat').value = 'All';
  document.getElementById('list-search').value = '';
  document.getElementById('sort-by').value = 'date-desc';
  renderComplaintTable();
}

// ─── Ops Complaint Table ──────────────────────────────────────────────────────
function renderOpsComplaintTable() {
  const q = document.getElementById('ops-list-search')?.value?.toLowerCase() || '';
  const cf = document.getElementById('ops-filter-cat')?.value || 'All';
  const pf = document.getElementById('ops-filter-pri')?.value || 'All';
  const sf = document.getElementById('ops-filter-stat')?.value || 'All';
  const filtered = complaints.filter(c => {
    const ms = c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    return ms && (cf === 'All' || c.category === cf) && (pf === 'All' || c.priority === pf) && (sf === 'All' || c.status === sf);
  });
  const tbody = document.getElementById('ops-complaint-table-body');
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No complaints match.</td></tr>'; return; }
  tbody.innerHTML = filtered.map(c => `<tr>
    <td><span class="id-tag">${c.id}</span></td>
    <td><div class="title-cell"><span style="font-weight:600">${c.title}</span><span class="item-subtext">${c.category || '--'}</span></div></td>
    <td><span class="badge priority-${c.priority?.toLowerCase()}">${c.priority}</span></td>
    <td style="font-family:monospace; font-size:0.8rem;">${(c.sentiment?.score || 0).toFixed(3)}</td>
    <td><span class="badge ${c.status === 'Open' ? 'badge-danger' : c.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
    <td>${c.resolutionTime ? c.resolutionTime + 'h' : '--'}</td>
    <td><button class="action-btn" onclick="showComplaintDetail('${c.id}')">View</button></td>
  </tr>`).join('');
}
function clearOpsFilters() {
  document.getElementById('ops-filter-cat').value = 'All';
  document.getElementById('ops-filter-pri').value = 'All';
  document.getElementById('ops-filter-stat').value = 'All';
  document.getElementById('ops-list-search').value = '';
  renderOpsComplaintTable();
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function showComplaintDetail(id) {
  const c = complaints.find(x => x.id === id); if (!c) return;
  switchView('detail');
  const sp = Math.round(((c.sentiment?.score || 0) + 1) * 50);
  const sc = sp < 40 ? 'var(--danger)' : sp > 60 ? 'var(--success)' : 'var(--warning)';
  document.getElementById('detail-content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <div style="display:flex; align-items:center; gap:1.25rem;">
        <button onclick="history.back()" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">&larr;</button>
        <div><span class="badge category-badge" style="display:inline-block;margin-bottom:0.4rem;">${c.id}</span><h1 style="font-size:1.4rem;font-weight:700;">${c.title}</h1></div>
      </div>
      <div style="display:flex;gap:0.75rem;">
        ${c.status !== 'Resolved' ? `<button class="btn btn-primary" onclick="resolveComplaint('${c.id}')">Resolve</button>` : ''}
        <button class="btn btn-outline" onclick="window.open('/api/export/pdf/${c.id}')">PDF Report</button>
      </div>
    </div>
    <div class="detail-page-grid">
      <div class="detail-main-col">
        <div class="card" style="padding:1.25rem;"><div class="section-hdr"><h3>Description</h3></div><p class="description-text">${c.description || 'No description.'}</p>
          <div class="meta-info"><div class="meta-item">Submitted ${c.createdAt ? new Date(c.createdAt).toLocaleString() : '--'}</div><div class="meta-item">Assigned: ${c.assignedTo}</div><div class="meta-item">Channel: ${c.type || 'Text'}</div></div></div>
        <div class="card" style="padding:1.25rem;"><div class="section-hdr"><h3>AI Resolution</h3><span class="confidence-badge">${c.confidence || '--'}</span></div>
          <div class="resolution-content"><h4>${c.resolution || 'Pending'}</h4><p>${c.resolutionExplanation || ''}</p></div></div>
        <div class="card" style="padding:1.25rem;"><div class="section-hdr"><h3>Timeline</h3></div>
          <div class="timeline">
            <div class="timeline-item tl-active"><div class="timeline-marker"></div><div><p class="timeline-title">Submitted</p><p class="timeline-time">${c.createdAt ? new Date(c.createdAt).toLocaleString() : '--'}</p></div></div>
            <div class="timeline-item tl-active"><div class="timeline-marker"></div><div><p class="timeline-title">Classified: ${c.category}</p><p class="timeline-time">Priority: ${c.priority}</p></div></div>
            ${c.escalated ? '<div class="timeline-item tl-urgent"><div class="timeline-marker"></div><div><p class="timeline-title">Escalated</p></div></div>' : ''}
            ${c.status === 'Resolved' ? `<div class="timeline-item tl-resolved"><div class="timeline-marker"></div><div><p class="timeline-title">Resolved</p><p class="timeline-time">${c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : ''}</p></div></div>` : ''}
          </div></div>
      </div>
      <div>
        <div class="card sla-card" style="padding:1.25rem; margin-bottom:1.25rem;"><h3>SLA Tracking</h3>
          <div class="sla-timer-widget"><div><p class="timer-val" id="det-sla">${c.status === 'Resolved' ? (c.resolutionTime||'--')+'h' : '--:--'}</p><p class="timer-label">${c.status === 'Resolved' ? 'Resolution Time' : 'Remaining'}</p></div></div>
          <div class="sla-row"><span>Priority</span><span class="badge priority-${c.priority?.toLowerCase()}">${c.priority}</span></div>
          <div class="sla-row"><span>Category</span><span>${c.category}</span></div></div>
        <div class="card insight-card" style="padding:1.25rem;"><h3>Sentiment</h3>
          <div class="sentiment-display"><span style="font-weight:600;">${c.sentiment?.label || 'Neutral'}</span>
          <div class="sentiment-bar"><div class="sentiment-fill" style="width:${sp}%;background:${sc}"></div></div></div>
          <div style="font-family:monospace;font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">Score: ${(c.sentiment?.score || 0).toFixed(6)}</div></div>
      </div>
    </div>`;
  if (c.slaDeadline && c.status !== 'Resolved') startSLATimer(c.id, c.slaDeadline, 'det-sla');
}
async function resolveComplaint(id) { await updateComplaint(id, { status: 'Resolved' }); showComplaintDetail(id); }

// ─── AI Chat ──────────────────────────────────────────────────────────────────
function initChatListeners() {
  document.getElementById('chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
  document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (f?.type.startsWith('image/')) { const r = new FileReader(); r.onloadend = () => { attachedImage = r.result; }; r.readAsDataURL(f); }
  });
}
function addChatBubble(role, text) {
  const list = document.getElementById('chat-messages-list');
  const b = document.createElement('div'); b.className = `message-bubble ${role}`;
  b.innerHTML = `<div class="message-content">${text}</div>`;
  list.appendChild(b); list.scrollTop = list.scrollHeight;
}
async function sendChatMessage() {
  const inp = document.getElementById('chat-input'), text = inp.value.trim(); if (!text) return;
  inp.value = ''; addChatBubble('user', text);
  const msg = { role: 'user', content: text }; if (attachedImage) { msg.image_base64 = attachedImage; attachedImage = null; }
  chatHistory.push(msg); addChatBubble('assistant', '<span class="spin" style="display:inline-block;">...</span> Analyzing...');
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: chatHistory, model: MODELS[currentModelIndex] }) });
    const d = await r.json(); document.getElementById('chat-messages-list').lastChild.remove();
    if (d.error) throw new Error(d.error);
    let reply = d.content || '', parsed = null;
    try { const m = reply.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) {}
    const dt = parsed?.reply || reply; addChatBubble('assistant', dt); chatHistory.push({ role: 'assistant', content: dt });
    if (parsed) { if (parsed.category) document.getElementById('meta-category').textContent = parsed.category; if (parsed.priority) { const el = document.getElementById('meta-priority'); el.textContent = parsed.priority; el.className = `badge priority-${parsed.priority.toLowerCase()}`; } if (parsed.mood !== undefined) document.getElementById('meta-sentiment').textContent = parseFloat(parsed.mood).toFixed(1); failedTurns = 0; currentModelIndex = 0; } else { failedTurns++; }
    document.getElementById('failed-turns').textContent = failedTurns;
    if (failedTurns >= 2) { document.getElementById('escalate-btn').disabled = false; document.getElementById('escalate-btn').classList.add('escalate-btn-active'); }
  } catch (e) {
    document.getElementById('chat-messages-list').lastChild?.remove();
    currentModelIndex = Math.min(currentModelIndex + 1, MODELS.length - 1); failedTurns++;
    document.getElementById('failed-turns').textContent = failedTurns;
    addChatBubble('assistant', `Retrying with ${MODELS[currentModelIndex]}...`);
    if (currentModelIndex < MODELS.length) setTimeout(sendChatMessage, 500);
  }
}
function handleEscalate() { addChatBubble('assistant', 'Escalating to human agent...'); document.getElementById('escalate-btn').disabled = true; }

// ─── AI Review (QAT) ─────────────────────────────────────────────────────────
function populateReviewDropdown() {
  const sel = document.getElementById('review-complaint-select'); if (!sel) return;
  sel.innerHTML = '<option value="">-- Select --</option>';
  complaints.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.id} - ${c.title} [${c.category}]`; sel.appendChild(o); });
}
function filterReviewDropdown() {
  const q = document.getElementById('review-search')?.value?.toLowerCase() || '';
  const sel = document.getElementById('review-complaint-select');
  sel.innerHTML = '<option value="">-- Select --</option>';
  complaints.filter(c => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q))
    .forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.id} - ${c.title} [${c.category}]`; sel.appendChild(o); });
}
function previewReviewComplaint() {
  const id = document.getElementById('review-complaint-select').value;
  const p = document.getElementById('review-complaint-preview');
  if (!id) { p.innerHTML = ''; return; }
  const c = complaints.find(x => x.id === id); if (!c) return;
  p.innerHTML = `<strong>${c.title}</strong><p style="font-size:0.82rem; color:var(--text-secondary); margin:0.5rem 0;">${c.description || '--'}</p>
    <div style="display:flex;gap:0.5rem;"><span class="badge category-badge">${c.category}</span><span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span><span class="badge ${c.status==='Resolved'?'badge-success':'badge-danger'}">${c.status}</span></div>`;
}
async function runAIReview() {
  const id = document.getElementById('review-complaint-select').value; if (!id) return;
  const c = complaints.find(x => x.id === id); if (!c) return;
  const btn = document.getElementById('ai-review-btn'); btn.disabled = true; btn.textContent = 'Analyzing...';
  try {
    const r = await fetch('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: c.description || c.title }) });
    const res = await r.json();
    const cm = res.category === c.category, pm = res.priority === c.priority;
    document.getElementById('ai-review-result').innerHTML = `
      <div class="review-result-grid">
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Category</div><span class="badge category-badge">${res.category}</span> <span style="font-size:0.75rem;color:${cm?'var(--success)':'var(--danger)'};font-weight:600;">${cm?'Match':'Mismatch'}</span></div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Priority</div><span class="badge priority-${res.priority.toLowerCase()}">${res.priority}</span> <span style="font-size:0.75rem;color:${pm?'var(--success)':'var(--danger)'};font-weight:600;">${pm?'Match':'Mismatch'}</span></div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Sentiment</div>${res.sentiment?.label} (${(res.sentiment?.score||0).toFixed(3)})</div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Confidence</div>${res.confidence}</div>
      </div>
      <div style="margin-top:1rem;padding:0.75rem;background:var(--primary-pale);border-radius:var(--radius-md);border:1px solid #bfdbfe;"><strong style="color:var(--primary);">Resolution: ${res.resolution}</strong><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.25rem;">${res.explanation||''}</p></div>`;
  } catch (e) { document.getElementById('ai-review-result').innerHTML = `<p style="color:var(--danger);">Error: ${e.message}</p>`; }
  btn.disabled = false; btn.textContent = 'Re-Classify with AI';
}
async function runManualReview() {
  const text = document.getElementById('manual-review-text')?.value?.trim(); if (!text) return;
  try {
    const r = await fetch('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: text }) });
    const res = await r.json(); const rd = document.getElementById('manual-review-result'); rd.style.display = 'block';
    rd.innerHTML = `<div class="review-result-grid"><div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Category</div><span class="badge category-badge">${res.category}</span></div><div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Priority</div><span class="badge priority-${res.priority.toLowerCase()}">${res.priority}</span></div><div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Sentiment</div>${res.sentiment?.label} (${(res.sentiment?.score||0).toFixed(3)})</div><div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Confidence</div>${res.confidence}</div></div><div style="margin-top:1rem;padding:0.75rem;background:var(--primary-pale);border-radius:var(--radius-md);border:1px solid #bfdbfe;"><strong style="color:var(--primary);">${res.resolution}</strong><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.25rem;">${res.explanation||''}</p></div>`;
  } catch (e) { const rd = document.getElementById('manual-review-result'); rd.style.display = 'block'; rd.innerHTML = `<p style="color:var(--danger);">Error: ${e.message}</p>`; }
}

// ─── QAT Email ────────────────────────────────────────────────────────────────
function populateQATEmailDropdown() {
  const sel = document.getElementById('qat-email-complaint'); if (!sel) return;
  sel.innerHTML = '<option value="">-- Choose --</option>';
  complaints.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.id} - ${c.title}`; sel.appendChild(o); });
}
function previewEmailComplaint() {
  const id = document.getElementById('qat-email-complaint').value;
  const p = document.getElementById('qat-email-preview'); if (!id) { p.innerHTML = ''; return; }
  const c = complaints.find(x => x.id === id); if (!c) return;
  p.innerHTML = `<strong>${c.title}</strong><br><span class="badge category-badge" style="margin-top:0.25rem;">${c.category}</span> <span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span>`;
  document.getElementById('qat-email-subject').value = `Re: ${c.title} [${c.id}]`;
}
function autoFillQATEmail() {
  const id = document.getElementById('qat-email-complaint').value;
  const c = id ? complaints.find(x => x.id === id) : null;
  const body = c ? `Dear Customer,\n\nRegarding your complaint ${c.id} - "${c.title}":\n\nAfter thorough quality review, our AI classification system has categorized this as a ${c.category} issue with ${c.priority} priority.\n\nRecommended Resolution: ${c.resolution || 'Under review'}\n${c.resolutionExplanation || ''}\n\nWe are committed to resolving this within our SLA timeframe. Please do not hesitate to reach out if you need further assistance.\n\nBest regards,\nQuality Assurance Team\nResolvo` : 'Please select a complaint first.';
  document.getElementById('qat-email-body').value = body;
}
function sendQATEmail() {
  document.getElementById('qat-email-sent').style.display = 'block';
  setTimeout(() => { document.getElementById('qat-email-sent').style.display = 'none'; }, 4000);
}

// ─── SLA Settings (Ops) ──────────────────────────────────────────────────────
async function loadSLASettings() {
  try {
    const r = await fetch('/api/sla-settings'); const s = await r.json();
    document.getElementById('sla-high').value = s.High || 24;
    document.getElementById('sla-medium').value = s.Medium || 48;
    document.getElementById('sla-low').value = s.Low || 72;
  } catch (e) {}
  renderSLACompliance();
}
async function saveSLASettings() {
  const data = { High: parseInt(document.getElementById('sla-high').value), Medium: parseInt(document.getElementById('sla-medium').value), Low: parseInt(document.getElementById('sla-low').value) };
  try {
    await fetch('/api/sla-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const msg = document.getElementById('sla-save-msg'); msg.textContent = 'SLA settings saved successfully.'; msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  } catch (e) { alert('Failed to save'); }
}
function renderSLACompliance() {
  const open = complaints.filter(c => c.status !== 'Resolved');
  const now = new Date();
  let html = '<table class="data-table"><thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>SLA Deadline</th><th>Status</th></tr></thead><tbody>';
  open.forEach(c => {
    const dl = c.slaDeadline ? new Date(c.slaDeadline) : null;
    const overdue = dl && dl < now;
    html += `<tr><td><span class="id-tag">${c.id}</span></td><td>${c.title}</td><td><span class="badge priority-${c.priority?.toLowerCase()}">${c.priority}</span></td><td style="color:${overdue?'var(--danger)':'var(--text-main)'}; font-weight:${overdue?'700':'400'};">${dl ? dl.toLocaleString() : '--'}${overdue ? ' (OVERDUE)' : ''}</td><td>${c.status}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('sla-compliance-table').innerHTML = html;
}

// ─── Backup & Export (Ops) ────────────────────────────────────────────────────
function updateBackupPreview() {
  const cat = document.getElementById('backup-cat')?.value || 'All';
  const pri = document.getElementById('backup-pri')?.value || 'All';
  const stat = document.getElementById('backup-stat')?.value || 'All';
  const filtered = complaints.filter(c => (cat === 'All' || c.category === cat) && (pri === 'All' || c.priority === pri) && (stat === 'All' || c.status === stat));
  document.getElementById('backup-preview').textContent = `${filtered.length} complaints match current filters.`;
}
function downloadBackupCSV() {
  const params = new URLSearchParams();
  const cat = document.getElementById('backup-cat')?.value; if (cat && cat !== 'All') params.set('category', cat);
  const pri = document.getElementById('backup-pri')?.value; if (pri && pri !== 'All') params.set('priority', pri);
  const stat = document.getElementById('backup-stat')?.value; if (stat && stat !== 'All') params.set('status', stat);
  const from = document.getElementById('backup-from')?.value; if (from) params.set('from', from);
  const to = document.getElementById('backup-to')?.value; if (to) params.set('to', to);
  window.location.href = '/api/export/csv?' + params.toString();
}
function downloadBackupPDF() { window.location.href = '/api/export/pdf'; }
function previewBackup() {
  const cat = document.getElementById('backup-cat')?.value || 'All';
  const pri = document.getElementById('backup-pri')?.value || 'All';
  const stat = document.getElementById('backup-stat')?.value || 'All';
  const filtered = complaints.filter(c => (cat === 'All' || c.category === cat) && (pri === 'All' || c.priority === pri) && (stat === 'All' || c.status === stat));
  const el = document.getElementById('backup-result-table');
  if (!filtered.length) { el.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No complaints match.</p>'; return; }
  el.innerHTML = `<table class="data-table"><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Res. Time</th></tr></thead><tbody>${filtered.map(c => `<tr><td><span class="id-tag">${c.id}</span></td><td>${c.title}</td><td>${c.category}</td><td><span class="badge priority-${c.priority?.toLowerCase()}">${c.priority}</span></td><td>${c.status}</td><td>${c.resolutionTime ? c.resolutionTime + 'h' : '--'}</td></tr>`).join('')}</tbody></table>`;
}

// ─── Live Audio ───────────────────────────────────────────────────────────────
async function toggleAudioRecording() { isRecording ? stopAudioRecording() : startAudioRecording(); }
async function startAudioRecording() {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioContext.createMediaStreamSource(audioStream);
    analyserNode = audioContext.createAnalyser(); analyserNode.fftSize = 256; src.connect(analyserNode);
    audioRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    audioRecorder.ondataavailable = (e) => chunks.push(e.data);
    audioRecorder.onstop = () => processAudioChunks(chunks);
    audioRecorder.start(); isRecording = true; recordingStartTime = Date.now();
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-status').textContent = 'Recording... tap to stop';
    recordingTimer = setInterval(() => {
      const el = Math.floor((Date.now() - recordingStartTime) / 1000);
      document.getElementById('mic-timer').textContent = `${String(Math.floor(el/60)).padStart(2,'0')}:${String(el%60).padStart(2,'0')}`;
    }, 1000);
    drawWaveform();
  } catch (e) { document.getElementById('mic-status').textContent = 'Microphone access denied.'; }
}
function stopAudioRecording() {
  if (audioRecorder?.state === 'recording') audioRecorder.stop();
  audioStream?.getTracks().forEach(t => t.stop());
  if (recordingTimer) clearInterval(recordingTimer);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  isRecording = false; document.getElementById('mic-btn').classList.remove('recording');
  document.getElementById('mic-status').textContent = 'Processing...';
}
function drawWaveform() {
  const cv = document.getElementById('audio-waveform'); if (!cv || !analyserNode) return;
  const ctx = cv.getContext('2d'), bl = analyserNode.frequencyBinCount, da = new Uint8Array(bl);
  (function draw() {
    if (!isRecording) return; animFrameId = requestAnimationFrame(draw);
    analyserNode.getByteTimeDomainData(da); ctx.fillStyle = '#f8f9fb'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.beginPath();
    const sw = cv.width / bl; let x = 0;
    for (let i = 0; i < bl; i++) { const y = (da[i] / 128.0) * cv.height / 2; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); x += sw; }
    ctx.lineTo(cv.width, cv.height / 2); ctx.stroke();
  })();
}
async function processAudioChunks(chunks) {
  const blob = new Blob(chunks, { type: 'audio/webm' }), fd = new FormData(); fd.append('audio', blob, 'recording.webm');
  try {
    const r = await fetch('/api/audio', { method: 'POST', body: fd }); const d = await r.json(); if (d.error) throw new Error(d.error);
    let parsed = null; const content = d.content || '';
    try { const m = content.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) { parsed = { transcript: content, category: 'Unknown', priority: 'Medium', mood: 0, resolution: 'Manual Review', reply: content }; }
    currentTranscript = parsed;
    document.getElementById('mic-status').textContent = 'Tap to start recording'; document.getElementById('mic-timer').textContent = '';
    document.getElementById('transcript-panel').style.display = 'block';
    document.getElementById('transcript-text').textContent = parsed.transcript || parsed.reply || 'No transcript.';
    document.getElementById('audio-analysis-result').innerHTML = `
      <div class="review-result-grid" style="margin-top:0.75rem;">
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Category</div><span class="badge category-badge">${parsed.category||'--'}</span></div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Priority</div><span class="badge priority-${(parsed.priority||'low').toLowerCase()}">${parsed.priority||'--'}</span></div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Sentiment</div>${parsed.mood !== undefined ? parseFloat(parsed.mood).toFixed(1) : '--'}</div>
        <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Resolution</div>${parsed.resolution||'--'}</div>
      </div>`;
  } catch (e) { document.getElementById('mic-status').textContent = 'Error: ' + e.message; }
}
async function convertAudioToComplaint() {
  if (!currentTranscript) return;
  const c = await addComplaint({ type: 'Audio', title: 'Live Audio Complaint', description: currentTranscript.transcript || currentTranscript.reply || '', category: currentTranscript.category, priority: currentTranscript.priority });
  if (c) showSuccess(c);
}
