/**
 * tstatus.de — Application Engine
 * PHP 8.5 Backend REST APIs (/api/v1) & Automated Status Check Job Engine
 */

const API_V1       = '/api/v1';
const API_INFO     = `${API_V1}/info`;
const API_MONITORS = `${API_V1}/monitors`;
const API_INCIDENTS= `${API_V1}/incidents`;
const API_CHECK    = `${API_V1}/check`;
const API_AUTH     = `${API_V1}/auth`;

const THEME_KEY = 'tstatus_theme_v2';

/* ── StatusApp ──────────────────────────────────────────────────────────── */
class StatusApp {
  constructor() {
    this.monitors    = [];
    this.incidents   = [];
    this.info        = null;
    this.user        = null;
    this.filterText  = '';
    this.filterCat   = 'all';
    this.refreshTimer= null;
    this.countdown   = 30;

    this.theme = this._initTheme();
    this._cacheElements();
    this._bindEvents();
    this._checkAuth();
    this._fetchInfo();

    const path = window.location.pathname;
    if (path.startsWith('/s/')) {
      const slug = path.split('/s/')[1];
      if (slug) this._fetchServiceDetail(slug);
    } else {
      this._fetchData();
      this._startCountdown();
    }
  }

  /* ── Theme ──────────────────────────────────────────────────────────── */
  _initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  _toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem(THEME_KEY, this.theme);
    this._renderThemeBtn();
  }

  _renderThemeBtn() {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    const isDark = this.theme === 'dark';
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = isDark
      ? `<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  }

  /* ── Auth ───────────────────────────────────────────────────────────── */
  async _checkAuth() {
    try {
      const res  = await fetch(`${API_AUTH}/me`);
      const data = await res.json();
      this.user  = (data.success && data.authenticated) ? data.data : null;
    } catch { this.user = null; }
    this._renderAdminControls();
  }

  _toggleAdminMode() {
    if (this.user) {
      if (confirm(`Logged in as '${this.user.username}'. Log out?`)) this._handleLogout();
    } else {
      this._openModal(this.loginModal);
    }
  }

  async _handleLogin(form) {
    const fd = new FormData(form);
    const errEl = document.getElementById('loginErrorMsg');
    if (errEl) errEl.style.display = 'none';

    try {
      const res  = await fetch(`${API_AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') })
      });
      const data = await res.json();
      if (data.success) {
        this.user = data.data;
        this._closeModal(this.loginModal);
        form.reset();
        this._renderAdminControls();
        this._renderMonitors();
        this._toast(`Authenticated as ${this.user.username}`);
      } else {
        if (errEl) { errEl.textContent = data.error || 'Invalid credentials'; errEl.style.display = 'block'; }
      }
    } catch {
      if (errEl) { errEl.textContent = 'Connection error.'; errEl.style.display = 'block'; }
    }
  }

  async _handleLogout() {
    try { await fetch(`${API_AUTH}/logout`, { method: 'POST' }); } catch {}
    this.user = null;
    this._renderAdminControls();
    this._renderMonitors();
    this._toast('Logged out of admin mode');
  }

  _renderAdminControls() {
    const group   = document.getElementById('adminControlsGroup');
    const lockBtn = document.getElementById('btnAdminToggle');
    const isAuth  = !!this.user;

    if (group)   group.style.display = isAuth ? 'flex' : 'none';
    if (lockBtn) {
      lockBtn.style.color = isAuth ? 'var(--green)' : '';
      lockBtn.title = isAuth ? `${this.user.username} — click to logout` : 'Admin authentication';
    }
  }

  /* ── DOM Cache & Bind ───────────────────────────────────────────────── */
  _cacheElements() {
    this.statusDot         = document.getElementById('statusDot');
    this.statusTitle       = document.getElementById('statusTitle');
    this.statusSub         = document.getElementById('statusSub');
    this.uptimeEl          = document.getElementById('metricUptime');
    this.latencyEl         = document.getElementById('metricLatency');
    this.monCountEl        = document.getElementById('metricMonitorsCount');
    this.incCountEl        = document.getElementById('metricIncidentsCount');
    this.catsEl            = document.getElementById('categoriesContainer');
    this.incsEl            = document.getElementById('incidentsContainer');
    this.svcDetailEl       = document.getElementById('serviceCardContainer');
    this.lastUpdatedEl     = document.getElementById('lastUpdated');
    this.toolbarUpdatedEl  = document.getElementById('toolbarUpdated');
    this.countdownEl       = document.getElementById('refreshTimer');
    this.searchEl          = document.getElementById('searchInput');
    this.catSelectEl       = document.getElementById('categorySelect');
    this.footerEl          = document.getElementById('footerText');
    this.toastWrap         = document.getElementById('toast-container');

    this.loginModal        = document.getElementById('loginModal');
    this.addMonModal       = document.getElementById('addMonitorModal');
    this.editMonModal      = document.getElementById('editMonitorModal');
    this.addIncModal       = document.getElementById('addIncidentModal');

    this._renderThemeBtn();
  }

  _bindEvents() {
    document.getElementById('btnThemeToggle')
      ?.addEventListener('click', () => this._toggleTheme());

    document.getElementById('btnAdminToggle')
      ?.addEventListener('click', () => this._toggleAdminMode());

    document.getElementById('btnRunCheckJob')
      ?.addEventListener('click', () => this._runJob());

    document.getElementById('loginForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this._handleLogin(e.target); });

    document.getElementById('btnOpenAddMonitor')
      ?.addEventListener('click', () => this._openModal(this.addMonModal));

    document.getElementById('btnOpenAddIncident')
      ?.addEventListener('click', () => this._openModal(this.addIncModal));

    document.getElementById('addMonitorForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this._addMonitor(e.target); });

    document.getElementById('editMonitorForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this._editMonitor(e.target); });

    document.getElementById('addIncidentForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this._addIncident(e.target); });

    // Close buttons
    document.querySelectorAll('.modal-close, .btn-cancel-modal').forEach(btn => {
      btn.addEventListener('click', e => {
        this._closeModal(e.target.closest('.modal-backdrop'));
      });
    });

    // Backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', e => { if (e.target === bd) this._closeModal(bd); });
    });

    // Search
    this.searchEl?.addEventListener('input', e => {
      this.filterText = e.target.value.toLowerCase().trim();
      this._renderMonitors();
    });

    // Category filter
    this.catSelectEl?.addEventListener('change', e => {
      this.filterCat = e.target.value;
      this._renderMonitors();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== this.searchEl) {
        e.preventDefault();
        this.searchEl?.focus();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(m => this._closeModal(m));
      }
    });
  }

  /* ── Modals ─────────────────────────────────────────────────────────── */
  _openModal(el)  { el?.classList.add('active'); }
  _closeModal(el) { el?.classList.remove('active'); }

  /* ── Toast ──────────────────────────────────────────────────────────── */
  _toast(msg, type = 'success') {
    if (!this.toastWrap) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
    this.toastWrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = '0.2s ease';
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  /* ── Data Fetching ──────────────────────────────────────────────────── */
  async _fetchInfo() {
    try {
      const res  = await fetch(API_INFO);
      const data = await res.json();
      if (data.success && data.data && this.footerEl) {
        const d = data.data;
        this.footerEl.innerHTML = `
          &copy; 2026 Ternis EDV &bull;
          <a href="https://tstatus.de" target="_blank">tstatus.de</a> &bull;
          PHP ${d.version || '8.5'} REST API (${d.api_version}) &bull;
          Commit: <a href="${d.github_latest_url}" target="_blank" rel="noopener" style="font-family:var(--mono);">${d.commit_hash}</a>
        `;
      }
    } catch {}
  }

  async _fetchData() {
    try {
      const r = await fetch(API_MONITORS);
      const d = await r.json();
      if (d.success && d.data) this.monitors = d.data;
    } catch {}

    try {
      const r = await fetch(API_INCIDENTS);
      const d = await r.json();
      if (d.success && d.data) this.incidents = d.data;
    } catch {}

    this._render();
  }

  async _fetchServiceDetail(slug) {
    try {
      const res  = await fetch(`${API_MONITORS}?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.data) {
        this._renderServiceDetail(data.data);
      } else if (this.svcDetailEl) {
        this.svcDetailEl.innerHTML = `<div class="empty-state">Service '${slug}' not found. <a href="/">Return to status page</a></div>`;
      }
    } catch {
      if (this.svcDetailEl) this.svcDetailEl.innerHTML = `<div class="empty-state">Failed to load service details.</div>`;
    }
  }

  /* ── Countdown & Job ────────────────────────────────────────────────── */
  _startCountdown() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.countdown = 30;
    this.refreshTimer = setInterval(() => {
      this.countdown--;
      if (this.countdownEl) this.countdownEl.textContent = `${this.countdown}s`;
      if (this.countdown <= 0) {
        this._runJob(true);
        this.countdown = 30;
      }
    }, 1000);
  }

  async _runJob(silent = false) {
    const btn = document.getElementById('btnRunCheckJob');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg class="spin" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Checking…`;
    }

    try {
      const res  = await fetch(API_CHECK);
      const data = await res.json();
      if (data.success) {
        await this._fetchData();
        if (!silent) this._toast(`Job complete — ${data.checked_count ?? data.summary?.checked_count ?? 0} targets checked`);
      }
    } catch {
      if (!silent) this._toast('Health check failed', 'error');
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Run Job`;
    }
    this.countdown = 30;
  }

  /* ── CRUD ───────────────────────────────────────────────────────────── */
  async _addMonitor(form) {
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'), category: fd.get('category'),
      type: fd.get('type'), target: fd.get('target'),
      interval: parseInt(fd.get('interval') || '30')
    };
    try {
      const res  = await fetch(API_MONITORS, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        await this._fetchData();
        this._closeModal(this.addMonModal);
        form.reset();
        this._toast(`Target '${payload.name}' added`);
      } else if (res.status === 401) this._openModal(this.loginModal);
    } catch { this._toast('Failed to add target', 'error'); }
  }

  _openEditModal(mon) {
    document.getElementById('editMonitorId').value       = mon.id;
    document.getElementById('editMonitorName').value     = mon.name;
    document.getElementById('editMonitorCategory').value = mon.category;
    document.getElementById('editMonitorType').value     = mon.type;
    document.getElementById('editMonitorTarget').value   = mon.target;
    document.getElementById('editMonitorStatus').value   = mon.status;
    this._openModal(this.editMonModal);
  }

  async _editMonitor(form) {
    const fd = new FormData(form);
    const payload = {
      action:'update', id:fd.get('id'), name:fd.get('name'),
      category:fd.get('category'), type:fd.get('type'),
      target:fd.get('target'), status:fd.get('status')
    };
    try {
      const res  = await fetch(API_MONITORS, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        await this._fetchData();
        this._closeModal(this.editMonModal);
        this._toast(`Target '${payload.name}' updated`);
      } else if (res.status === 401) this._openModal(this.loginModal);
    } catch { this._toast('Failed to update target', 'error'); }
  }

  async _deleteMonitor(id, name) {
    if (!confirm(`Remove monitor '${name}'?`)) return;
    try {
      const res = await fetch(API_MONITORS, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action:'delete', id })
      });
      if (res.status === 401) { this._openModal(this.loginModal); return; }
      await this._fetchData();
      this._toast(`Monitor '${name}' removed`);
    } catch { this._toast('Failed to remove monitor', 'error'); }
  }

  async _addIncident(form) {
    const fd = new FormData(form);
    const payload = { title:fd.get('title'), status:fd.get('status'), message:fd.get('message') };
    try {
      const res  = await fetch(API_INCIDENTS, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        await this._fetchData();
        this._closeModal(this.addIncModal);
        form.reset();
        this._toast('Incident notice published');
      } else if (res.status === 401) this._openModal(this.loginModal);
    } catch { this._toast('Failed to publish notice', 'error'); }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  _render() {
    this._renderHero();
    this._renderMetrics();
    this._renderMonitors();
    this._renderIncidents();

    const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    if (this.lastUpdatedEl)    this.lastUpdatedEl.textContent    = now;
    if (this.toolbarUpdatedEl) this.toolbarUpdatedEl.textContent = now;
  }

  _renderHero() {
    const hasOutage   = this.monitors.some(m => m.status === 'outage');
    const hasDegraded = this.monitors.some(m => m.status === 'degraded');

    let dotClass = 'status-dot live';
    let title    = 'All Systems Operational';
    let sub      = 'All monitored services, databases, and servers are responding normally.';

    if (hasOutage) {
      dotClass = 'status-dot outage live';
      title    = 'System Outage Detected';
      sub      = 'One or more critical services are currently offline.';
    } else if (hasDegraded) {
      dotClass = 'status-dot degraded live';
      title    = 'Degraded Performance';
      sub      = 'Some services are experiencing elevated latency or minor issues.';
    }

    if (this.statusDot)   this.statusDot.className   = dotClass;
    if (this.statusTitle) this.statusTitle.textContent = title;
    if (this.statusSub)   this.statusSub.textContent   = sub;
  }

  _renderMetrics() {
    if (!this.monitors.length) return;
    const avgUptime  = (this.monitors.reduce((a, m) => a + (parseFloat(m.uptime)  || 99.9), 0) / this.monitors.length).toFixed(2);
    const avgLatency = Math.round(this.monitors.reduce((a, m) => a + (parseInt(m.latency) || 0), 0) / this.monitors.length);

    if (this.uptimeEl)   this.uptimeEl.textContent   = `${avgUptime}%`;
    if (this.latencyEl)  this.latencyEl.textContent  = `${avgLatency} ms`;
    if (this.monCountEl) this.monCountEl.textContent = this.monitors.length;
    if (this.incCountEl) this.incCountEl.textContent = this.incidents.length;
  }

  _buildBars(history) {
    if (!history?.length) return '';
    return history.map(h => `
      <div class="bar ${h.status}" data-tip="Day ${h.day}: ${h.status} (${h.latency}ms)"></div>
    `).join('');
  }

  _uptimeClass(pct) {
    if (pct < 95) return 'outage';
    if (pct < 99) return 'degraded';
    return '';
  }

  _renderMonitors() {
    if (!this.catsEl) return;
    this.catsEl.innerHTML = '';

    // Filter
    const filtered = this.monitors.filter(mon => {
      const matchText = !this.filterText ||
        mon.name.toLowerCase().includes(this.filterText) ||
        mon.target.toLowerCase().includes(this.filterText);
      const matchCat  = this.filterCat === 'all' || mon.category === this.filterCat;
      return matchText && matchCat;
    });

    if (!filtered.length) {
      this.catsEl.innerHTML = `<div class="empty-state">No services match your filter.</div>`;
      return;
    }

    // Group by category
    const cats = {};
    filtered.forEach(mon => {
      if (!cats[mon.category]) cats[mon.category] = [];
      cats[mon.category].push(mon);
    });

    for (const catName in cats) {
      const mons    = cats[catName];
      const hasIssue= mons.some(m => m.status !== 'operational' && m.status !== 'maintenance');
      const group   = document.createElement('div');
      group.className = 'cat-group';

      const labelRow = document.createElement('div');
      labelRow.className = 'cat-label-row';
      labelRow.innerHTML = `
        <span class="cat-name">${catName}</span>
        <span class="cat-pill${hasIssue ? ' issues' : ''}">${hasIssue ? 'Issues Detected' : 'Operational'}</span>
      `;
      group.appendChild(labelRow);

      mons.forEach(mon => {
        const row = document.createElement('div');
        row.className = 'monitor-row';

        const uptimePct = parseFloat(mon.uptime) || 99.9;
        const uClass    = this._uptimeClass(uptimePct);
        const slugPath  = `/s/${mon.slug || mon.id}`;
        const barsHtml  = this._buildBars(mon.history);

        const adminHtml = this.user ? `
          <div class="mon-admin">
            <button class="btn-xs btn-edit-mon">Edit</button>
            <button class="btn-xs danger btn-del-mon">Remove</button>
          </div>
        ` : '';

        row.innerHTML = `
          <div class="mon-info">
            <div class="mon-name"><a href="${slugPath}">${mon.name}</a></div>
            <div class="mon-target">${mon.target} &bull; every ${mon.check_interval || 30}s</div>
          </div>
          <div class="mon-timeline">
            <div class="timeline-meta">
              <span>45 days</span>
              <span class="uptime-pct ${uClass}">${uptimePct.toFixed(2)}%</span>
            </div>
            <div class="bars">${barsHtml}</div>
          </div>
          <div class="mon-right">
            <div class="mon-latency">${mon.latency} ms</div>
            <span class="badge ${mon.status}">${mon.status}</span>
            ${adminHtml}
          </div>
        `;

        if (this.user) {
          row.querySelector('.btn-edit-mon')?.addEventListener('click', () => this._openEditModal(mon));
          row.querySelector('.btn-del-mon')?.addEventListener('click',  () => this._deleteMonitor(mon.id, mon.name));
        }

        group.appendChild(row);
      });

      this.catsEl.appendChild(group);
    }
  }

  _renderIncidents() {
    if (!this.incsEl) return;
    this.incsEl.innerHTML = '';

    if (!this.incidents.length) {
      this.incsEl.innerHTML = `<p class="incidents-empty">No incidents or maintenance notices reported.</p>`;
      return;
    }

    this.incidents.forEach(inc => {
      const updatesHtml = (inc.updates || []).map(u => `
        <div class="update-entry">
          <div class="update-status">${u.status}</div>
          <div class="update-msg">${u.message}</div>
          <div class="update-time">${u.time}</div>
        </div>
      `).join('');

      const el = document.createElement('div');
      el.className = 'incident-item';
      el.innerHTML = `
        <div class="incident-head">
          <div>
            <div class="incident-title">${inc.title}</div>
            <span class="badge ${inc.status}" style="margin-top:6px;">${inc.status}</span>
          </div>
          <div class="incident-date">${inc.date || inc.date_str || ''}</div>
        </div>
        ${updatesHtml ? `<div class="incident-updates">${updatesHtml}</div>` : ''}
      `;
      this.incsEl.appendChild(el);
    });
  }

  /* ── Service Detail Page ────────────────────────────────────────────── */
  _renderServiceDetail(mon) {
    if (!this.svcDetailEl) return;
    document.title = `${mon.name} — tstatus.de`;

    const barsHtml  = this._buildBars(mon.history);
    const uptimePct = parseFloat(mon.uptime) || 99.9;

    this.svcDetailEl.innerHTML = `
      <div class="status-hero" style="margin-top: 32px;">
        <div class="status-hero-inner">
          <div>
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-3); margin-bottom:6px;">
              ${mon.category} &bull; ${mon.type}
            </div>
            <h1 style="font-size:22px; font-weight:600; letter-spacing:-0.02em;">${mon.name}</h1>
            <p style="font-family:var(--mono); font-size:12px; color:var(--text-3); margin-top:4px;">${mon.target}</p>
          </div>
          <span class="badge ${mon.status}">${mon.status}</span>
        </div>
      </div>

      <div class="metrics-row" style="margin-bottom:24px;">
        <div class="metric-cell">
          <div class="metric-label">Response Latency</div>
          <div class="metric-value">${mon.latency} ms</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">30-Day SLA</div>
          <div class="metric-value" style="color:var(--green);">${uptimePct.toFixed(2)}%</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Check Interval</div>
          <div class="metric-value">Every ${mon.check_interval}s</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Identifier</div>
          <div class="metric-value" style="font-size:14px; color:var(--text-2);">${mon.slug}</div>
        </div>
      </div>

      <div style="padding: 0 0 32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-3);">45-Day Uptime History</span>
          <span style="font-size:12px; font-family:var(--mono); color:var(--text-3);">via Tstatus Job Engine</span>
        </div>
        <div class="bars" style="height:28px; gap:3px;">${barsHtml}</div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-3); margin-top:6px;">
          <span>45 days ago</span>
          <span>Today</span>
        </div>
      </div>

      <p style="margin-top:8px; font-size:13px; color:var(--text-2);">
        <a href="/" style="border-bottom:1px solid var(--border);">&larr; Back to status page</a>
      </p>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new StatusApp(); });
