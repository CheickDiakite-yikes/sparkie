import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import pool, { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import ideasRoutes from './routes/ideas.js';
import aiRoutes from './routes/ai.js';
import storageRoutes from './routes/storage.js';
import { createRequestId, logError, logInfo, summarizeBody, summarizeError } from './logger.js';
import './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const isDev = process.env.NODE_ENV !== 'production';

const PgSession = connectPgSimple(session);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.use(session({
  store: new PgSession({
    pool: pool,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'insparkie-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  }
}));

app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.header('x-request-id') || createRequestId();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const traceApiRequest = req.path.startsWith('/api/');
  if (traceApiRequest) {
    logInfo('http.request.start', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      userId: req.session?.userId || null,
      ip: req.ip,
      body: summarizeBody(req.body),
    });
  }

  res.on('finish', () => {
    if (!traceApiRequest) return;
    logInfo('http.request.end', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.session?.userId || null,
      contentLength: res.getHeader('content-length') || null,
    });
  });

  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/ideas', aiRoutes);
app.use('/api/images', storageRoutes);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = res.locals.requestId || req.header('x-request-id') || 'unknown';
  logError('http.request.unhandled_error', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.session?.userId || null,
    error: summarizeError(err),
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: 'Unhandled server error',
    request_id: requestId,
  });
});

async function start() {
  await initDB();
  logInfo('server.db.initialized', {});

  const httpServer = http.createServer(app);

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logInfo('server.started', {
      host: '0.0.0.0',
      port: PORT,
      environment: isDev ? 'development' : 'production',
    });
  });
}

start().catch((err) => {
  logError('server.start.failed', { error: summarizeError(err) });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError('process.unhandled_rejection', { error: summarizeError(reason) });
});

process.on('uncaughtException', (error) => {
  logError('process.uncaught_exception', { error: summarizeError(error) });
});
