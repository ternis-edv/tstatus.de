/**
 * tstatus.de - Ternis Statuspage Application Logic
 * Monitors: Websites, Databases/Hosts, Linux Servers, APIs
 */

const STORAGE_KEY_MONITORS = 'tstatus_monitors_v1';
const STORAGE_KEY_INCIDENTS = 'tstatus_incidents_v1';

// Initial Demo/Default Monitors Configuration
const DEFAULT_MONITORS = [
  {
    id: 'mon-web-1',
    name: 'tstatus.de Public Portal',
    category: 'Websites & Portals',
    type: 'website',
    target: 'https://tstatus.de',
    interval: 30,
    status: 'operational',
    latency: 24,
    uptime: 99.98,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-web-2',
    name: 'Ternis EDV Main Website',
    category: 'Websites & Portals',
    type: 'website',
    target: 'https://ternis-edv.de',
    interval: 30,
    status: 'operational',
    latency: 38,
    uptime: 99.95,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-db-1',
    name: 'Primary PostgreSQL Host (db-cluster-01)',
    category: 'Databases & Storage',
    type: 'database',
    target: '10.0.4.12:5432 (PostgreSQL)',
    interval: 15,
    status: 'operational',
    latency: 4,
    uptime: 99.99,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-db-2',
    name: 'Redis Cache Cluster (redis-prod)',
    category: 'Databases & Storage',
    type: 'database',
    target: '10.0.4.50:6379 (Redis)',
    interval: 15,
    status: 'operational',
    latency: 2,
    uptime: 100.0,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-srv-1',
    name: 'App Node 01 - Linux (Ubuntu 24.04)',
    category: 'Linux Servers & Infrastructure',
    type: 'server',
    target: 'srv-app-01.ternis-edv.de (SSH/Ping)',
    interval: 20,
    status: 'operational',
    latency: 12,
    uptime: 99.92,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-srv-2',
    name: 'Backup SAN Host (Linux Debian 12)',
    category: 'Linux Servers & Infrastructure',
    type: 'server',
    target: 'san-backup-01.local (Ping/TCP 22)',
    interval: 60,
    status: 'degraded',
    latency: 145,
    uptime: 98.45,
    history: generateRandomHistory('degraded')
  }
];

const DEFAULT_INCIDENTS = [
  {
    id: 'inc-101',
    title: 'Scheduled Storage Maintenance on Backup SAN',
    status: 'monitoring',
    date: 'Aug 11, 2026',
    updates: [
      {
        status: 'monitoring',
        message: 'Maintenance disk check completed. Performance might be slightly degraded while parity rebuilds.',
        time: 'Aug 11, 14:15 CEST'
      },
      {
        status: 'in-progress',
        message: 'SAN storage routine backup verification in progress.',
        time: 'Aug 11, 12:00 CEST'
      }
    ]
  }
];

// Generate 45-day history mockup for uptime bars
function generateRandomHistory(currentStatus) {
  const days = 45;
  const history = [];
  for (let i = 0; i < days; i++) {
    // Recent days match current status, older days mostly operational
    if (i === days - 1) {
      history.push({ day: i + 1, status: currentStatus, latency: Math.floor(Math.random() * 30) + 10 });
    } else {
      const rand = Math.random();
      let s = 'operational';
      if (rand > 0.97) s = 'degraded';
      else if (rand > 0.995) s = 'outage';
      history.push({ day: i + 1, status: s, latency: Math.floor(Math.random() * 40) + 10 });
    }
  }
  return history;
}

class StatusApp {
  constructor() {
    this.monitors = this.loadMonitors();
    this.incidents = this.loadIncidents();
    this.filterSearch = '';
    this.filterCategory = 'all';
    this.autoRefreshTimer = null;
    this.secondsUntilRefresh = 30;

    this.initElements();
    this.bindEvents();
    this.render();
    this.startAutoRefresh();
  }

  loadMonitors() {
    const saved = localStorage.getItem(STORAGE_KEY_MONITORS);
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    this.saveMonitors(DEFAULT_MONITORS);
    return DEFAULT_MONITORS;
  }

  saveMonitors(data) {
    localStorage.setItem(STORAGE_KEY_MONITORS, JSON.stringify(data));
  }

  loadIncidents() {
    const saved = localStorage.getItem(STORAGE_KEY_INCIDENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    this.saveIncidents(DEFAULT_INCIDENTS);
    return DEFAULT_INCIDENTS;
  }

  saveIncidents(data) {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(data));
  }

  initElements() {
    this.globalBannerEl = document.getElementById('globalStatusBanner');
    this.uptimeMetricEl = document.getElementById('metricUptime');
    this.latencyMetricEl = document.getElementById('metricLatency');
    this.monitorsCountEl = document.getElementById('metricMonitorsCount');
    this.incidentsCountEl = document.getElementById('metricIncidentsCount');
    this.categoriesContainerEl = document.getElementById('categoriesContainer');
    this.incidentsContainerEl = document.getElementById('incidentsContainer');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.refreshTimerEl = document.getElementById('refreshTimer');
    this.searchInputEl = document.getElementById('searchInput');
    this.categorySelectEl = document.getElementById('categorySelect');

    // Modals
    this.addMonitorModalEl = document.getElementById('addMonitorModal');
    this.addIncidentModalEl = document.getElementById('addIncidentModal');
  }

  bindEvents() {
    // Search & Filter
    this.searchInputEl.addEventListener('input', (e) => {
      this.filterSearch = e.target.value.toLowerCase();
      this.renderMonitors();
    });

    this.categorySelectEl.addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.renderMonitors();
    });

    // Buttons
    document.getElementById('btnRefresh').addEventListener('click', () => {
      this.checkAllMonitors();
    });

    document.getElementById('btnOpenAddMonitor').addEventListener('click', () => {
      this.openModal(this.addMonitorModalEl);
    });

    document.getElementById('btnOpenAddIncident').addEventListener('click', () => {
      this.openModal(this.addIncidentModalEl);
    });

    // Forms
    document.getElementById('addMonitorForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddMonitor(e.target);
    });

    document.getElementById('addIncidentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddIncident(e.target);
    });

    // Close modals
    document.querySelectorAll('.modal-close, .btn-cancel-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backdrop = e.target.closest('.modal-backdrop');
        this.closeModal(backdrop);
      });
    });
  }

  openModal(modalEl) {
    modalEl.classList.add('active');
  }

  closeModal(modalEl) {
    modalEl.classList.remove('active');
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

    for (let mon of this.monitors) {
      if (mon.type === 'website' && mon.target.startsWith('http')) {
        const start = performance.now();
        try {
          // Attempt real fetch with mode no-cors for external domain reachability
          await fetch(mon.target, { mode: 'no-cors', cache: 'no-cache' });
          const duration = Math.round(performance.now() - start);
          mon.latency = duration;
          mon.status = 'operational';
        } catch (err) {
          mon.status = 'degraded';
        }
      } else {
        // Simulated latency fluctuation for DB / Server targets
        const variation = Math.floor(Math.random() * 6) - 3;
        mon.latency = Math.max(2, mon.latency + variation);
      }
    }

    this.saveMonitors(this.monitors);
    this.render();
    if (btn) btn.disabled = false;
    this.secondsUntilRefresh = 30;
  }

  handleAddMonitor(form) {
    const formData = new FormData(form);
    const newMon = {
      id: 'mon-' + Date.now(),
      name: formData.get('name'),
      category: formData.get('category'),
      type: formData.get('type'),
      target: formData.get('target'),
      interval: parseInt(formData.get('interval') || '30'),
      status: 'operational',
      latency: Math.floor(Math.random() * 30) + 10,
      uptime: 100.0,
      history: generateRandomHistory('operational')
    };

    this.monitors.push(newMon);
    this.saveMonitors(this.monitors);
    this.closeModal(this.addMonitorModalEl);
    form.reset();
    this.render();
  }

  handleAddIncident(form) {
    const formData = new FormData(form);
    const newInc = {
      id: 'inc-' + Date.now(),
      title: formData.get('title'),
      status: formData.get('status'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updates: [
        {
          status: formData.get('status'),
          message: formData.get('message'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' CEST'
        }
      ]
    };

    this.incidents.unshift(newInc);
    this.saveIncidents(this.incidents);
    this.closeModal(this.addIncidentModalEl);
    form.reset();
    this.render();
  }

  deleteMonitor(id) {
    if (confirm('Are you sure you want to remove this monitor?')) {
      this.monitors = this.monitors.filter(m => m.id !== id);
      this.saveMonitors(this.monitors);
      this.render();
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
    
    const avgUptime = (this.monitors.reduce((acc, m) => acc + (m.uptime || 99.9), 0) / this.monitors.length).toFixed(2);
    const avgLatency = Math.round(this.monitors.reduce((acc, m) => acc + (m.latency || 0), 0) / this.monitors.length);

    this.uptimeMetricEl.textContent = `${avgUptime}%`;
    this.latencyMetricEl.textContent = `${avgLatency} ms`;
    this.monitorsCountEl.textContent = this.monitors.length;
    this.incidentsCountEl.textContent = this.incidents.length;
  }

  renderMonitors() {
    this.categoriesContainerEl.innerHTML = '';

    // Group monitors by category
    const categoriesMap = {};
    this.monitors.forEach(mon => {
      // Search filter check
      if (this.filterSearch && !mon.name.toLowerCase().includes(this.filterSearch) && !mon.target.toLowerCase().includes(this.filterSearch)) {
        return;
      }
      // Category filter check
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
      if (catName.includes('Web')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.6 9h16.8M3.6 15h16.8"/></svg>`;
      else if (catName.includes('Database')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>`;
      else if (catName.includes('Server')) catIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>`;

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

        // Render timeline bars
        const barsHtml = (mon.history || []).map(h => `
          <div class="bar-item ${h.status}" data-tooltip="Day ${h.day}: ${h.status.toUpperCase()} (${h.latency}ms)"></div>
        `).join('');

        monCard.innerHTML = `
          <div class="monitor-main-info">
            <div class="monitor-identity">
              <div class="monitor-type-icon">${typeIcon}</div>
              <div class="monitor-name-wrap">
                <h3>${mon.name}</h3>
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
          <div class="incident-date">${inc.date}</div>
        </div>
        <div class="incident-timeline">
          ${updatesHtml}
        </div>
      `;

      this.incidentsContainerEl.appendChild(incCard);
    });
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StatusApp();
});
