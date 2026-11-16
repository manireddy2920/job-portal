let deleteJobId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('employer')) return;

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
      if (tab === 'my-jobs') loadMyJobs();
      if (tab === 'applicants') populateJobSelect();
    });
  });

  // Handle hash
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const link = document.querySelector(`.dash-nav-link[data-tab="${hash}"]`);
    if (link) link.click();
  }

  await Promise.all([loadStats(), loadMyJobs(), loadProfile()]);

  // Job form
  document.getElementById('jobForm').addEventListener('submit', submitJob);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('jobStatusFilter').addEventListener('change', loadMyJobs);

  // Applicants job select
  document.getElementById('applicantsJobSelect').addEventListener('change', loadApplicants);

  // Profile form
  document.getElementById('employerProfileForm').addEventListener('submit', saveProfile);

  // Confirm delete modal
  document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
    deleteJobId = null;
  });
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!deleteJobId) return;
    try {
      await apiFetch(`/jobs/${deleteJobId}`, { method: 'DELETE' });
      document.getElementById('confirmModal').classList.add('hidden');
      deleteJobId = null;
      await Promise.all([loadStats(), loadMyJobs(), populateJobSelect()]);
    } catch (err) { alert(err.message); }
  });
});

/* ── Stats ──────────────────────────────────────────────── */
async function loadStats() {
  try {
    const { stats } = await apiFetch('/profiles/employer/stats');
    document.getElementById('statTotalJobs').textContent  = stats.total_jobs;
    document.getElementById('statOpenJobs').textContent   = stats.open_jobs;
    document.getElementById('statTotalApps').textContent  = stats.total_applications;
    document.getElementById('statPendingApps').textContent = stats.pending_applications;
  } catch {}
}

/* ── My Jobs ────────────────────────────────────────────── */
async function loadMyJobs() {
  const list = document.getElementById('myJobsList');
  const recent = document.getElementById('recentJobs');
  const status = document.getElementById('jobStatusFilter').value;

  list.innerHTML = '<div class="loading-spinner"></div>';
  if (recent) recent.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const qs = status ? `?status=${status}` : '';
    const { jobs } = await apiFetch(`/jobs/employer/my-jobs${qs}`);
    const html = jobs.length
      ? jobs.map(jobDashCard).join('')
      : `<div class="empty-state"><div class="icon">📋</div><h3>No listings yet</h3>
         <p><a href="#post-job" class="dash-nav-link" data-tab="post-job">Post your first job</a></p></div>`;

    list.innerHTML = html;
    if (recent) recent.innerHTML = jobs.slice(0, 3).map(jobDashCard).join('') || '<p>No jobs yet.</p>';
    attachJobActions(list);
    if (recent) attachJobActions(recent);
  } catch {
    list.innerHTML = '<p>Could not load jobs.</p>';
  }
}

function jobDashCard(job) {
  return `
    <div class="job-dash-card" data-id="${job.id}">
      <div class="job-dash-card-body">
        <h4>${escHtml(job.title)}</h4>
        <div class="job-dash-card-meta">
          ${statusBadge(job.status)}
          ${jobTypeBadge(job.job_type)}
          <span class="badge badge-gray">📍 ${escHtml(job.location)}</span>
        </div>
        <span class="app-count">👥 ${job.application_count || 0} application${job.application_count !== 1 ? 's' : ''}</span>
        ${job.deadline ? `<span class="app-count" style="margin-left:.5rem"> · Deadline: ${formatDate(job.deadline)}</span>` : ''}
      </div>
      <div class="job-dash-actions">
        ${job.status === 'open'
          ? `<button class="btn btn-outline btn-sm fill-btn" data-id="${job.id}">Mark Filled</button>`
          : `<button class="btn btn-outline btn-sm reopen-btn" data-id="${job.id}">Reopen</button>`
        }
        <button class="btn btn-outline btn-sm edit-btn" data-id="${job.id}">Edit</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${job.id}">Delete</button>
      </div>
    </div>`;
}

function attachJobActions(container) {
  // Edit
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => loadJobForEdit(btn.dataset.id));
  });
  // Delete
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteJobId = btn.dataset.id;
      document.getElementById('confirmModal').classList.remove('hidden');
    });
  });
  // Mark filled / reopen
  container.querySelectorAll('.fill-btn').forEach(btn => {
    btn.addEventListener('click', () => updateJobStatus(btn.dataset.id, 'filled'));
  });
  container.querySelectorAll('.reopen-btn').forEach(btn => {
    btn.addEventListener('click', () => updateJobStatus(btn.dataset.id, 'open'));
  });
}

async function updateJobStatus(id, status) {
  try {
    await apiFetch(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await Promise.all([loadStats(), loadMyJobs()]);
  } catch (err) { alert(err.message); }
}

/* ── Post / Edit job ────────────────────────────────────── */
async function submitJob(e) {
  e.preventDefault();
  const alertEl = document.getElementById('jobFormAlert');
  alertEl.classList.add('hidden');

  const editId = document.getElementById('editJobId').value;
  const body = {
    title:       document.getElementById('jTitle').value.trim(),
    location:    document.getElementById('jLocation').value.trim(),
    job_type:    document.getElementById('jType').value,
    category:    document.getElementById('jCategory').value.trim(),
    salary_min:  document.getElementById('jSalaryMin').value,
    salary_max:  document.getElementById('jSalaryMax').value,
    deadline:    document.getElementById('jDeadline').value,
    description: document.getElementById('jDescription').value.trim(),
    requirements:document.getElementById('jRequirements').value.trim(),
  };

  const btn = document.getElementById('jobSubmitBtn');
  btn.disabled = true;
  btn.textContent = editId ? 'Saving…' : 'Posting…';

  try {
    if (editId) {
      await apiFetch(`/jobs/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
      showAlert(alertEl, 'success', 'Job updated successfully!');
      cancelEdit();
    } else {
      await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(body) });
      showAlert(alertEl, 'success', 'Job posted successfully!');
      e.target.reset();
    }
    await Promise.all([loadStats(), loadMyJobs(), populateJobSelect()]);
  } catch (err) {
    showAlert(alertEl, 'error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Save Changes' : 'Post Job';
  }
}

async function loadJobForEdit(id) {
  try {
    const { job } = await apiFetch(`/jobs/${id}`);
    document.getElementById('editJobId').value      = job.id;
    document.getElementById('jTitle').value         = job.title || '';
    document.getElementById('jLocation').value      = job.location || '';
    document.getElementById('jType').value          = job.job_type || '';
    document.getElementById('jCategory').value      = job.category || '';
    document.getElementById('jSalaryMin').value     = job.salary_min || '';
    document.getElementById('jSalaryMax').value     = job.salary_max || '';
    document.getElementById('jDeadline').value      = job.deadline ? job.deadline.split('T')[0] : '';
    document.getElementById('jDescription').value   = job.description || '';
    document.getElementById('jRequirements').value  = job.requirements || '';
    document.getElementById('jobFormTitle').textContent = 'Edit Job Listing';
    document.getElementById('jobSubmitBtn').textContent = 'Save Changes';
    document.getElementById('cancelEditBtn').style.display = '';

    // Switch to post-job tab
    document.querySelector('.dash-nav-link[data-tab="post-job"]').click();
    window.scrollTo({ top: 0 });
  } catch (err) { alert(err.message); }
}

function cancelEdit() {
  document.getElementById('editJobId').value = '';
  document.getElementById('jobForm').reset();
  document.getElementById('jobFormTitle').textContent = 'Post a New Job';
  document.getElementById('jobSubmitBtn').textContent = 'Post Job';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('jobFormAlert').classList.add('hidden');
}

/* ── Applicants ─────────────────────────────────────────── */
async function populateJobSelect() {
  try {
    const { jobs } = await apiFetch('/jobs/employer/my-jobs');
    const sel = document.getElementById('applicantsJobSelect');
    sel.innerHTML = '<option value="">— choose a job —</option>' +
      jobs.map(j => `<option value="${j.id}">${escHtml(j.title)} (${j.status})</option>`).join('');
  } catch {}
}

async function loadApplicants() {
  const jobId = document.getElementById('applicantsJobSelect').value;
  const list  = document.getElementById('applicantsList');
  if (!jobId) { list.innerHTML = ''; return; }

  list.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const { applicants } = await apiFetch(`/applications/job/${jobId}`);
    if (!applicants.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">👥</div><h3>No applicants yet</h3></div>`;
      return;
    }
    list.innerHTML = applicants.map(a => `
      <div class="applicant-card">
        <div class="avatar">${escHtml(companyInitials(a.seeker_name))}</div>
        <div class="applicant-info">
          <h4>${escHtml(a.seeker_name)}</h4>
          <div class="email">${escHtml(a.seeker_email)}</div>
          ${a.headline ? `<div class="applicant-skills">${escHtml(a.headline)}</div>` : ''}
          ${a.skills   ? `<div class="applicant-skills">Skills: ${escHtml(a.skills)}</div>` : ''}
          ${a.seeker_location ? `<div class="applicant-skills">📍 ${escHtml(a.seeker_location)}</div>` : ''}
          ${a.linkedin ? `<div class="applicant-skills"><a href="${escHtml(a.linkedin)}" target="_blank">LinkedIn ↗</a></div>` : ''}
          ${a.cover_letter
            ? `<div class="applicant-cover">"${escHtml(a.cover_letter.slice(0, 200))}${a.cover_letter.length > 200 ? '…' : ''}"</div>`
            : ''}
        </div>
        <div class="applicant-actions">
          ${statusBadge(a.status)}
          <small>${timeAgo(a.applied_at)}</small>
          <select class="status-sel" data-appid="${a.id}">
            ${['pending','reviewed','shortlisted','rejected','hired'].map(s =>
              `<option value="${s}"${a.status === s ? ' selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
      </div>`
    ).join('');

    // Status change dropdowns
    list.querySelectorAll('.status-sel').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await apiFetch(`/applications/${sel.dataset.appid}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: sel.value }),
          });
          loadStats();
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

/* ── Employer Profile ───────────────────────────────────── */
async function loadProfile() {
  try {
    const { profile } = await apiFetch('/profiles/employer/me');
    document.getElementById('pName').value        = profile.name || '';
    document.getElementById('pCompany').value     = profile.company_name || '';
    document.getElementById('pIndustry').value    = profile.industry || '';
    document.getElementById('pSize').value        = profile.company_size || '';
    document.getElementById('pPhone').value       = profile.phone || '';
    document.getElementById('pLocation').value    = profile.location || '';
    document.getElementById('pDescription').value = profile.description || '';
    document.getElementById('pWebsite').value     = profile.website || '';
  } catch {}
}

async function saveProfile(e) {
  e.preventDefault();
  const alertEl = document.getElementById('profileAlert');
  alertEl.classList.add('hidden');
  try {
    await apiFetch('/profiles/employer', {
      method: 'PUT',
      body: JSON.stringify({
        name:         document.getElementById('pName').value.trim(),
        company_name: document.getElementById('pCompany').value.trim(),
        industry:     document.getElementById('pIndustry').value.trim(),
        company_size: document.getElementById('pSize').value,
        phone:        document.getElementById('pPhone').value.trim(),
        location:     document.getElementById('pLocation').value.trim(),
        description:  document.getElementById('pDescription').value.trim(),
        website:      document.getElementById('pWebsite').value.trim(),
      }),
    });
    showAlert(alertEl, 'success', 'Company profile saved!');
    const user = getUser();
    const newName = document.getElementById('pName').value.trim();
    if (newName) { user.name = newName; localStorage.setItem('user', JSON.stringify(user)); }
  } catch (err) {
    showAlert(alertEl, 'error', err.message);
  }
}
