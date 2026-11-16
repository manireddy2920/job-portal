let currentPage = 1;
let currentParams = {};

document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill from URL
  const qp = getQueryParams();
  if (qp.keyword)  document.getElementById('searchKeyword').value = qp.keyword;
  if (qp.location) document.getElementById('searchLocation').value = qp.location;
  if (qp.job_type) {
    const cb = document.querySelector(`input[name=job_type][value="${qp.job_type}"]`);
    if (cb) cb.checked = true;
  }

  loadJobs(buildParams());

  // Search button
  document.getElementById('searchBtn').addEventListener('click', () => {
    currentPage = 1;
    loadJobs(buildParams());
  });

  // Enter key on search inputs
  ['searchKeyword', 'searchLocation'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') { currentPage = 1; loadJobs(buildParams()); }
    });
  });

  // Apply filters button
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    currentPage = 1;
    loadJobs(buildParams());
    // On mobile, close sidebar
    document.getElementById('filtersSidebar').classList.remove('open');
  });

  // Clear filters
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('searchLocation').value = '';
    document.querySelectorAll('input[name=job_type]').forEach(cb => cb.checked = false);
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterSalaryMin').value = '';
    currentPage = 1;
    loadJobs({});
  });

  // Mobile filters toggle
  document.getElementById('filtersToggleBtn').addEventListener('click', () => {
    document.getElementById('filtersSidebar').classList.toggle('open');
  });
});

function buildParams() {
  const params = {};
  const kw = document.getElementById('searchKeyword').value.trim();
  const loc = document.getElementById('searchLocation').value.trim();
  const types = [...document.querySelectorAll('input[name=job_type]:checked')].map(cb => cb.value);
  const cat = document.getElementById('filterCategory').value.trim();
  const sal = document.getElementById('filterSalaryMin').value;

  if (kw)  params.keyword  = kw;
  if (loc) params.location = loc;
  if (types.length === 1) params.job_type = types[0]; // API supports one type at a time
  if (cat) params.category = cat;
  if (sal) params.salary_min = sal;
  params.page  = currentPage;
  params.limit = 10;

  currentParams = params;
  return params;
}

async function loadJobs(params) {
  const list = document.getElementById('jobsList');
  list.innerHTML = '<div class="loading-spinner"></div>';
  document.getElementById('resultsCount').textContent = 'Loading…';
  document.getElementById('pagination').innerHTML = '';

  try {
    const qs = new URLSearchParams(params).toString();
    const data = await apiFetch(`/jobs?${qs}`);
    renderJobs(data.jobs);
    renderPagination(data.pagination);
    const total = data.pagination?.total ?? 0;
    document.getElementById('resultsCount').textContent =
      `${total} job${total !== 1 ? 's' : ''} found`;
  } catch {
    list.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Could not load jobs</h3><p>Please try again.</p></div>';
  }
}

function renderJobs(jobs) {
  const list = document.getElementById('jobsList');
  if (!jobs?.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="icon">🔍</div>
      <h3>No jobs found</h3>
      <p>Try different keywords or remove filters.</p>
    </div>`;
    return;
  }

  list.innerHTML = jobs.map(job => {
    const salary = formatSalary(job.salary_min, job.salary_max);
    return `
    <a href="/pages/job-detail.html?id=${job.id}" class="job-list-card">
      <div class="company-logo">${escHtml(companyInitials(job.company_name))}</div>
      <div class="job-list-card-body">
        <h3>${escHtml(job.title)}</h3>
        <div class="company-row">${escHtml(job.company_name || 'Company')}</div>
        <div class="job-meta-tags">
          ${jobTypeBadge(job.job_type)}
          <span class="badge badge-gray">${escHtml(job.location)}</span>
          ${job.category ? `<span class="badge badge-gray">${escHtml(job.category)}</span>` : ''}
        </div>
        <p class="job-desc-preview">${escHtml(job.description)}</p>
      </div>
      <div class="job-list-card-side">
        ${salary ? `<span class="salary">${salary}</span>` : ''}
        <span>${timeAgo(job.created_at)}</span>
        ${job.deadline ? `<span>Deadline: ${formatDate(job.deadline)}</span>` : ''}
      </div>
    </a>`;
  }).join('');
}

function renderPagination(pagination) {
  if (!pagination || pagination.pages <= 1) return;
  const { page, pages } = pagination;
  const container = document.getElementById('pagination');

  let html = '';
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="page-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += `<span style="padding:.4rem">…</span>`;
    }
  }
  container.innerHTML = html;

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      currentParams.page = currentPage;
      loadJobs(currentParams);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
