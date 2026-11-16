const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { run, get, lastInsertRowId } = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['seeker', 'employer']).withMessage('Role must be seeker or employer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    try {
      // Check duplicate
      const existing = get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      run(
        'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
        [email, password_hash, role, name]
      );
      const userId = lastInsertRowId();

      // Create empty profile record
      if (role === 'seeker') {
        run('INSERT INTO job_seeker_profiles (user_id) VALUES (?)', [userId]);
      } else {
        const companyName = req.body.company_name || name;
        run(
          'INSERT INTO employer_profiles (user_id, company_name) VALUES (?, ?)',
          [userId, companyName]
        );
      }

      const user = get('SELECT id, email, role, name, created_at FROM users WHERE id = ?', [userId]);
      const token = generateToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const { password_hash, ...safeUser } = user;
      const token = generateToken(safeUser);

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = get(
    'SELECT id, email, role, name, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticateToken,
  [
    body('current_password').notEmpty().withMessage('Current password required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    try {
      const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const new_hash = await bcrypt.hash(new_password, 12);
      run('UPDATE users SET password_hash = ? WHERE id = ?', [new_hash, req.user.id]);

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

module.exports = router;
