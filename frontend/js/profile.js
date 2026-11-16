document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getUser();
  const page = document.getElementById('profilePage');

  try {
    let profile, openJobs = [];
    if (user.role === 'seeker') {
      ({ profile } = await apiFetch('/profiles/seeker/me'));
    } else {
      ({ profile, openJobs } = await apiFetch(`/profiles/employer/${user.id}`));
    }
    renderProfile(user, profile, openJobs, page);
  } catch (err) {
    page.innerHTML = `<p class="empty-state">Could not load profile: ${escHtml(err.message)}</p>`;
  }
});

function renderProfile(user, profile, openJobs, container) {
  const isSeeker = user.role === 'seeker';
  const initials = companyInitials(profile.name || user.name);

  const sidebar = isSeeker ? seekerSidebar(profile, initials) : employerSidebar(profile, initials);
  const main    = isSeeker ? seekerMain(profile) : employerMain(profile, openJobs);

  container.innerHTML = `
    <div class="profile-sidebar">${sidebar}</div>
    <div class="profile-main">${main}</div>
  `;
}

function seekerSidebar(p, initials) {
  return `
    <div class="profile-avatar-lg">${initials}</div>
    <h2>${escHtml(p.name || '–')}</h2>
    <div class="profile-role">Job Seeker</div>
    ${p.headline ? `<div class="profile-headline">${escHtml(p.headline)}</div>` : ''}
    <div class="profile-info-list">
      ${p.email    ? `<div class="profile-info-item">✉️ <a href="mailto:${escHtml(p.email)}">${escHtml(p.email)}</a></div>` : ''}
      ${p.phone    ? `<div class="profile-info-item">📞 ${escHtml(p.phone)}</div>` : ''}
      ${p.location ? `<div class="profile-info-item">📍 ${escHtml(p.location)}</div>` : ''}
      ${p.website  ? `<div class="profile-info-item">🌐 <a href="${escHtml(p.website)}" target="_blank">Portfolio</a></div>` : ''}
      ${p.linkedin ? `<div class="profile-info-item">💼 <a href="${escHtml(p.linkedin)}" target="_blank">LinkedIn</a></div>` : ''}
    </div>
    <div style="margin-top:1.5rem">
      <a href="/pages/seeker-dashboard.html#profile" class="btn btn-outline btn-full btn-sm">Edit Profile</a>
    </div>`;
}

function employerSidebar(p, initials) {
  return `
    <div class="profile-avatar-lg" style="border-radius:var(--radius)">${initials}</div>
    <h2>${escHtml(p.company_name || p.name || '–')}</h2>
    <div class="profile-role">Employer</div>
    ${p.industry ? `<div class="profile-headline">${escHtml(p.industry)}</div>` : ''}
    <div class="profile-info-list">
      ${p.email    ? `<div class="profile-info-item">✉️ <a href="mailto:${escHtml(p.email)}">${escHtml(p.email)}</a></div>` : ''}
      ${p.phone    ? `<div class="profile-info-item">📞 ${escHtml(p.phone)}</div>` : ''}
      ${p.location ? `<div class="profile-info-item">📍 ${escHtml(p.location)}</div>` : ''}
      ${p.company_size ? `<div class="profile-info-item">👥 ${escHtml(p.company_size)} employees</div>` : ''}
      ${p.website  ? `<div class="profile-info-item">🌐 <a href="${escHtml(p.website)}" target="_blank">Website</a></div>` : ''}
    </div>
    <div style="margin-top:1.5rem">
      <a href="/pages/employer-dashboard.html#profile" class="btn btn-outline btn-full btn-sm">Edit Profile</a>
    </div>`;
}

function seekerMain(p) {
  const sections = [];

  if (p.bio) {
    sections.push(`
      <div class="profile-section">
        <h3>About Me</h3>
        <p style="font-size:.95rem;white-space:pre-wrap">${escHtml(p.bio)}</p>
      </div>`);
  }

  if (p.skills) {
    const tags = p.skills.split(',').map(s => s.trim()).filter(Boolean);
    sections.push(`
      <div class="profile-section">
        <h3>Skills</h3>
        <div class="skills-cloud">
          ${tags.map(t => `<span class="skill-tag">${escHtml(t)}</span>`).join('')}
        </div>
      </div>`);
  }

  if (p.experience) {
    sections.push(`
      <div class="profile-section">
        <h3>Experience</h3>
        <div class="exp-entry">${escHtml(p.experience)}</div>
      </div>`);
  }

  if (p.education) {
    sections.push(`
      <div class="profile-section">
        <h3>Education</h3>
        <div class="edu-entry">${escHtml(p.education)}</div>
      </div>`);
  }

  if (!sections.length) {
    return `<div class="empty-state" style="padding:3rem">
      <div class="icon">👤</div>
      <h3>Profile is incomplete</h3>
      <p>Add your skills and experience to stand out.</p>
      <a href="/pages/seeker-dashboard.html#profile" class="btn btn-primary" style="margin-top:1rem">Complete Profile</a>
    </div>`;
  }
  return sections.join('');
}

function employerMain(p, openJobs) {
  const sections = [];

  if (p.description) {
    sections.push(`
      <div class="profile-section">
        <h3>About the Company</h3>
        <p style="font-size:.95rem;white-space:pre-wrap">${escHtml(p.description)}</p>
      </div>`);
  }

  if (openJobs?.length) {
    sections.push(`
      <div class="profile-section">
        <h3>Open Positions</h3>
        ${openJobs.map(j => `
          <a href="/pages/job-detail.html?id=${j.id}" style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit">
            <span style="font-weight:600">${escHtml(j.title)}</span>
            <span style="display:flex;gap:.4rem;align-items:center">
              ${jobTypeBadge(j.job_type)}
              <span style="font-size:.8rem;color:var(--text-muted)">${escHtml(j.location)}</span>
            </span>
          </a>`).join('')}
        <div style="margin-top:1rem">
          <a href="/pages/jobs.html" class="btn btn-outline btn-sm">View All Jobs</a>
        </div>
      </div>`);
  }

  if (!sections.length) {
    return `<div class="empty-state" style="padding:3rem">
      <div class="icon">🏢</div>
      <h3>Company profile is incomplete</h3>
      <a href="/pages/employer-dashboard.html#profile" class="btn btn-primary" style="margin-top:1rem">Complete Profile</a>
    </div>`;
  }
  return sections.join('');
}
