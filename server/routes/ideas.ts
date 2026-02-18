import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { getRequestId } from '../logger.js';
import { checkMonthlyIdeaQuota, recordUsageEvent } from '../quota.js';
import { requireAuth } from './auth.js';

const router = Router();

router.use(requireAuth);

async function getIdeaWithRelations(ideaId: number, userId: number) {
  const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
  if (ideaResult.rows.length === 0) return null;

  const idea = ideaResult.rows[0];

  const [notes, analysis, images, groundingSources, chatMessages] = await Promise.all([
    query('SELECT * FROM user_notes WHERE idea_id = $1 ORDER BY created_at ASC', [ideaId]),
    query('SELECT * FROM analysis WHERE idea_id = $1', [ideaId]),
    query('SELECT * FROM images WHERE idea_id = $1 ORDER BY created_at DESC', [ideaId]),
    query('SELECT * FROM grounding_sources WHERE idea_id = $1 ORDER BY created_at ASC', [ideaId]),
    query('SELECT * FROM chat_messages WHERE idea_id = $1 ORDER BY created_at ASC', [ideaId]),
  ]);

  return {
    ...idea,
    notes: notes.rows,
    analysis: analysis.rows[0] || { executive_summary: '', market_research: '', prd: '', uiux: '', one_shot_prompt: '' },
    images: images.rows,
    grounding_sources: groundingSources.rows,
    chat_messages: chatMessages.rows,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideasResult = await query('SELECT * FROM ideas WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);

    const ideas = await Promise.all(
      ideasResult.rows.map(async (idea) => {
        const [notes, analysis, images, groundingSources] = await Promise.all([
          query('SELECT * FROM user_notes WHERE idea_id = $1 ORDER BY created_at ASC', [idea.id]),
          query('SELECT * FROM analysis WHERE idea_id = $1', [idea.id]),
          query('SELECT * FROM images WHERE idea_id = $1 ORDER BY created_at DESC', [idea.id]),
          query('SELECT * FROM grounding_sources WHERE idea_id = $1 ORDER BY created_at ASC', [idea.id]),
        ]);

        return {
          ...idea,
          notes: notes.rows,
          analysis: analysis.rows[0] || { executive_summary: '', market_research: '', prd: '', uiux: '', one_shot_prompt: '' },
          images: images.rows,
          grounding_sources: groundingSources.rows,
        };
      })
    );

    return res.json({ ideas });
  } catch (error) {
    console.error('List ideas error:', error);
    return res.status(500).json({ error: 'Failed to list ideas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const idea = await getIdeaWithRelations(ideaId, userId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    return res.json({ idea });
  } catch (error) {
    console.error('Get idea error:', error);
    return res.status(500).json({ error: 'Failed to get idea' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
  try {
    const userId = req.session.userId!;
    const { title, initial_prompt, color, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const quota = await checkMonthlyIdeaQuota(userId);
    if (!quota.allowed) {
      await recordUsageEvent({
        userId,
        action: 'idea.create',
        status: 'blocked',
        requestId,
        quotaBypass: quota.isBypass,
        details: {
          reason: 'monthly_idea_limit_reached',
          used: quota.used,
          limit: quota.limit,
          scope: quota.scope,
          email: quota.email,
        },
      });

      return res.status(429).json({
        error: `Monthly idea limit reached (${quota.limit}).`,
        request_id: requestId,
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          scope: quota.scope,
        },
      });
    }

    const result = await query(
      'INSERT INTO ideas (user_id, title, initial_prompt, color, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title.trim(), initial_prompt || '', color || '#FFD6E0', tags || ['Idea']]
    );

    const idea = result.rows[0];

    if (initial_prompt && initial_prompt.trim()) {
      await query('INSERT INTO user_notes (idea_id, text) VALUES ($1, $2)', [idea.id, initial_prompt.trim()]);
    }

    await query(
      'INSERT INTO analysis (idea_id) VALUES ($1)',
      [idea.id]
    );

    const fullIdea = await getIdeaWithRelations(idea.id, userId);
    await recordUsageEvent({
      userId,
      ideaId: idea.id,
      action: 'idea.create',
      status: 'success',
      requestId,
      quotaBypass: quota.isBypass,
      details: {
        usedAfterCreate: quota.used + 1,
        limit: quota.limit,
        scope: quota.scope,
        email: quota.email,
      },
    });
    return res.status(201).json({ idea: fullIdea });
  } catch (error) {
    console.error('Create idea error:', error);
    return res.status(500).json({ error: 'Failed to create idea' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const existing = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { title, status, tags, color } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(tags);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }

    updates.push(`updated_at = NOW()`);
    values.push(ideaId);
    values.push(userId);

    const result = await query(
      `UPDATE ideas SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
      values
    );

    const fullIdea = await getIdeaWithRelations(result.rows[0].id, userId);
    return res.json({ idea: fullIdea });
  } catch (error) {
    console.error('Update idea error:', error);
    return res.status(500).json({ error: 'Failed to update idea' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const result = await query('DELETE FROM ideas WHERE id = $1 AND user_id = $2 RETURNING id', [ideaId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    return res.json({ message: 'Idea deleted' });
  } catch (error) {
    console.error('Delete idea error:', error);
    return res.status(500).json({ error: 'Failed to delete idea' });
  }
});

router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const existing = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const result = await query('INSERT INTO user_notes (idea_id, text) VALUES ($1, $2) RETURNING *', [ideaId, text.trim()]);
    await query('UPDATE ideas SET updated_at = NOW() WHERE id = $1', [ideaId]);

    return res.status(201).json({ note: result.rows[0] });
  } catch (error) {
    console.error('Add note error:', error);
    return res.status(500).json({ error: 'Failed to add note' });
  }
});

router.put('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const existing = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { executive_summary, market_research, prd, uiux, one_shot_prompt } = req.body;

    const result = await query(
      `INSERT INTO analysis (idea_id, executive_summary, market_research, prd, uiux, one_shot_prompt, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (idea_id) DO UPDATE SET
         executive_summary = COALESCE($2, analysis.executive_summary),
         market_research = COALESCE($3, analysis.market_research),
         prd = COALESCE($4, analysis.prd),
         uiux = COALESCE($5, analysis.uiux),
         one_shot_prompt = COALESCE($6, analysis.one_shot_prompt),
         updated_at = NOW()
       RETURNING *`,
      [ideaId, executive_summary || '', market_research || '', prd || '', uiux || '', one_shot_prompt || '']
    );

    return res.json({ analysis: result.rows[0] });
  } catch (error) {
    console.error('Update analysis error:', error);
    return res.status(500).json({ error: 'Failed to update analysis' });
  }
});

router.get('/:id/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const existing = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const result = await query('SELECT * FROM chat_messages WHERE idea_id = $1 ORDER BY created_at ASC', [ideaId]);
    return res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get chat error:', error);
    return res.status(500).json({ error: 'Failed to get chat history' });
  }
});

router.post('/:id/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const existing = await query('SELECT id FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { role, text, is_thinking } = req.body;
    if (!role || !text) {
      return res.status(400).json({ error: 'Role and text are required' });
    }

    const result = await query(
      'INSERT INTO chat_messages (idea_id, role, text, is_thinking) VALUES ($1, $2, $3, $4) RETURNING *',
      [ideaId, role, text, is_thinking || false]
    );

    return res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Add chat message error:', error);
    return res.status(500).json({ error: 'Failed to add chat message' });
  }
});

export default router;
