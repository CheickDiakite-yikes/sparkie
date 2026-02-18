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
  secret: process.env.SESSION_SECRET || 'sparkgarden-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/ideas', aiRoutes);
app.use('/api/images', storageRoutes);

async function start() {
  await initDB();
  console.log('Database initialized');

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
    console.log(`Server running on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
