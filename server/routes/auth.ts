import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import '../types.js';

const router = Router();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, password_confirm, job_role, referral_source } = req.body;

    if (!name || !email || !password || !password_confirm) {
      return res.status(400).json({ error: 'Name, email, password, and password confirmation are required' });
    }

    if (password !== password_confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      'INSERT INTO users (name, email, password_hash, job_role, referral_source) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, job_role, created_at',
      [name, email.toLowerCase(), passwordHash, job_role || null, referral_source || null]
    );

    const user = result.rows[0];
    req.session.userId = user.id;

    return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, job_role: user.job_role, created_at: user.created_at } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT id, name, email, password_hash, job_role, created_at FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;

    return res.json({ user: { id: user.id, name: user.name, email: user.email, job_role: user.job_role, created_at: user.created_at } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out' });
  });
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query('SELECT id, name, email, job_role, created_at FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
