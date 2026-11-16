const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { run, get, all, lastInsertRowId } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/jobs — public search & filter
router.get('/', (req, res) => {
  try {
    const {
      keyword = '',
      location = '',
      job_type = '',
      category = '',
      salary_min = '',
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = ["j.status = 'open'"];
    let params = [];

    if (keyword) {
      whereClauses.push(
        "(j.title LIKE ? OR j.description LIKE ? OR j.requirements LIKE ? OR ep.company_name LIKE ?)"
      );
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (location) {
      whereClauses.push("j.location LIKE ?");
      params.push(`%${location}%`);
    }
    if (job_type) {
      whereClauses.push("j.job_type = ?");
      params.push(job_type);
    }
    if (category) {
      whereClauses.push("j.category LIKE ?");
      params.push(`%${category}%`);
    }
    if (salary_min) {
      whereClauses.push("(j.salary_min >= ? OR j.salary_max >= ?)");
      params.push(parseInt(salary_min), parseInt(salary_min));
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRow = get(
      `SELECT COUNT(*) as total FROM jobs j
       LEFT JOIN employer_profiles ep ON j.employer_id = ep.user_id
       ${whereSQL}`,
      params
    );
    const total = countRow ? countRow.total : 0;

    const jobs = all(
      `SELECT j.*, ep.company_name, ep.logo_url, ep.industry, u.name as employer_name
       FROM jobs j
       LEFT JOIN employer_profiles ep ON j.employer_id = ep.user_id
       LEFT JOIN users u ON j.employer_id = u.id
       ${whereSQL}
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      jobs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id — public single job
router.get('/:id', (req, res) => {
  try {
    const job = get(
      `SELECT j.*, ep.company_name, ep.logo_url, ep.industry, ep.description as company_description,
              ep.website as company_website, ep.location as company_location,
              u.name as employer_name
       FROM jobs j
       LEFT JOIN employer_profiles ep ON j.employer_id = ep.user_id
       LEFT JOIN users u ON j.employer_id = u.id
       WHERE j.id = ?`,
      [req.params.id]
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs — employer creates job
router.post(
  '/',
  authenticateToken,
  requireRole('employer'),
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('location').trim().notEmpty().withMessage('Location required'),
    body('job_type')
      .isIn(['full-time', 'part-time', 'contract', 'internship', 'remote'])
      .withMessage('Invalid job type'),
    body('deadline').optional().isISO8601().withMessage('Invalid deadline date'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      title, description, requirements, location,
      job_type, salary_min, salary_max, category, deadline,
    } = req.body;

    try {
      run(
        `INSERT INTO jobs (employer_id, title, description, requirements, location,
          job_type, salary_min, salary_max, category, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id, title, description, requirements || null,
          location, job_type,
          salary_min ? parseInt(salary_min) : null,
          salary_max ? parseInt(salary_max) : null,
          category || null,
          deadline || null,
        ]
      );
      const id = lastInsertRowId();
      const job = get('SELECT * FROM jobs WHERE id = ?', [id]);
      res.status(201).json({ job });
    } catch (err) {
      console.error('Create job error:', err);
      res.status(500).json({ error: 'Failed to create job' });
    }
  }
);

// PUT /api/jobs/:id — employer updates own job
router.put(
  '/:id',
  authenticateToken,
  requireRole('employer'),
  (req, res) => {
    try {
      const job = get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.employer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorised to edit this job' });
      }

      const {
        title, description, requirements, location,
        job_type, salary_min, salary_max, category, deadline, status,
      } = req.body;

      run(
        `UPDATE jobs SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          requirements = COALESCE(?, requirements),
          location = COALESCE(?, location),
          job_type = COALESCE(?, job_type),
          salary_min = COALESCE(?, salary_min),
          salary_max = COALESCE(?, salary_max),
          category = COALESCE(?, category),
          deadline = COALESCE(?, deadline),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title || null, description || null, requirements || null,
          location || null, job_type || null,
          salary_min ? parseInt(salary_min) : null,
          salary_max ? parseInt(salary_max) : null,
          category || null, deadline || null, status || null,
          req.params.id,
        ]
      );

      const updated = get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
      res.json({ job: updated });
    } catch (err) {
      console.error('Update job error:', err);
      res.status(500).json({ error: 'Failed to update job' });
    }
  }
);

// DELETE /api/jobs/:id — employer deletes own job
router.delete('/:id', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const job = get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.employer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised to delete this job' });
    }
    run('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// GET /api/jobs/employer/my-jobs — employer's own listings
router.get('/employer/my-jobs', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const { status = '' } = req.query;
    let sql = `SELECT j.*,
      (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count
      FROM jobs j WHERE j.employer_id = ?`;
    const params = [req.user.id];
    if (status) { sql += ' AND j.status = ?'; params.push(status); }
    sql += ' ORDER BY j.created_at DESC';
    const jobs = all(sql, params);
    res.json({ jobs });
  } catch (err) {
    console.error('My jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch your jobs' });
  }
});

module.exports = router;
