const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ── Seeker Profile ──────────────────────────────────────────────────────────

// GET /api/profiles/seeker/me
router.get('/seeker/me', authenticateToken, requireRole('seeker'), (req, res) => {
  try {
    const profile = get(
      `SELECT sp.*, u.name, u.email FROM job_seeker_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.user_id = ?`,
      [req.user.id]
    );
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile });
  } catch (err) {
    console.error('Get seeker profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profiles/seeker/:userId — public
router.get('/seeker/:userId', (req, res) => {
  try {
    const profile = get(
      `SELECT sp.headline, sp.bio, sp.location, sp.skills, sp.experience,
              sp.education, sp.website, sp.linkedin, u.name, u.email
       FROM job_seeker_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.user_id = ?`,
      [req.params.userId]
    );
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profiles/seeker
router.put('/seeker', authenticateToken, requireRole('seeker'), (req, res) => {
  const {
    headline, bio, phone, location, skills, experience,
    education, website, linkedin,
  } = req.body;

  try {
    // Also update name on users table if provided
    if (req.body.name) {
      run('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.user.id]);
    }

    run(
      `UPDATE job_seeker_profiles SET
        headline = COALESCE(?, headline),
        bio = COALESCE(?, bio),
        phone = COALESCE(?, phone),
        location = COALESCE(?, location),
        skills = COALESCE(?, skills),
        experience = COALESCE(?, experience),
        education = COALESCE(?, education),
        website = COALESCE(?, website),
        linkedin = COALESCE(?, linkedin),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        headline || null, bio || null, phone || null, location || null,
        skills || null, experience || null, education || null,
        website || null, linkedin || null,
        req.user.id,
      ]
    );

    const profile = get(
      `SELECT sp.*, u.name, u.email FROM job_seeker_profiles sp
       JOIN users u ON sp.user_id = u.id WHERE sp.user_id = ?`,
      [req.user.id]
    );
    res.json({ profile });
  } catch (err) {
    console.error('Update seeker profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── Employer Profile ────────────────────────────────────────────────────────

// GET /api/profiles/employer/me
router.get('/employer/me', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const profile = get(
      `SELECT ep.*, u.name, u.email FROM employer_profiles ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.user_id = ?`,
      [req.user.id]
    );
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile });
  } catch (err) {
    console.error('Get employer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profiles/employer/:userId — public
router.get('/employer/:userId', (req, res) => {
  try {
    const profile = get(
      `SELECT ep.company_name, ep.industry, ep.company_size, ep.description,
              ep.website, ep.location, ep.logo_url, u.name, u.email
       FROM employer_profiles ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.user_id = ?`,
      [req.params.userId]
    );
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const openJobs = all(
      `SELECT id, title, location, job_type, created_at FROM jobs
       WHERE employer_id = ? AND status = 'open'
       ORDER BY created_at DESC LIMIT 5`,
      [req.params.userId]
    );
    res.json({ profile, openJobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profiles/employer
router.put('/employer', authenticateToken, requireRole('employer'), (req, res) => {
  const {
    company_name, industry, company_size, description,
    website, phone, location,
  } = req.body;

  try {
    if (req.body.name) {
      run('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.user.id]);
    }

    run(
      `UPDATE employer_profiles SET
        company_name = COALESCE(?, company_name),
        industry = COALESCE(?, industry),
        company_size = COALESCE(?, company_size),
        description = COALESCE(?, description),
        website = COALESCE(?, website),
        phone = COALESCE(?, phone),
        location = COALESCE(?, location),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        company_name || null, industry || null, company_size || null,
        description || null, website || null, phone || null,
        location || null,
        req.user.id,
      ]
    );

    const profile = get(
      `SELECT ep.*, u.name, u.email FROM employer_profiles ep
       JOIN users u ON ep.user_id = u.id WHERE ep.user_id = ?`,
      [req.user.id]
    );
    res.json({ profile });
  } catch (err) {
    console.error('Update employer profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/profiles/employer/stats — employer dashboard stats
router.get('/employer/stats', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const totalJobs = get(
      'SELECT COUNT(*) as count FROM jobs WHERE employer_id = ?',
      [req.user.id]
    );
    const openJobs = get(
      "SELECT COUNT(*) as count FROM jobs WHERE employer_id = ? AND status = 'open'",
      [req.user.id]
    );
    const totalApps = get(
      `SELECT COUNT(*) as count FROM applications a
       JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?`,
      [req.user.id]
    );
    const pendingApps = get(
      `SELECT COUNT(*) as count FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.employer_id = ? AND a.status = 'pending'`,
      [req.user.id]
    );
    res.json({
      stats: {
        total_jobs: totalJobs.count,
        open_jobs: openJobs.count,
        total_applications: totalApps.count,
        pending_applications: pendingApps.count,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
