# Insparkie

Insparkie is a full-stack AI product planning workspace. It turns raw idea notes into structured outputs: market research, technical strategy, PRD, design direction, and executable build prompts. It also generates concept visuals and tracks AI usage/cost signals with monthly quota controls.

Live app: https://insparkie.replit.app

## What this app does

- Authenticated multi-user workspace (email/password sessions).
- Idea management with notes, tags, status, and color metadata.
- Asynchronous AI analysis pipeline that writes:
  - Executive summary
  - Market research
  - PRD
  - UI/UX concept guidance
  - One-shot implementation prompt
- AI chat per idea with blueprint update tool-calling.
- Concept image generation with Gemini image models.
- Image storage and retrieval through Replit Object Storage.
- Image deletion (DB row + object storage cleanup).
- Quotas and usage telemetry:
  - Monthly idea cap (default: 5)
  - Monthly image cap per idea (default: 3)
  - Per-event token + estimated-cost tracking
- Profile page with quota board, usage summaries, favorites, and runtime settings.

## Stack

- Frontend: React 19 + TypeScript + Vite
- Styling: Tailwind (CDN config in `index.html`)
- Backend: Express + TypeScript (run via `tsx`)
- Database: PostgreSQL
- Session store: `express-session` + `connect-pg-simple`
- Auth: bcrypt password hashing
- AI: `@google/genai` (Gemini API)
- Object storage: `@replit/object-storage`
- Icons: Lucide React

## AI model defaults

- Text model: `gemini-2.5-flash` (configurable via `GEMINI_TEXT_MODEL`)
- Image model: `gemini-3-pro-image-preview`

## Architecture overview

### Runtime

- `server/index.ts` starts Express on port `5000`.
- In development, Vite runs in middleware mode on the same server.
- In production mode, static files are served from `dist`.

### Core backend routes

- `server/routes/auth.ts`: register/login/logout/session/profile
- `server/routes/ideas.ts`: idea CRUD, notes, analysis updates, chat persistence
- `server/routes/ai.ts`: analysis pipeline, AI chat, image generation/deletion, place search
- `server/routes/storage.ts`: object-storage upload/download proxy

### Data persistence

Schema is initialized from `server/schema.sql` at startup via `initDB()`.

Main tables:

- `users`
- `ideas`
- `user_notes`
- `analysis`
- `chat_messages`
- `images`
- `grounding_sources`
- `ai_usage_events`

## AI flows

### 1) Idea analysis (`POST /api/ideas/:id/analyze`)

Process:

1. Marks idea status as `processing`.
2. Runs market + technical research prompts in parallel with Google Search grounding.
3. Runs PRD/UIUX/Executive/One-shot generation from fused context.
4. Persists outputs into `analysis` table.
5. Stores grounding sources.
6. Marks idea status as `ready`.
7. Logs token usage + estimated event metadata.

### 2) Idea AI chat (`POST /api/ideas/:id/ai-chat`)

- Uses the text model for iterative discussion.
- Supports tool-calling to update specific blueprint sections.
- Persists user/model messages to `chat_messages`.
- Logs usage event telemetry.

### 3) Image generation (`POST /api/ideas/:id/generate-image`)

- Validates per-idea monthly image quota before generation.
- Builds prompt from explicit user input or idea+analysis context fallback.
- Supports visual modes and image config:
  - Aspect ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`
  - Image sizes: `1K`, `2K`, `4K`
- Uploads generated image bytes to object storage.
- Stores `storage_key` + metadata in `images` table.
- Returns signed app URL form: `/api/images/{encoded-key}`.

### 4) Image deletion (`DELETE /api/ideas/:id/images/:imageId`)

- Verifies image ownership through idea ownership.
- Deletes object from storage (`ignoreNotFound: true`).
- Deletes `images` row.
- Returns deletion status including whether storage delete succeeded.

## Quotas, usage, and cost tracking

Quota + usage code lives in `server/quota.ts`.

Defaults:

- `IDEA_LIMIT_PER_MONTH=5`
- `IMAGE_LIMIT_PER_IDEA_PER_MONTH=3`
- `ADMIN_BYPASS_EMAILS=zorovt18@gmail.com`

Tracked telemetry table: `ai_usage_events`.

Captured fields include:

- `action` (`analysis.start`, `analysis.complete`, `chat.message`, `image.generate`, etc.)
- `status` (`allowed`, `blocked`, `success`, `failure`)
- `request_id`
- `model`
- `input_tokens` / `output_tokens`
- `image_count`
- `estimated_cost_usd`
- `quota_bypass`
- structured `details` JSON

Current image cost estimates in code:

- `1K`: `$0.134`
- `2K`: `$0.134`
- `4K`: `$0.24`

Note: these are internal estimate constants for telemetry, not billing truth.

## Observability and forensic debugging

Structured logging is implemented in `server/logger.ts` and used across API routes.

Implemented:

- Request-scoped `x-request-id` creation + propagation.
- API request start/end logging with duration.
- Structured error summaries (name/message/code/status/trimmed stack).
- Gemini response diagnostics summary (candidate counts, finish reasons, block reasons, part types).
- Global `unhandledRejection` + `uncaughtException` handlers.

When troubleshooting, start with:

- request ID from API response headers/body
- matching log lines for `http.request.start` / `http.request.end`
- event-specific logs (`image.generate.*`, `storage.*`, `analysis.*`)
- `ai_usage_events` rows for user/idea/time window

## SEO and AI-search discoverability

Public crawl/discovery assets live in `public/`:

- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`
- social/open-graph image (`og-image.png`)
- favicon/manifest assets

`index.html` includes:

- canonical URL
- Open Graph + Twitter metadata
- JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`)
- crawl-friendly `<noscript>` fallback copy

## Favicon and brand assets

On-brand favicon set is generated from `public/favicon.svg`:

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-192x192.png`
- `favicon-512x512.png`
- `apple-touch-icon.png`
- `site.webmanifest`

## Project structure

```text
.
├── App.tsx
├── index.html
├── index.tsx
├── components/
│   ├── AuthPage.tsx
│   ├── ChatWidget.tsx
│   ├── IdeaCard.tsx
│   ├── IdeaDetailModal.tsx
│   ├── LandingPage.tsx
│   ├── ProfilePage.tsx
│   └── ...
├── services/
│   └── api.ts
├── server/
│   ├── db.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── objectStorage.ts
│   ├── quota.ts
│   ├── schema.sql
│   └── routes/
│       ├── ai.ts
│       ├── auth.ts
│       ├── ideas.ts
│       └── storage.ts
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── llms.txt
│   ├── llms-full.txt
│   ├── favicon.svg
│   └── ...
└── types.ts
```

## Environment variables

Required in most environments:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (recommended) | Session signing secret |
| `GEMINI_API_KEY` | Yes | Gemini API access |

Optional:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | Text model for analysis/chat/search |
| `IDEA_LIMIT_PER_MONTH` | `5` | Monthly idea creation cap |
| `IMAGE_LIMIT_PER_IDEA_PER_MONTH` | `3` | Monthly image cap per idea |
| `ADMIN_BYPASS_EMAILS` | includes `zorovt18@gmail.com` | Comma-separated quota bypass emails |
| `REPLIT_OBJECT_STORAGE_BUCKET_ID` | none | Replit object-storage bucket ID |
| `OBJECT_STORAGE_BUCKET_ID` | none | Alternate bucket env |

See `.env.example` for a starter template.

## Local development

Prerequisites:

- Node.js 20+
- PostgreSQL 16+ (or managed Postgres)
- Gemini API key
- Replit object storage bucket (if image persistence is needed)

Setup:

```bash
npm install
cp .env.example .env
# add DATABASE_URL, SESSION_SECRET, GEMINI_API_KEY, and optional vars
npm run dev
```

App runs on `http://localhost:5000`.

## Build and run notes

- `npm run build` builds frontend assets into `dist/`.
- Current repo scripts are dev-centric for server runtime (`npm run dev`).
- If deploying outside Replit, ensure your process manager runs the Express server and that Postgres + object storage env vars are present.

## API surface summary

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/profile`

Ideas:

- `GET /api/ideas`
- `POST /api/ideas`
- `GET /api/ideas/:id`
- `PUT /api/ideas/:id`
- `DELETE /api/ideas/:id`
- `POST /api/ideas/:id/notes`
- `PUT /api/ideas/:id/analysis`
- `GET /api/ideas/:id/chat`
- `POST /api/ideas/:id/chat`

AI + images:

- `POST /api/ideas/:id/analyze`
- `POST /api/ideas/:id/ai-chat`
- `POST /api/ideas/:id/generate-image`
- `DELETE /api/ideas/:id/images/:imageId`
- `POST /api/ideas/:id/find-places`

Storage:

- `POST /api/images/upload`
- `GET /api/images/:key`

## Security model

- Gemini API key is used server-side only.
- Session-based auth with HTTP-only cookies.
- Idea/image access is scoped by authenticated `user_id`.
- Storage download/upload routes are auth-protected.

## Troubleshooting

### Images not rendering

Check, in order:

1. `REPLIT_OBJECT_STORAGE_BUCKET_ID` is set and valid.
2. `POST /api/ideas/:id/generate-image` returns `storage_key` + `url`.
3. `GET /api/images/:key` returns bytes (authenticated request required).
4. `images.storage_key` values exist and match stored objects.
5. Logs for `image.generate.*` and `storage.download.*` include expected request ID.

### Quota blocks unexpectedly

- Confirm the authenticated email.
- Check `ai_usage_events` for `status='blocked'` rows and reason payload.
- Validate env caps (`IDEA_LIMIT_PER_MONTH`, `IMAGE_LIMIT_PER_IDEA_PER_MONTH`).

### Analysis not completing

- Check logs for `analysis.complete` failure details.
- Verify Gemini API key/model availability.
- Confirm DB write access for `analysis` and `grounding_sources`.

## Contributing

See `CONTRIBUTING.md`.

## License

No license file is currently present in this repository. Add a `LICENSE` file before public redistribution if needed.
