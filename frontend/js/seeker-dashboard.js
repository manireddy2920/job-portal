document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('seeker')) return;

  const user = getUser();
  document.getElementById('dashName').textContent = user.name;
  document.getElementById('dashAvatar').textContent = companyInitials(user.name);

  // Tab navigation
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.dash-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });

  // Handle URL hash tabs
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const link = document.querySelector(`.dash-nav-link[data-tab="${hash}"]`);
    if (link) link.click();
  }

  await Promise.all([loadApplications(), loadProfile()]);

  // Status filter
  document.getElementById('appStatusFilter').addEventListener('change', filterApplications);

  // Profile form
  document.getElementById('seekerProfileForm').addEventListener('submit', saveProfile);
});

let allApplications = [];

async function loadApplications() {
  try {
    const { applications } = await apiFetch('/applications/my');
    allApplications = applications;
    renderStats(applications);
    renderRecentApps(applications.slice(0, 5));
    renderAllApps(applications);
  } catch (err) {
    ['recentApps', 'allApps'].forEach(id =>
      document.getElementById(id).innerHTML = '<p class="empty-state">Could not load applications.</p>'
    );
  }
}

function renderStats(apps) {
  document.getElementById('statTotal').textContent = apps.length;
  document.getElementById('statPending').textContent = apps.filter(a => a.status === 'pending').length;
  document.getElementById('statShortlisted').textContent = apps.filter(a => a.status === 'shortlisted').length;
  document.getElementById('statHired').textContent = apps.filter(a => a.status === 'hired').length;
}

function appCardHtml(app) {
  return `
    <div class="app-card">
      <div class="company-logo">${escHtml(companyInitials(app.company_name))}</div>
      <div class="app-card-body">
        <h4><a href="/pages/job-detail.html?id=${app.job_id}">${escHtml(app.job_title)}</a></h4>
        <div class="company-name">${escHtml(app.company_name || '–')}</div>
        <div class="app-card-meta">
          <span class="badge badge-gray">${escHtml(app.location || '')}</span>
          ${jobTypeBadge(app.job_type)}
        </div>
      </div>
      <div class="app-card-side">
        ${statusBadge(app.status)}
        <span class="app-date">Applied ${timeAgo(app.applied_at)}</span>
        ${app.status === 'pending' ?
          `<button class="btn btn-outline btn-sm withdraw-btn" data-id="${app.id}">Withdraw</button>` : ''}
      </div>
    </div>`;
}

function renderRecentApps(apps) {
  const el = document.getElementById('recentApps');
  if (!apps.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No applications yet</h3>
      <p>Start applying to jobs!</p></div>`;
    return;
  }
  el.innerHTML = apps.map(appCardHtml).join('');
  attachWithdrawHandlers(el);
}

function renderAllApps(apps) {
  const el = document.getElementById('allApps');
  if (!apps.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No applications yet</h3>
      <p><a href="/pages/jobs.html">Browse jobs</a> to get started.</p></div>`;
    return;
  }
  el.innerHTML = apps.map(appCardHtml).join('');
  attachWithdrawHandlers(el);
}

function filterApplications() {
  const status = document.getElementById('appStatusFilter').value;
  const filtered = status ? allApplications.filter(a => a.status === status) : allApplications;
  renderAllApps(filtered);
}

function attachWithdrawHandlers(container) {
  container.querySelectorAll('.withdraw-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Withdraw this application?')) return;
      try {
        await apiFetch(`/applications/${btn.dataset.id}`, { method: 'DELETE' });
        await loadApplications();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function loadProfile() {
  try {
    const { profile } = await apiFetch('/profiles/seeker/me');
    document.getElementById('pName').value       = profile.name || '';
    document.getElementById('pHeadline').value   = profile.headline || '';
    document.getElementById('pPhone').value      = profile.phone || '';
    document.getElementById('pLocation').value   = profile.location || '';
    document.getElementById('pBio').value        = profile.bio || '';
    document.getElementById('pSkills').value     = profile.skills || '';
    document.getElementById('pExperience').value = profile.experience || '';
    document.getElementById('pEducation').value  = profile.education || '';
    document.getElementById('pWebsite').value    = profile.website || '';
    document.getElementById('pLinkedin').value   = profile.linkedin || '';
  } catch {}
}

async function saveProfile(e) {
  e.preventDefault();
  const alertEl = document.getElementById('profileAlert');
  alertEl.classList.add('hidden');

  try {
    await apiFetch('/profiles/seeker', {
      method: 'PUT',
      body: JSON.stringify({
        name:       document.getElementById('pName').value.trim(),
        headline:   document.getElementById('pHeadline').value.trim(),
        phone:      document.getElementById('pPhone').value.trim(),
        location:   document.getElementById('pLocation').value.trim(),
        bio:        document.getElementById('pBio').value.trim(),
        skills:     document.getElementById('pSkills').value.trim(),
        experience: document.getElementById('pExperience').value.trim(),
        education:  document.getElementById('pEducation').value.trim(),
        website:    document.getElementById('pWebsite').value.trim(),
        linkedin:   document.getElementById('pLinkedin').value.trim(),
      }),
    });
    showAlert(alertEl, 'success', 'Profile saved successfully!');
    // Update stored user name
    const user = getUser();
    const newName = document.getElementById('pName').value.trim();
    if (newName) {
      user.name = newName;
      localStorage.setItem('user', JSON.stringify(user));
      document.getElementById('dashName').textContent = newName;
    }
  } catch (err) {
    showAlert(alertEl, 'error', err.message);
  }
}
