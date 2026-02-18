# SparkGarden - AI PRD & Idea Incubator

## Overview
SparkGarden is a full-stack React + Express application that helps users develop product ideas using AI. Users sign up, "plant" an idea seed, and AI agents automatically generate market research, product requirement documents (PRDs), UI/UX design specs, and one-shot coding prompts. All data is stored server-side in PostgreSQL with images in Replit object storage.

## Current State
- Full-stack app: Express backend + React frontend
- Express server on port 5000 with Vite middleware mode for development
- Custom authentication (name, email, password, job_role, referral_source)
- PostgreSQL database for all data persistence
- Replit object storage for generated images
- Gemini AI calls are server-side (API key not exposed to client)
- Tailwind CSS loaded via CDN

## Project Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS (CDN)
- **Backend**: Express.js with TypeScript (via tsx)
- **Bundler**: Vite 6 (middleware mode in dev, static build in prod)
- **AI**: Google Gemini (`@google/genai` SDK) - server-side only
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Session Store**: connect-pg-simple (PostgreSQL-backed sessions)
- **Image Storage**: Replit Object Storage (bucket: replit-objstore-0c0abee1-de7c-4636-8c9d-f498e95f453a)
- **Auth**: Custom bcrypt-based auth with express-session
- **Icons**: Lucide React
- **Markdown**: react-markdown

### File Structure
```
/
├── index.html              # Entry HTML with Tailwind CDN config + styles
├── index.tsx               # React entry point
├── App.tsx                 # Main app component (auth state, routing, API calls)
├── types.ts                # TypeScript type definitions (User, Idea, etc.)
├── vite.config.ts          # Vite config (allowedHosts for Replit)
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
├── components/
│   ├── AuthPage.tsx        # Signup/Login page with form validation
│   ├── LandingPage.tsx     # Marketing landing page
│   ├── IdeaCard.tsx        # Card component for idea grid
│   ├── IdeaDetailModal.tsx # Full detail view with tabs (notebook, blueprints, tools)
│   ├── ChatWidget.tsx      # Floating AI chat assistant
│   ├── ErrorBoundary.tsx   # Error boundary wrapper
│   └── SocialMediaCard.tsx # OG image preview generator
├── services/
│   ├── api.ts              # REST API client (auth, ideas, AI, images)
│   ├── geminiService.ts    # (Legacy - no longer imported, kept for reference)
│   └── db.ts               # (Legacy - no longer imported, kept for reference)
├── server/
│   ├── index.ts            # Express server entry point with Vite middleware
│   ├── db.ts               # PostgreSQL connection pool and query helper
│   ├── schema.sql          # Database schema (7 tables)
│   ├── types.ts            # Express session type augmentation
│   └── routes/
│       ├── auth.ts         # Auth routes: register, login, logout, me + requireAuth middleware
│       ├── ideas.ts        # Ideas CRUD with user isolation
│       ├── ai.ts           # Server-side Gemini AI (analysis, chat, image gen, places)
│       └── storage.ts      # Replit object storage upload/download (auth-protected)
```

### Database Schema
- **users**: id, name, email, password_hash, job_role, referral_source, created_at
- **ideas**: id, user_id, title, initial_prompt, status, tags, color, timestamps
- **user_notes**: id, idea_id, text, created_at
- **analysis**: id, idea_id, executive_summary, market_research, prd, uiux, one_shot_prompt
- **chat_messages**: id, idea_id, role, text, is_thinking, created_at
- **images**: id, idea_id, storage_key, url, prompt, aspect_ratio, style
- **grounding_sources**: id, idea_id, title, url, snippet

### Key Flows
1. **Landing → Auth → Dashboard**: User sees marketing page → signs up/logs in → enters dashboard
2. **Create Idea**: User enters title + notes → API creates idea → AI analysis runs async on server
3. **View Idea**: Click card → modal with Notebook, Blueprints (5 AI sections), Tools tabs
4. **Chat**: Floating chat widget with AI tool-calling to update blueprints (server-side)
5. **Image Gen**: Generate concept art or UI flow mockups via Gemini (server-side, stored in object storage)
6. **Logout**: Session destroyed, redirected to landing page

### API Routes
- `POST /api/auth/register` - Register with name, email, password, password_confirm, job_role, referral_source
- `POST /api/auth/login` - Login with email + password
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Check current session
- `GET /api/ideas` - List user's ideas
- `POST /api/ideas` - Create new idea
- `GET /api/ideas/:id` - Get idea with all relations
- `PUT /api/ideas/:id` - Update idea
- `DELETE /api/ideas/:id` - Delete idea
- `POST /api/ideas/:id/notes` - Add note to idea
- `PUT /api/ideas/:id/analysis` - Update analysis
- `GET /api/ideas/:id/chat` - Get chat history
- `POST /api/ideas/:id/chat` - Save chat message
- `POST /api/ideas/:id/analyze` - Trigger AI analysis (async)
- `POST /api/ideas/:id/ai-chat` - AI chat with tool calling
- `POST /api/ideas/:id/generate-image` - Generate image via Gemini
- `POST /api/ideas/:id/find-places` - Find relevant places via Gemini
- `POST /api/images/upload` - Upload image to object storage
- `GET /api/images/:key` - Download image from object storage

### Environment Variables
- `GEMINI_API_KEY` (secret) - Google Gemini API key (server-side only)
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit)
- `REPLIT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket ID

## User Preferences
- Custom authentication (NOT Replit Auth) with specific signup fields
- Store images in Replit object storage

## Recent Changes
- 2026-02-18: Transformed from client-side app to full-stack Express + React architecture
- 2026-02-18: Created PostgreSQL schema with 7 tables, proper indexes and constraints
- 2026-02-18: Implemented custom auth with bcrypt (12 rounds), express-session, connect-pg-simple
- 2026-02-18: Moved all Gemini AI calls to server-side for security
- 2026-02-18: Integrated Replit object storage for image uploads/downloads
- 2026-02-18: Built auth page (signup/login) with form validation
- 2026-02-18: Replaced IndexedDB with REST API calls throughout frontend
- 2026-02-18: Protected storage routes with authentication middleware
- 2026-02-18: Fixed Vite HMR with shared HTTP server in middleware mode
