import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { IMAGE_LIMIT_PER_IDEA_PER_MONTH, checkMonthlyIdeaQuota } from '../quota.js';
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

router.get('/profile', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;

    const userResult = await query(
      'SELECT id, name, email, job_role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    const ideaQuota = await checkMonthlyIdeaQuota(userId);

    const [
      monthRangeResult,
      imageUsageByIdeaResult,
      usageSummaryResult,
      usageActionsResult,
    ] = await Promise.all([
      query(
        `SELECT
          date_trunc('month', NOW()) AS month_start,
          date_trunc('month', NOW()) + interval '1 month' AS month_end`
      ),
      query(
        `SELECT
          i.id AS idea_id,
          i.title AS idea_title,
          COUNT(img.id)::int AS used
        FROM ideas i
        LEFT JOIN images img
          ON img.idea_id = i.id
          AND img.created_at >= date_trunc('month', NOW())
          AND img.created_at < date_trunc('month', NOW()) + interval '1 month'
        WHERE i.user_id = $1
        GROUP BY i.id, i.title, i.updated_at
        ORDER BY used DESC, i.updated_at DESC`,
        [userId]
      ),
      query(
        `SELECT
          COUNT(*)::int AS events_count,
          COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
          COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
          COALESCE(SUM(estimated_cost_usd), 0)::numeric AS estimated_cost_usd
        FROM ai_usage_events
        WHERE user_id = $1
          AND created_at >= date_trunc('month', NOW())
          AND created_at < date_trunc('month', NOW()) + interval '1 month'`,
        [userId]
      ),
      query(
        `SELECT action, status, COUNT(*)::int AS count
        FROM ai_usage_events
        WHERE user_id = $1
          AND created_at >= date_trunc('month', NOW())
          AND created_at < date_trunc('month', NOW()) + interval '1 month'
        GROUP BY action, status
        ORDER BY action ASC, status ASC`,
        [userId]
      ),
    ]);

    const monthStart = monthRangeResult.rows[0]?.month_start;
    const monthEnd = monthRangeResult.rows[0]?.month_end;
    const imageUsageByIdea = imageUsageByIdeaResult.rows.map((row: any) => ({
      idea_id: row.idea_id,
      idea_title: row.idea_title,
      used: row.used,
      limit: IMAGE_LIMIT_PER_IDEA_PER_MONTH,
      remaining: Math.max(0, IMAGE_LIMIT_PER_IDEA_PER_MONTH - row.used),
    }));
    const imagesGeneratedThisMonth = imageUsageByIdea.reduce((sum: number, row: any) => sum + row.used, 0);
    const usageSummary = usageSummaryResult.rows[0] || {
      events_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
    };

    return res.json({
      user,
      period: {
        month_start: monthStart,
        month_end: monthEnd,
      },
      quota: {
        ideas: {
          used: ideaQuota.used,
          limit: ideaQuota.limit,
          remaining: ideaQuota.remaining,
          is_bypass: ideaQuota.isBypass,
        },
        images_per_idea: {
          limit: IMAGE_LIMIT_PER_IDEA_PER_MONTH,
          usage_by_idea: imageUsageByIdea,
        },
        images_generated_this_month: imagesGeneratedThisMonth,
      },
      usage: {
        events_count: usageSummary.events_count || 0,
        input_tokens: usageSummary.input_tokens || 0,
        output_tokens: usageSummary.output_tokens || 0,
        estimated_cost_usd: Number(usageSummary.estimated_cost_usd || 0),
        actions: usageActionsResult.rows,
      },
      settings: {
        text_model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
        image_model: 'gemini-3-pro-image-preview',
        tier: 'free',
        high_res_enabled: false,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
