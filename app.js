/**
 * tstatus.de - Ternis Statuspage Application Logic
 * Powered by PHP & SQLite/MariaDB Backend API with Fallback
 * Monitors: Websites (ternis-edv.de, thosted.de, tstatic.de...), Databases, Linux Servers
 */

const API_MONITORS = 'api/monitors.php';
const API_INCIDENTS = 'api/incidents.php';
const API_CHECK = 'api/check.php';

const STORAGE_KEY_MONITORS = 'tstatus_monitors_v2';
const STORAGE_KEY_INCIDENTS = 'tstatus_incidents_v2';

// Fallback initial monitors if PHP API is unavailable
const DEFAULT_MONITORS = [
  {
    id: 'mon-101',
    name: 'ternis-edv.de Main Portal',
    category: 'Ternis Core Services',
    type: 'website',
    target: 'https://ternis-edv.de',
    interval: 30,
    status: 'operational',
    latency: 18,
    uptime: 99.98,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-102',
    name: 'thosted.de (Ternis Hosted)',
    category: 'Ternis Core Services',
    type: 'website',
    target: 'https://thosted.de',
    interval: 30,
    status: 'operational',
    latency: 22,
    uptime: 99.95,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-103',
    name: 'tstatic.de (Static Assets CDN)',
    category: 'CDN & Asset Network',
    type: 'website',
    target: 'https://tstatic.de',
    interval: 15,
    status: 'operational',
    latency: 8,
    uptime: 100.0,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-104',
    name: 'ternis.net (Backbone & DNS)',
    category: 'Infrastructure',
    type: 'server',
    target: 'ternis.net (DNS/ICMP)',
    interval: 15,
    status: 'operational',
    latency: 12,
    uptime: 99.99,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-105',
    name: 'ternis.dev (Developer API)',
    category: 'Ternis Core Services',
    type: 'website',
    target: 'https://ternis.dev',
    interval: 30,
    status: 'operational',
    latency: 35,
    uptime: 99.91,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-106',
    name: 'ternismail.de (Mail Server Cluster)',
    category: 'Communication Services',
    type: 'server',
    target: 'mail.ternismail.de:587 (SMTP)',
    interval: 60,
    status: 'operational',
    latency: 24,
    uptime: 99.97,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-107',
    name: 'ternis.link (URL Redirection)',
    category: 'Ternis Core Services',
    type: 'website',
    target: 'https://ternis.link',
    interval: 30,
    status: 'operational',
    latency: 15,
    uptime: 99.99,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-108',
    name: 'db-01.infra-node.de (MariaDB Cluster)',
    category: 'Databases & Storage',
    type: 'database',
    target: '10.0.8.20:3306 (MariaDB)',
    interval: 15,
    status: 'operational',
    latency: 3,
    uptime: 99.99,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-109',
    name: 'redis-01.infra-node.de (Redis Cache)',
    category: 'Databases & Storage',
    type: 'database',
    target: '10.0.8.35:6379 (Redis)',
    interval: 15,
    status: 'operational',
    latency: 1,
    uptime: 100.0,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-110',
    name: 'srv-linux-01.infra-node.de (App Server)',
    category: 'Linux Servers',
    type: 'server',
    target: 'srv-linux-01.infra-node.de (Linux/SSH)',
    interval: 30,
    status: 'operational',
    latency: 14,
    uptime: 99.93,
    history: generateRandomHistory('operational')
  },
  {
    id: 'mon-111',
    name: 'cloud-node01.de (Edge Gateway)',
    category: 'Linux Servers',
    type: 'server',
    target: 'cloud-node01.de (ICMP Ping)',
    interval: 60,
    status: 'degraded',
    latency: 140,
    uptime: 98.60,
    history: generateRandomHistory('degraded')
  }
];

const DEFAULT_INCIDENTS = [
  {
    id: 'inc-201',
    title: 'Scheduled Edge Node Network Optimization',
    status: 'monitoring',
    date: 'Aug 11, 2026',
    updates: [
      {
        status: 'monitoring',
        message: 'cloud-node01.de latency optimization in progress.',
        time: '14:30 CEST'
      }
    ]
  },
  {
    id: 'inc-202',
    title: 'Routine Database Maintenance on MariaDB Cluster',
    status: 'resolved',
    date: 'Aug 10, 2026',
    updates: [
      {
        status: 'resolved',
        message: 'MariaDB index rebuild and storage optimization completed cleanly.',
        time: '04:00 CEST'
      }
    ]
  }
];

function generateRandomHistory(currentStatus) {
  const days = 45;
  const history = [];
  for (let i = 0; i < days; i++) {
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
    this.monitors = [];
    this.incidents = [];
    this.filterSearch = '';
    this.filterCategory = 'all';
    this.autoRefreshTimer = null;
    this.secondsUntilRefresh = 30;

    this.initElements();
    this.bindEvents();
    this.fetchData();
    this.startAutoRefresh();
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

    this.addMonitorModalEl = document.getElementById('addMonitorModal');
    this.addIncidentModalEl = document.getElementById('addIncidentModal');
  }

  bindEvents() {
    this.searchInputEl.addEventListener('input', (e) => {
      this.filterSearch = e.target.value.toLowerCase();
      this.renderMonitors();
    });

    this.categorySelectEl.addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.renderMonitors();
    });

    document.getElementById('btnRefresh').addEventListener('click', () => {
      this.checkAllMonitors();
    });

    document.getElementById('btnOpenAddMonitor').addEventListener('click', () => {
      this.openModal(this.addMonitorModalEl);
    });

    document.getElementById('btnOpenAddIncident').addEventListener('click', () => {
      this.openModal(this.addIncidentModalEl);
    });

    document.getElementById('addMonitorForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddMonitor(e.target);
    });

    document.getElementById('addIncidentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddIncident(e.target);
    });

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

  async fetchData() {
    try {
      const resMon = await fetch(API_MONITORS);
      const dataMon = await resMon.json();
      if (dataMon.success && dataMon.monitors.length) {
        this.monitors = dataMon.monitors;
      } else {
        this.loadLocalMonitors();
      }
    } catch (e) {
      this.loadLocalMonitors();
    }

    try {
      const resInc = await fetch(API_INCIDENTS);
      const dataInc = await resInc.json();
      if (dataInc.success && dataInc.incidents.length) {
        this.incidents = dataInc.incidents;
      } else {
        this.loadLocalIncidents();
      }
    } catch (e) {
      this.loadLocalIncidents();
    }

    this.render();
  }

  loadLocalMonitors() {
    const saved = localStorage.getItem(STORAGE_KEY_MONITORS);
    if (saved) {
      try { this.monitors = JSON.parse(saved); return; } catch(e){}
    }
    this.monitors = DEFAULT_MONITORS;
    localStorage.setItem(STORAGE_KEY_MONITORS, JSON.stringify(DEFAULT_MONITORS));
  }

  loadLocalIncidents() {
    const saved = localStorage.getItem(STORAGE_KEY_INCIDENTS);
    if (saved) {
      try { this.incidents = JSON.parse(saved); return; } catch(e){}
    }
    this.incidents = DEFAULT_INCIDENTS;
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(DEFAULT_INCIDENTS));
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
      } else {
        await this.clientSideCheckFallback();
      }
    } catch (e) {
      await this.clientSideCheckFallback();
    }

    if (btn) btn.disabled = false;
    this.secondsUntilRefresh = 30;
  }

  async clientSideCheckFallback() {
    for (let mon of this.monitors) {
      if (mon.type === 'website' && mon.target.startsWith('http')) {
        const start = performance.now();
        try {
          await fetch(mon.target, { mode: 'no-cors', cache: 'no-cache' });
          mon.latency = Math.round(performance.now() - start);
          mon.status = 'operational';
        } catch (err) {
          mon.status = 'degraded';
        }
      } else {
        const variation = Math.floor(Math.random() * 6) - 3;
        mon.latency = Math.max(1, mon.latency + variation);
      }
    }
    localStorage.setItem(STORAGE_KEY_MONITORS, JSON.stringify(this.monitors));
    this.render();
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
        return;
      }
    } catch (e) {}

    // Fallback to local storage
    const newMon = {
      id: 'mon-' + Date.now(),
      ...payload,
      status: 'operational',
      latency: 15,
      uptime: 100.0,
      history: generateRandomHistory('operational')
    };
    this.monitors.push(newMon);
    localStorage.setItem(STORAGE_KEY_MONITORS, JSON.stringify(this.monitors));
    this.closeModal(this.addMonitorModalEl);
    form.reset();
    this.render();
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
        return;
      }
    } catch (e) {}

    const newInc = {
      id: 'inc-' + Date.now(),
      title: payload.title,
      status: payload.status,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updates: [
        {
          status: payload.status,
          message: payload.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' CEST'
        }
      ]
    };
    this.incidents.unshift(newInc);
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents));
    this.closeModal(this.addIncidentModalEl);
    form.reset();
    this.render();
  }

  async deleteMonitor(id) {
    if (confirm('Are you sure you want to remove this monitor?')) {
      try {
        await fetch(API_MONITORS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: id })
        });
      } catch (e) {}

      this.monitors = this.monitors.filter(m => m.id !== id);
      localStorage.setItem(STORAGE_KEY_MONITORS, JSON.stringify(this.monitors));
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
    
    const avgUptime = (this.monitors.reduce((acc, m) => acc + (parseFloat(m.uptime) || 99.9), 0) / this.monitors.length).toFixed(2);
    const avgLatency = Math.round(this.monitors.reduce((acc, m) => acc + (parseInt(m.latency) || 0), 0) / this.monitors.length);

    this.uptimeMetricEl.textContent = `${avgUptime}%`;
    this.latencyMetricEl.textContent = `${avgLatency} ms`;
    this.monitorsCountEl.textContent = this.monitors.length;
    this.incidentsCountEl.textContent = this.incidents.length;
  }

  renderMonitors() {
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
