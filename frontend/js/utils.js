/* ── API base ────────────────────────────────────────────── */
const API = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || (data.errors && data.errors[0]?.msg) || 'Request failed';
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

/* ── Date helpers ───────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Salary formatter ───────────────────────────────────── */
function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = n => n >= 1000 ? `$${Math.round(n/1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

/* ── Badge HTML ─────────────────────────────────────────── */
function jobTypeBadge(type) {
  const map = {
    'full-time':  'badge-blue',
    'part-time':  'badge-purple',
    'contract':   'badge-yellow',
    'internship': 'badge-gray',
    'remote':     'badge-green',
  };
  return `<span class="badge ${map[type] || 'badge-gray'}">${type}</span>`;
}

function statusBadge(status) {
  const map = {
    pending:     'badge-yellow',
    reviewed:    'badge-blue',
    shortlisted: 'badge-purple',
    rejected:    'badge-red',
    hired:       'badge-green',
    open:        'badge-green',
    filled:      'badge-gray',
    closed:      'badge-red',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

/* ── Alert helper ───────────────────────────────────────── */
function showAlert(el, type, msg) {
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  if (type !== 'error') {
    setTimeout(() => el.classList.add('hidden'), 4000);
  }
}

/* ── Company logo placeholder ───────────────────────────── */
function companyInitials(name) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── URL query params ───────────────────────────────────── */
function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

/* ── Escape HTML ────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
