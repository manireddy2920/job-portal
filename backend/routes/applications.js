const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { run, get, all, lastInsertRowId } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/applications — seeker applies to a job
router.post(
  '/',
  authenticateToken,
  requireRole('seeker'),
  [body('job_id').isInt({ min: 1 }).withMessage('Valid job_id required')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { job_id, cover_letter = '' } = req.body;

    try {
      const job = get("SELECT * FROM jobs WHERE id = ? AND status = 'open'", [job_id]);
      if (!job) return res.status(404).json({ error: 'Job not found or no longer open' });

      const existing = get(
        'SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?',
        [job_id, req.user.id]
      );
      if (existing) return res.status(409).json({ error: 'Already applied to this job' });

      run(
        'INSERT INTO applications (job_id, seeker_id, cover_letter) VALUES (?, ?, ?)',
        [job_id, req.user.id, cover_letter]
      );
      const id = lastInsertRowId();
      const application = get('SELECT * FROM applications WHERE id = ?', [id]);
      res.status(201).json({ application });
    } catch (err) {
      console.error('Apply error:', err);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }
);

// GET /api/applications/my — seeker views their applications
router.get('/my', authenticateToken, requireRole('seeker'), (req, res) => {
  try {
    const applications = all(
      `SELECT a.*, j.title as job_title, j.location, j.job_type, j.status as job_status,
              ep.company_name, ep.logo_url
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN employer_profiles ep ON j.employer_id = ep.user_id
       WHERE a.seeker_id = ?
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    res.json({ applications });
  } catch (err) {
    console.error('My applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/job/:jobId — employer views applicants for a job
router.get('/job/:jobId', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const job = get('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [
      req.params.jobId,
      req.user.id,
    ]);
    if (!job) return res.status(404).json({ error: 'Job not found or not yours' });

    const applicants = all(
      `SELECT a.*, u.name as seeker_name, u.email as seeker_email,
              sp.headline, sp.phone, sp.location as seeker_location,
              sp.skills, sp.resume_url, sp.linkedin
       FROM applications a
       JOIN users u ON a.seeker_id = u.id
       LEFT JOIN job_seeker_profiles sp ON a.seeker_id = sp.user_id
       WHERE a.job_id = ?
       ORDER BY a.applied_at DESC`,
      [req.params.jobId]
    );
    res.json({ applicants });
  } catch (err) {
    console.error('Job applicants error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// PUT /api/applications/:id/status — employer updates application status
router.put(
  '/:id/status',
  authenticateToken,
  requireRole('employer'),
  [
    body('status')
      .isIn(['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'])
      .withMessage('Invalid status'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const app = get(
        `SELECT a.*, j.employer_id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ?`,
        [req.params.id]
      );
      if (!app) return res.status(404).json({ error: 'Application not found' });
      if (app.employer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorised' });
      }

      run(
        'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.body.status, req.params.id]
      );
      const updated = get('SELECT * FROM applications WHERE id = ?', [req.params.id]);
      res.json({ application: updated });
    } catch (err) {
      console.error('Update application status error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

// DELETE /api/applications/:id — seeker withdraws an application
router.delete('/:id', authenticateToken, requireRole('seeker'), (req, res) => {
  try {
    const app = get(
      'SELECT * FROM applications WHERE id = ? AND seeker_id = ?',
      [req.params.id, req.user.id]
    );
    if (!app) return res.status(404).json({ error: 'Application not found' });
    run('DELETE FROM applications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    console.error('Withdraw application error:', err);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

module.exports = router;
