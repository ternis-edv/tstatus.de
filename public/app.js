/**
 * tstatus.de - Ternis Statuspage Application Logic
 * Exclusively Powered by /api/v1/ REST Endpoints
 */

const API_V1 = '/api/v1';
const API_INFO = `${API_V1}/info`;
const API_MONITORS = `${API_V1}/monitors`;
const API_INCIDENTS = `${API_V1}/incidents`;
const API_CHECK = `${API_V1}/check`;

const STORAGE_KEY_THEME = 'tstatus_theme_v1';

class StatusApp {
  constructor() {
    this.monitors = [];
    this.incidents = [];
    this.info = null;
    this.filterSearch = '';
    this.filterCategory = 'all';
    this.autoRefreshTimer = null;
    this.secondsUntilRefresh = 30;
    this.currentTheme = this.initTheme();

    this.initElements();
    this.bindEvents();
    this.fetchAppInfo();

    const path = window.location.pathname;
    if (path.startsWith('/s/')) {
      const slug = path.split('/s/')[1];
      if (slug) {
        this.fetchServiceDetail(slug);
      }
    } else {
      this.fetchData();
      this.startAutoRefresh();
    }
  }

  initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    let theme = 'dark';
    if (saved) {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  toggleTheme() {
    this.currentTheme = (this.currentTheme === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem(STORAGE_KEY_THEME, this.currentTheme);
    this.renderThemeToggleIcon();
  }

  renderThemeToggleIcon() {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    if (this.currentTheme === 'light') {
      btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
      btn.title = "Switch to Dark Mode";
    } else {
      btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`;
      btn.title = "Switch to Light Mode";
    }
  }

  initElements() {
    this.globalBannerEl = document.getElementById('globalStatusBanner');
    this.uptimeMetricEl = document.getElementById('metricUptime');
    this.latencyMetricEl = document.getElementById('metricLatency');
    this.monitorsCountEl = document.getElementById('metricMonitorsCount');
    this.incidentsCountEl = document.getElementById('metricIncidentsCount');
    this.categoriesContainerEl = document.getElementById('categoriesContainer');
    this.incidentsContainerEl = document.getElementById('incidentsContainer');
    this.serviceCardContainerEl = document.getElementById('serviceCardContainer');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.refreshTimerEl = document.getElementById('refreshTimer');
    this.searchInputEl = document.getElementById('searchInput');
    this.categorySelectEl = document.getElementById('categorySelect');
    this.footerTextEl = document.getElementById('footerText');

    this.addMonitorModalEl = document.getElementById('addMonitorModal');
    this.addIncidentModalEl = document.getElementById('addIncidentModal');

    this.renderThemeToggleIcon();
  }

  bindEvents() {
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => this.toggleTheme());
    }

    if (this.searchInputEl) {
      this.searchInputEl.addEventListener('input', (e) => {
        this.filterSearch = e.target.value.toLowerCase();
        this.renderMonitors();
      });
    }

    if (this.categorySelectEl) {
      this.categorySelectEl.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderMonitors();
      });
    }

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.checkAllMonitors());
    }

    const btnAddMon = document.getElementById('btnOpenAddMonitor');
    if (btnAddMon) {
      btnAddMon.addEventListener('click', () => this.openModal(this.addMonitorModalEl));
    }

    const btnAddInc = document.getElementById('btnOpenAddIncident');
    if (btnAddInc) {
      btnAddInc.addEventListener('click', () => this.openModal(this.addIncidentModalEl));
    }

    const formAddMon = document.getElementById('addMonitorForm');
    if (formAddMon) {
      formAddMon.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddMonitor(e.target);
      });
    }

    const formAddInc = document.getElementById('addIncidentForm');
    if (formAddInc) {
      formAddInc.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddIncident(e.target);
      });
    }

    document.querySelectorAll('.modal-close, .btn-cancel-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backdrop = e.target.closest('.modal-backdrop');
        this.closeModal(backdrop);
      });
    });
  }

  openModal(modalEl) {
    if (modalEl) modalEl.classList.add('active');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('active');
  }

  async fetchAppInfo() {
    try {
      const res = await fetch(API_INFO);
      const data = await res.json();
      if (data.success && data.data) {
        this.info = data.data;
        if (this.footerTextEl) {
          this.footerTextEl.innerHTML = `
            &copy; 2026 Ternis EDV &bull; <a href="https://tstatus.de" target="_blank">tstatus.de</a> &bull; Open-source Status Platform (${this.info.api_version}) &bull; 
            Commit: <a href="${this.info.github_latest_url}" target="_blank" rel="noopener" style="font-family: monospace; color: var(--accent-primary); border-bottom: 1px dashed var(--accent-primary);">${this.info.commit_hash}</a>
          `;
        }
      }
    } catch (e) {}
  }

  async fetchData() {
    try {
      const resMon = await fetch(API_MONITORS);
      const dataMon = await resMon.json();
      if (dataMon.success && dataMon.data) {
        this.monitors = dataMon.data;
      }
    } catch (e) {}

    try {
      const resInc = await fetch(API_INCIDENTS);
      const dataInc = await resInc.json();
      if (dataInc.success && dataInc.data) {
        this.incidents = dataInc.data;
      }
    } catch (e) {}

    this.render();
  }

  async fetchServiceDetail(slug) {
    try {
      const res = await fetch(`${API_MONITORS}?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.success && data.data) {
        this.renderServiceDetail(data.data);
      } else {
        if (this.serviceCardContainerEl) {
          this.serviceCardContainerEl.innerHTML = `<div style="text-align:center; padding:4rem; color:var(--status-outage);">Service '${slug}' not found. <a href="/">Return to statuspage overview</a></div>`;
        }
      }
    } catch (e) {
      if (this.serviceCardContainerEl) {
        this.serviceCardContainerEl.innerHTML = `<div style="text-align:center; padding:4rem; color:var(--status-outage);">Failed to load service detail from API v1.</div>`;
      }
    }
  }

  renderServiceDetail(mon) {
    if (!this.serviceCardContainerEl) return;
    document.title = `${mon.name} Status | tstatus.de`;

    const barsHtml = (mon.history || []).map(h => `
      <div class="bar-item ${h.status}" data-tooltip="Day ${h.day}: ${h.status.toUpperCase()} (${h.latency}ms)"></div>
    `).join('');

    this.serviceCardContainerEl.innerHTML = `
      <div class="card" style="margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-main);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
          <div>
            <span style="font-size:0.8125rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent-primary); font-weight:600;">
              ${mon.category}
            </span>
            <h1 style="font-size: 2rem; font-weight:700; margin:0.25rem 0 0.5rem 0; color:var(--text-main);">
              ${mon.name}
            </h1>
            <p style="font-family:monospace; color:var(--text-muted); font-size:0.9375rem;">
              Target: ${mon.target}
            </p>
          </div>
          <div>
            <span class="status-badge ${mon.status}" style="font-size: 1rem; padding: 0.5rem 1.25rem;">
              &bull; ${mon.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div class="metrics-grid" style="margin-bottom: 2.5rem;">
        <div class="metric-card">
          <div class="label">Average Latency</div>
          <div class="value">${mon.latency} ms</div>
        </div>
        <div class="metric-card">
          <div class="label">30-Day Uptime</div>
          <div class="value" style="color:var(--status-operational);">${parseFloat(mon.uptime).toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="label">Check Frequency</div>
          <div class="value">Every ${mon.check_interval}s</div>
        </div>
        <div class="metric-card">
          <div class="label">Service Slug</div>
          <div class="value" style="font-size: 1.125rem; font-family:monospace; color:var(--text-sub);">/s/${mon.slug}</div>
        </div>
      </div>

      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 3rem; box-shadow: var(--shadow-main);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight:700; color:var(--text-main);">45-Day Performance History</h3>
          <span style="font-size: 0.875rem; color:var(--text-muted);">Updated via /api/v1/monitors</span>
        </div>

        <div class="timeline-bars" style="height: 48px; gap: 4px;">
          ${barsHtml}
        </div>

        <div style="display:flex; justify-content:space-between; margin-top: 1rem; font-size: 0.8125rem; color: var(--text-muted);">
          <span>45 Days Ago</span>
          <span>Today</span>
        </div>
      </div>
    `;
  }

  startAutoRefresh() {
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
    this.secondsUntilRefresh = 30;
    this.autoRefreshTimer = setInterval(() => {
      this.secondsUntilRefresh--;
      if (this.refreshTimerEl) {
        this.refreshTimerEl.textContent = `${this.secondsUntilRefresh}s`;
      }
      if (this.secondsUntilRefresh <= 0) {
        this.checkAllMonitors();
        this.secondsUntilRefresh = 30;
      }
    }, 1000);
  }

  async checkAllMonitors() {
    const btn = document.getElementById('btnRefresh');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(API_CHECK);
      const data = await res.json();
      if (data.success) {
        await this.fetchData();
      }
    } catch (e) {}

    if (btn) btn.disabled = false;
    this.secondsUntilRefresh = 30;
  }

  async handleAddMonitor(form) {
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      category: formData.get('category'),
      type: formData.get('type'),
      target: formData.get('target'),
      interval: parseInt(formData.get('interval') || '30')
    };

    try {
      const res = await fetch(API_MONITORS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchData();
        this.closeModal(this.addMonitorModalEl);
        form.reset();
      }
    } catch (e) {}
  }

  async handleAddIncident(form) {
    const formData = new FormData(form);
    const payload = {
      title: formData.get('title'),
      status: formData.get('status'),
      message: formData.get('message')
    };

    try {
      const res = await fetch(API_INCIDENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchData();
        this.closeModal(this.addIncidentModalEl);
        form.reset();
      }
    } catch (e) {}
  }

  async deleteMonitor(id) {
    if (confirm('Are you sure you want to remove this monitor?')) {
      try {
        await fetch(API_MONITORS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: id })
        });
        await this.fetchData();
      } catch (e) {}
    }
  }

  render() {
    this.renderGlobalBanner();
    this.renderMetrics();
    this.renderMonitors();
    this.renderIncidents();
    if (this.lastUpdatedEl) {
      this.lastUpdatedEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  renderGlobalBanner() {
    if (!this.globalBannerEl) return;
    let hasOutage = this.monitors.some(m => m.status === 'outage');
    let hasDegraded = this.monitors.some(m => m.status === 'degraded');
    
    let statusClass = 'operational';
    let titleText = 'All Systems Operational';
    let subText = 'All monitored services, database hosts, and servers are responding normally.';
    let iconSvg = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`;

    if (hasOutage) {
      statusClass = 'outage';
      titleText = 'System Outage Detected';
      subText = 'One or more critical services or database hosts are currently offline.';
      iconSvg = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (hasDegraded) {
      statusClass = 'degraded';
      titleText = 'Degraded System Performance';
      subText = 'Some infrastructure components are experiencing higher latency or minor issues.';
      iconSvg = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    }

    this.globalBannerEl.className = `global-status-banner`;
    this.globalBannerEl.innerHTML = `
      <div class="banner-info">
        <div class="status-indicator-lg ${statusClass}">
          ${iconSvg}
        </div>
        <div class="banner-text">
          <h2>${titleText}</h2>
          <p>${subText}</p>
        </div>
      </div>
      <div class="banner-meta">
        <p>Live Monitoring &bull; <strong>tstatus.de</strong></p>
      </div>
    `;
  }

  renderMetrics() {
    if (!this.monitors.length) return;
    
    const avgUptime = (this.monitors.reduce((acc, m) => acc + (parseFloat(m.uptime) || 99.9), 0) / this.monitors.length).toFixed(2);
    const avgLatency = Math.round(this.monitors.reduce((acc, m) => acc + (parseInt(m.latency) || 0), 0) / this.monitors.length);

    if (this.uptimeMetricEl) this.uptimeMetricEl.textContent = `${avgUptime}%`;
    if (this.latencyMetricEl) this.latencyMetricEl.textContent = `${avgLatency} ms`;
    if (this.monitorsCountEl) this.monitorsCountEl.textContent = this.monitors.length;
    if (this.incidentsCountEl) this.incidentsCountEl.textContent = this.incidents.length;
  }

  renderMonitors() {
    if (!this.categoriesContainerEl) return;
    this.categoriesContainerEl.innerHTML = '';

    const categoriesMap = {};
    this.monitors.forEach(mon => {
      if (this.filterSearch && !mon.name.toLowerCase().includes(this.filterSearch) && !mon.target.toLowerCase().includes(this.filterSearch)) {
        return;
      }
      if (this.filterCategory !== 'all' && mon.category !== this.filterCategory) {
        return;
      }

      if (!categoriesMap[mon.category]) {
        categoriesMap[mon.category] = [];
      }
      categoriesMap[mon.category].push(mon);
    });

    if (Object.keys(categoriesMap).length === 0) {
      this.categoriesContainerEl.innerHTML = `
        <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
          No monitors found matching your filter criteria.
        </div>
      `;
      return;
    }

    for (let catName in categoriesMap) {
      const catMonitors = categoriesMap[catName];
      const catSection = document.createElement('div');
      catSection.className = 'category-group';

      let catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      if (catName.includes('Core') || catName.includes('Web')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.6 9h16.8M3.6 15h16.8"/></svg>`;
      else if (catName.includes('Database')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>`;
      else if (catName.includes('Server') || catName.includes('Infra')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>`;

      catSection.innerHTML = `
        <div class="category-header">
          <div class="category-title">
            <span class="category-icon">${catIcon}</span>
            <span>${catName}</span>
          </div>
          <span class="category-status-pill">Operational</span>
        </div>
        <div class="monitor-list"></div>
      `;

      const listEl = catSection.querySelector('.monitor-list');

      catMonitors.forEach(mon => {
        const monCard = document.createElement('div');
        monCard.className = 'monitor-card';
        
        let typeIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
        if (mon.type === 'database') typeIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7"/></svg>`;
        else if (mon.type === 'server') typeIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2"/></svg>`;

        const barsHtml = (mon.history || []).map(h => `
          <div class="bar-item ${h.status}" data-tooltip="Day ${h.day}: ${h.status.toUpperCase()} (${h.latency}ms)"></div>
        `).join('');

        const slugPath = `/s/${mon.slug || mon.id}`;

        monCard.innerHTML = `
          <div class="monitor-main-info">
            <div class="monitor-identity">
              <div class="monitor-type-icon">${typeIcon}</div>
              <div class="monitor-name-wrap">
                <h3><a href="${slugPath}">${mon.name}</a></h3>
                <span class="monitor-target">${mon.target}</span>
              </div>
            </div>
            <div class="monitor-status-wrap">
              <div class="monitor-latency">
                <span class="ms-val">${mon.latency} ms</span>
                <span class="label">Latency</span>
              </div>
              <span class="status-badge ${mon.status}">
                &bull; ${mon.status.toUpperCase()}
              </span>
              <button class="btn btn-sm btn-delete-mon" data-id="${mon.id}" title="Remove Monitor" style="padding:0.2rem 0.5rem; opacity:0.6;">&times;</button>
            </div>
          </div>

          <div class="timeline-section">
            <div class="timeline-bars-header">
              <span>45 Days Uptime History</span>
              <span class="uptime-percentage">${mon.uptime || 99.9}% Uptime</span>
            </div>
            <div class="timeline-bars">
              ${barsHtml}
            </div>
          </div>
        `;

        monCard.querySelector('.btn-delete-mon').addEventListener('click', (e) => {
          this.deleteMonitor(e.target.dataset.id);
        });

        listEl.appendChild(monCard);
      });

      this.categoriesContainerEl.appendChild(catSection);
    }
  }

  renderIncidents() {
    if (!this.incidentsContainerEl) return;
    this.incidentsContainerEl.innerHTML = '';
    if (!this.incidents.length) {
      this.incidentsContainerEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem;">No active or past incidents reported.</p>`;
      return;
    }

    this.incidents.forEach(inc => {
      const incCard = document.createElement('div');
      incCard.className = 'incident-card';

      const updatesHtml = inc.updates.map(u => `
        <div class="incident-update-step">
          <div class="step-status">${u.status}</div>
          <div class="step-message">${u.message}</div>
          <div class="step-time">${u.time}</div>
        </div>
      `).join('');

      incCard.innerHTML = `
        <div class="incident-card-header">
          <div class="incident-title">${inc.title}</div>
          <div class="incident-date">${inc.date || inc.date_str}</div>
        </div>
        <div class="incident-timeline">
          ${updatesHtml}
        </div>
      `;

      this.incidentsContainerEl.appendChild(incCard);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new StatusApp();
});
