import { randomUUID } from 'crypto';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function emit(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };

  const line = JSON.stringify(payload);
  if (level === 'ERROR') {
    console.error(line);
    return;
  }
  if (level === 'WARN') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event: string, data: Record<string, unknown> = {}) {
  emit('INFO', event, data);
}

export function logWarn(event: string, data: Record<string, unknown> = {}) {
  emit('WARN', event, data);
}

export function logError(event: string, data: Record<string, unknown> = {}) {
  emit('ERROR', event, data);
}

export function createRequestId() {
  return randomUUID();
}

export function getRequestId(
  req: { header: (name: string) => string | undefined },
  res?: { locals?: Record<string, unknown> }
) {
  const fromLocals = res?.locals?.requestId;
  if (typeof fromLocals === 'string' && fromLocals) {
    return fromLocals;
  }

  const fromHeader = req.header('x-request-id');
  if (fromHeader) {
    return fromHeader;
  }

  return 'unknown';
}

export function summarizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (typeof value === 'string') {
      summary[key] = { type: 'string', length: value.length };
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      summary[key] = value;
    } else if (Array.isArray(value)) {
      summary[key] = { type: 'array', length: value.length };
    } else if (typeof value === 'object') {
      summary[key] = {
        type: 'object',
        keys: Object.keys(value as Record<string, unknown>).slice(0, 10),
      };
    } else {
      summary[key] = { type: typeof value };
    }
  }

  return summary;
}

export function summarizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const e = error as Error & { code?: unknown; status?: unknown; details?: unknown };
    return {
      name: e.name,
      message: e.message,
      code: e.code ?? null,
      status: e.status ?? null,
      details: e.details ?? null,
      stack: e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : null,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const anyError = error as Record<string, unknown>;
    return {
      message: String(anyError.message || 'Unknown error object'),
      code: anyError.code ?? null,
      status: anyError.status ?? null,
    };
  }

  return { message: String(error) };
}

export function summarizeGeminiResponse(response: any): Record<string, unknown> {
  const candidates = response?.candidates || [];
  const parts = candidates?.[0]?.content?.parts || response?.parts || [];
  const partTypes = (parts as any[]).slice(0, 20).map((part) => {
    if (part.inlineData) {
      return `inlineData:${part.inlineData.mimeType || 'unknown'}`;
    }
    if (part.text) {
      return 'text';
    }
    if (part.functionCall) {
      return 'functionCall';
    }
    return 'other';
  });

  return {
    candidateCount: Array.isArray(candidates) ? candidates.length : 0,
    finishReasons: Array.isArray(candidates)
      ? candidates.map((candidate: any) => candidate?.finishReason || null)
      : [],
    blockReason: response?.promptFeedback?.blockReason || null,
    partTypes,
  };
}
