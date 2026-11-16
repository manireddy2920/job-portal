let currentJobId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const { id } = getQueryParams();
  if (!id) { window.location.href = '/pages/jobs.html'; return; }
  currentJobId = id;

  const page = document.getElementById('jobDetailPage');

  try {
    const { job } = await apiFetch(`/jobs/${id}`);
    renderJob(job, page);
  } catch {
    page.innerHTML = `<div class="empty-state" style="padding:4rem">
      <div class="icon">😕</div><h3>Job not found</h3>
      <a href="/pages/jobs.html" class="btn btn-primary" style="margin-top:1rem">Back to Jobs</a>
    </div>`;
  }

  // Apply modal events
  document.getElementById('closeApplyModal').addEventListener('click', closeModal);
  document.getElementById('cancelApply').addEventListener('click', closeModal);
  document.getElementById('applyModal').addEventListener('click', e => {
    if (e.target === document.getElementById('applyModal')) closeModal();
  });

  document.getElementById('applyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl  = document.getElementById('applyAlert');
    const btnText  = document.getElementById('applyBtnText');
    const spinner  = document.getElementById('applySpinner');
    const coverLetter = document.getElementById('coverLetter').value.trim();

    btnText.textContent = 'Submitting…';
    spinner.classList.remove('hidden');
    document.getElementById('submitApplyBtn').disabled = true;
    alertEl.classList.add('hidden');

    try {
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({ job_id: parseInt(currentJobId), cover_letter: coverLetter }),
      });
      showAlert(alertEl, 'success', '🎉 Application submitted successfully!');
      setTimeout(closeModal, 1800);
    } catch (err) {
      showAlert(alertEl, 'error', err.message);
    } finally {
      btnText.textContent = 'Submit Application';
      spinner.classList.add('hidden');
      document.getElementById('submitApplyBtn').disabled = false;
    }
  });
});

function renderJob(job, container) {
  const salary = formatSalary(job.salary_min, job.salary_max);
  const user = getUser();

  container.innerHTML = `
    <div class="jd-main">
      <div class="jd-header">
        <div class="jd-logo">${escHtml(companyInitials(job.company_name))}</div>
        <div class="jd-title-block">
          <h1>${escHtml(job.title)}</h1>
          <div class="jd-company">${escHtml(job.company_name || 'Company')}
            ${job.company_location ? ` · ${escHtml(job.company_location)}` : ''}</div>
          <div class="jd-tags">
            ${jobTypeBadge(job.job_type)}
            <span class="badge badge-gray">📍 ${escHtml(job.location)}</span>
            ${job.category ? `<span class="badge badge-gray">${escHtml(job.category)}</span>` : ''}
            ${statusBadge(job.status)}
          </div>
        </div>
      </div>

      <div class="jd-section">
        <h2>Job Description</h2>
        <div class="jd-body">${escHtml(job.description)}</div>
      </div>

      ${job.requirements ? `
      <div class="jd-section">
        <h2>Requirements</h2>
        <div class="jd-body">${escHtml(job.requirements)}</div>
      </div>` : ''}

      ${job.company_description ? `
      <div class="jd-section">
        <h2>About ${escHtml(job.company_name)}</h2>
        <div class="jd-body">${escHtml(job.company_description)}</div>
      </div>` : ''}
    </div>

    <div class="jd-sidebar">
      <div class="jd-apply-card">
        <h3>Job Summary</h3>
        <div class="jd-detail-row"><span>Location</span><span>${escHtml(job.location)}</span></div>
        <div class="jd-detail-row"><span>Job Type</span><span>${job.job_type}</span></div>
        ${salary ? `<div class="jd-detail-row"><span>Salary</span><span class="salary">${salary}</span></div>` : ''}
        ${job.deadline ? `<div class="jd-detail-row"><span>Deadline</span><span>${formatDate(job.deadline)}</span></div>` : ''}
        <div class="jd-detail-row"><span>Posted</span><span>${timeAgo(job.created_at)}</span></div>
        <div class="jd-detail-row"><span>Status</span><span>${statusBadge(job.status)}</span></div>

        <div class="jd-apply-btn-wrap" id="applyBtnWrap">
          ${renderApplyButton(user, job)}
        </div>
      </div>

      ${job.industry || job.company_website ? `
      <div class="jd-company-card">
        <h4>${escHtml(job.company_name)}</h4>
        ${job.industry ? `<p>Industry: ${escHtml(job.industry)}</p>` : ''}
        ${job.company_website ? `<p><a href="${escHtml(job.company_website)}" target="_blank">Visit website ↗</a></p>` : ''}
      </div>` : ''}
    </div>
  `;

  // Wire apply button
  const applyBtn = document.getElementById('openApplyModal');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      document.getElementById('applyJobTitle').textContent = job.title;
      document.getElementById('applyModal').classList.remove('hidden');
    });
  }
}

function renderApplyButton(user, job) {
  if (job.status !== 'open') {
    return `<button class="btn btn-outline btn-full" disabled>Position Filled</button>`;
  }
  if (!user) {
    return `<a href="/pages/login.html" class="btn btn-primary btn-full">Log In to Apply</a>`;
  }
  if (user.role === 'employer') {
    return `<p style="font-size:.85rem;color:var(--text-muted);text-align:center">Employers cannot apply to jobs.</p>`;
  }
  return `<button class="btn btn-primary btn-full" id="openApplyModal">Apply Now</button>`;
}

function closeModal() {
  document.getElementById('applyModal').classList.add('hidden');
  document.getElementById('applyAlert').classList.add('hidden');
  document.getElementById('coverLetter').value = '';
}
