/* ── Auth state ─────────────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function isLoggedIn() { return !!localStorage.getItem('token'); }

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

/* ── Update navbar based on auth state ─────────────────── */
function updateNav() {
  const user = getUser();
  const loggedIn = isLoggedIn();

  const navLogin    = document.getElementById('navLogin');
  const navRegister = document.getElementById('navRegister');
  const navLogout   = document.getElementById('navLogout');
  const navSeekerDash   = document.getElementById('navSeekerDash');
  const navEmployerDash = document.getElementById('navEmployerDash');
  const navProfile  = document.getElementById('navProfile');

  if (loggedIn && user) {
    navLogin?.style.setProperty('display', 'none');
    navRegister?.style.setProperty('display', 'none');
    navLogout?.style.setProperty('display', '');
    navProfile?.style.setProperty('display', '');

    if (user.role === 'seeker') {
      navSeekerDash?.style.setProperty('display', '');
      navEmployerDash?.style.setProperty('display', 'none');
    } else {
      navEmployerDash?.style.setProperty('display', '');
      navSeekerDash?.style.setProperty('display', 'none');
    }
  } else {
    navLogin?.style.setProperty('display', '');
    navRegister?.style.setProperty('display', '');
    navLogout?.style.setProperty('display', 'none');
    navSeekerDash?.style.setProperty('display', 'none');
    navEmployerDash?.style.setProperty('display', 'none');
    navProfile?.style.setProperty('display', 'none');
  }

  // Wire logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

/* ── Guard: redirect if not logged in ──────────────────── */
function requireAuth(role) {
  if (!isLoggedIn()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  const user = getUser();
  if (role && user?.role !== role) {
    window.location.href = user?.role === 'employer'
      ? '/pages/employer-dashboard.html'
      : '/pages/seeker-dashboard.html';
    return false;
  }
  return true;
}

/* ── Guard: redirect if already logged in ──────────────── */
function requireGuest() {
  if (isLoggedIn()) {
    const user = getUser();
    window.location.href = user?.role === 'employer'
      ? '/pages/employer-dashboard.html'
      : '/pages/seeker-dashboard.html';
    return false;
  }
  return true;
}

// Run nav update on every page
document.addEventListener('DOMContentLoaded', updateNav);
