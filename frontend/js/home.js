document.addEventListener('DOMContentLoaded', async () => {
  // Hero search
  document.getElementById('heroSearchForm').addEventListener('submit', e => {
    e.preventDefault();
    const kw  = document.getElementById('heroKeyword').value.trim();
    const loc = document.getElementById('heroLocation').value.trim();
    const params = new URLSearchParams();
    if (kw)  params.set('keyword',  kw);
    if (loc) params.set('location', loc);
    window.location.href = `/pages/jobs.html?${params}`;
  });

  // Load stats
  try {
    const data = await apiFetch('/jobs?limit=1');
    document.getElementById('statJobs').textContent = data.pagination?.total ?? '–';
  } catch {}

  // Load featured jobs (latest 6)
  const grid = document.getElementById('featuredJobs');
  try {
    const data = await apiFetch('/jobs?limit=6');
    if (!data.jobs?.length) {
      grid.innerHTML = '<p class="empty-state">No jobs posted yet. Check back soon!</p>';
      return;
    }
    grid.innerHTML = data.jobs.map(job => `
      <a href="/pages/job-detail.html?id=${job.id}" class="job-card">
        <div class="job-card-company">
          <div class="company-logo">${escHtml(companyInitials(job.company_name))}</div>
          <span>${escHtml(job.company_name || 'Company')}</span>
        </div>
        <h3>${escHtml(job.title)}</h3>
        <div class="job-card-meta">
          <span>${escHtml(job.location)}</span>
          <span>${job.job_type}</span>
          ${job.category ? `<span>${escHtml(job.category)}</span>` : ''}
        </div>
        <div class="job-card-footer">
          <span class="salary">${formatSalary(job.salary_min, job.salary_max) || 'Salary not listed'}</span>
          <span style="color:var(--text-muted);font-size:.8rem">${timeAgo(job.created_at)}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">Could not load jobs.</p>';
  }
});
