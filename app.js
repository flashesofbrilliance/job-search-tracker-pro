/* eslint-env browser */
/* global Chart */
// Job Search Tracker Pro - minimal working implementation per README

(function () {
  'use strict';

  const STORAGE_KEY = 'jst-pro-data-v1';

  const STATUSES = ['Research', 'Applied', 'Interviewing', 'Offer', 'Rejected'];
  const VIBES = ['😐', '🙂', '😊', '🔥'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function sampleData(count = 32) {
    const companies = ['Stripe', 'Coinbase', 'OpenAI', 'Anthropic', 'Square', 'Ramp', 'Brex', 'Datadog', 'Snowflake', 'Nvidia', 'Figma', 'Linear', 'Notion', 'Vercel', 'Cloudflare', 'Plaid'];
    const roles = ['Senior PM', 'Staff Engineer', 'Data Scientist', 'Product Analyst', 'Frontend Eng', 'Fullstack Eng', 'ML Eng', 'DevRel'];
    const locations = ['Remote', 'NYC', 'SF', 'Seattle', 'Austin', 'Remote (US)'];
    const tagsPool = ['FinTech', 'AI', 'Crypto', 'DevTools', 'Infra', 'SaaS'];
    const rows = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const status = rand(STATUSES);
      const applied = new Date(now - Math.floor(Math.random() * 60) * 86400000);
      rows.push({
        id: cryptoRandomId(),
        company: rand(companies),
        role: rand(roles),
        location: rand(locations),
        status,
        vibe: rand(VIBES),
        fit: Math.round(70 + Math.random() * 30),
        tags: [rand(tagsPool), rand(tagsPool)].filter((v, i, a) => a.indexOf(v) === i).join(','),
        notes: 'Auto-generated sample',
        applied: applied.toISOString().slice(0, 10),
      });
    }
    return rows;
  }

  function cryptoRandomId() {
    if (window.crypto && crypto.getRandomValues) {
      const buf = new Uint32Array(2);
      crypto.getRandomValues(buf);
      return [...buf].map(n => n.toString(36)).join('');
    }
    return Math.random().toString(36).slice(2);
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const data = sampleData(34);
    saveData(data);
    return data;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function toCSV(rows) {
    const header = ['Company','Role','Location','Status','Vibe','Fit Score','Tags','Notes','Applied Date'];
    const escape = v => '"' + String(v ?? '').replaceAll('"','""') + '"';
    const lines = [header.join(',')];
    rows.forEach(r => {
      lines.push([
        escape(r.company),
        escape(r.role),
        escape(r.location),
        escape(r.status),
        escape(r.vibe),
        escape(r.fit),
        escape(r.tags),
        escape(r.notes),
        escape(r.applied),
      ].join(','));
    });
    return lines.join('\n');
  }

  function parseCSV(text) {
    // Lightweight CSV parser for simple cases (quotes supported)
    const rows = [];
    const re = /(,|\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^",\n]*))/g;
    let match, row = [];
    while ((match = re.exec(text))) {
      const delim = match[1];
      if (delim === '\n' && row.length) {
        rows.push(row);
        row = [];
      }
      const val = match[2] ? match[2].replace(/""/g, '"') : match[3];
      row.push(val);
    }
    if (row.length) rows.push(row);
    return rows;
  }

  function byId(id) { return document.getElementById(id); }

  class JobSearchTrackerPro {
    constructor() {
      this.rows = loadData();
      this.filtered = this.rows.slice();
      this.$tbody = document.querySelector('#jobs-table tbody');
      this.$search = byId('search');
      this.$import = byId('btn-import');
      this.$export = byId('btn-export');
      this.$file = byId('import-file');
      this.view = 'table';
      this.chart = null;
    }

    init() {
      this.bindUI();
      this.renderTable();
      this.renderAnalytics();
      this.registerServiceWorker();
      if (location.hostname === 'localhost') {
        console.log('Debug mode enabled');
        window.jobTracker = this;
      }
    }

    bindUI() {
      document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => this.switchView(btn.dataset.view));
      });
      this.$search.addEventListener('input', () => this.applyFilter());
      this.$export.addEventListener('click', () => this.exportCSV());
      this.$import.addEventListener('click', () => this.$file.click());
      this.$file.addEventListener('change', (e) => this.handleImport(e));
    }

    switchView(view) {
      this.view = view;
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
      document.getElementById(`view-${view}`).classList.add('is-active');
      if (view === 'analytics') this.renderAnalytics();
    }

    applyFilter() {
      const q = this.$search.value.trim().toLowerCase();
      this.filtered = !q
        ? this.rows.slice()
        : this.rows.filter(r => {
            return [r.company, r.role, r.status, r.tags].join(' ').toLowerCase().includes(q);
          });
      this.renderTable();
      this.renderAnalytics();
    }

    renderTable() {
      const frag = document.createDocumentFragment();
      this.filtered.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(r.company)}</td>
          <td>${escapeHtml(r.role)}</td>
          <td><span class="badge status-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
          <td>${escapeHtml(r.vibe || '')}</td>
          <td>${Number(r.fit) || 0}</td>
          <td>${escapeHtml(r.tags || '')}</td>
          <td>${escapeHtml(r.applied || '')}</td>`;
        frag.appendChild(tr);
      });
      this.$tbody.replaceChildren(frag);
    }

    renderAnalytics() {
      const total = this.filtered.length;
      const counts = countBy(this.filtered, r => r.status);
      const active = (counts['Applied'] || 0) + (counts['Interviewing'] || 0) + (counts['Research'] || 0);
      byId('kpi-total').textContent = String(total);
      byId('kpi-active').textContent = String(active);
      byId('kpi-offers').textContent = String(counts['Offer'] || 0);
      byId('kpi-rejected').textContent = String(counts['Rejected'] || 0);

      const ctx = document.getElementById('statusChart');
      const data = STATUSES.map(s => counts[s] || 0);
      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: STATUSES,
          datasets: [{
            label: 'Applications',
            data,
            backgroundColor: ['#60a5fa','#34d399','#fbbf24','#10b981','#fca5a5'],
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }

    exportCSV() {
      const csv = toCSV(this.rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'job-search-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    }

    handleImport(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rows = parseCSV(String(reader.result));
          const [header, ...data] = rows;
          if (!header || header.length < 2) throw new Error('Invalid CSV');
          const map = indexHeader(header);
          const imported = data.filter(r => r.length).map(r => ({
            id: cryptoRandomId(),
            company: get(r, map.Company),
            role: get(r, map.Role) || get(r, map['Role Title']),
            location: get(r, map.Location) || 'Remote',
            status: get(r, map.Status) || 'Applied',
            vibe: get(r, map.Vibe) || '',
            fit: Number(get(r, map['Fit Score'])) || 0,
            tags: get(r, map.Tags) || '',
            notes: get(r, map.Notes) || '',
            applied: get(r, map['Applied Date']) || '',
          }));
          this.rows = imported.concat(this.rows);
          saveData(this.rows);
          this.applyFilter();
        } catch (err) {
          console.error(err);
          alert('Failed to import CSV. Please check the format.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('Service worker registration failed', err);
          });
        });
      }
    }
  }

  function get(arr, idx) { return (idx != null && idx < arr.length) ? arr[idx] : ''; }
  function indexHeader(header) {
    const idx = {};
    header.forEach((h, i) => { idx[h.trim()] = i; });
    return idx;
  }
  function countBy(arr, fn) {
    return arr.reduce((acc, x) => { const k = fn(x); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]+/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    const app = new JobSearchTrackerPro();
    app.init();
  });
})();

