import { query } from './db.js';
import { logWarn, summarizeError } from './logger.js';

const DEFAULT_BYPASS_EMAILS = ['zorovt18@gmail.com'];
const ADMIN_BYPASS_EMAILS = new Set(
  (process.env.ADMIN_BYPASS_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_BYPASS_EMAILS)
);

export const IDEA_LIMIT_PER_MONTH = Number(process.env.IDEA_LIMIT_PER_MONTH || 5);
export const IMAGE_LIMIT_PER_IDEA_PER_MONTH = Number(process.env.IMAGE_LIMIT_PER_IDEA_PER_MONTH || 3);

type QuotaScope = 'month';

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  scope: QuotaScope;
  isBypass: boolean;
  email: string;
}

export interface UsageEventInput {
  userId: number;
  ideaId?: number | null;
  action: string;
  status: 'allowed' | 'blocked' | 'success' | 'failure';
  requestId?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  imageCount?: number | null;
  estimatedCostUsd?: number | null;
  quotaBypass?: boolean;
  details?: Record<string, unknown>;
}

async function getUserEmail(userId: number): Promise<string> {
  const result = await query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId]);
  if (result.rows.length === 0) {
    throw new Error(`User ${userId} not found for quota checks`);
  }
  return String(result.rows[0].email || '').toLowerCase();
}

function isBypassEmail(email: string): boolean {
  return ADMIN_BYPASS_EMAILS.has(email.toLowerCase());
}

export async function checkMonthlyIdeaQuota(userId: number): Promise<QuotaCheckResult> {
  const email = await getUserEmail(userId);
  const isBypass = isBypassEmail(email);

  const countResult = await query(
    `SELECT COUNT(*)::int AS count
     FROM ideas
     WHERE user_id = $1
       AND created_at >= date_trunc('month', NOW())
       AND created_at < date_trunc('month', NOW()) + interval '1 month'`,
    [userId]
  );

  const used = countResult.rows[0]?.count || 0;
  const remaining = Math.max(0, IDEA_LIMIT_PER_MONTH - used);
  const allowed = isBypass || used < IDEA_LIMIT_PER_MONTH;

  return {
    allowed,
    used,
    limit: IDEA_LIMIT_PER_MONTH,
    remaining,
    scope: 'month',
    isBypass,
    email,
  };
}

export async function checkMonthlyImageQuotaForIdea(userId: number, ideaId: number): Promise<QuotaCheckResult> {
  const email = await getUserEmail(userId);
  const isBypass = isBypassEmail(email);

  const countResult = await query(
    `SELECT COUNT(*)::int AS count
     FROM images
     WHERE idea_id = $1
       AND created_at >= date_trunc('month', NOW())
       AND created_at < date_trunc('month', NOW()) + interval '1 month'`,
    [ideaId]
  );

  const used = countResult.rows[0]?.count || 0;
  const remaining = Math.max(0, IMAGE_LIMIT_PER_IDEA_PER_MONTH - used);
  const allowed = isBypass || used < IMAGE_LIMIT_PER_IDEA_PER_MONTH;

  return {
    allowed,
    used,
    limit: IMAGE_LIMIT_PER_IDEA_PER_MONTH,
    remaining,
    scope: 'month',
    isBypass,
    email,
  };
}

export async function recordUsageEvent(input: UsageEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_usage_events (
        user_id,
        idea_id,
        action,
        status,
        request_id,
        model,
        input_tokens,
        output_tokens,
        image_count,
        estimated_cost_usd,
        quota_bypass,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        input.userId,
        input.ideaId ?? null,
        input.action,
        input.status,
        input.requestId ?? null,
        input.model ?? null,
        input.inputTokens ?? null,
        input.outputTokens ?? null,
        input.imageCount ?? null,
        input.estimatedCostUsd ?? null,
        input.quotaBypass ?? false,
        JSON.stringify(input.details || {}),
      ]
    );
  } catch (error) {
    logWarn('usage.event.write_failed', {
      userId: input.userId,
      ideaId: input.ideaId ?? null,
      action: input.action,
      status: input.status,
      error: summarizeError(error),
    });
  }
}

