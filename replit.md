# SparkGarden - AI PRD & Idea Incubator

## Overview
SparkGarden is a client-side React application that helps users develop product ideas using AI. Users "plant" an idea seed, and AI agents automatically generate market research, product requirement documents (PRDs), UI/UX design specs, and one-shot coding prompts.

## Current State
- Fully client-side React + TypeScript app
- Uses Vite as bundler, serves on port 5000
- Tailwind CSS loaded via CDN
- Gemini AI for analysis, chat, image generation, and location search
- IndexedDB (via `idb` library) for local data persistence
- No backend server

## Project Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS (CDN)
- **Bundler**: Vite 6
- **AI**: Google Gemini (`@google/genai` SDK) - requires `GEMINI_API_KEY` secret
- **Storage**: IndexedDB (browser-local, no server database)
- **Icons**: Lucide React
- **Markdown**: react-markdown

### File Structure
```
/
├── index.html          # Entry HTML with Tailwind CDN config + styles
├── index.tsx           # React entry point
├── App.tsx             # Main app component (routing, state management)
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite config (port 5000, allowedHosts)
├── tsconfig.json       # TypeScript config
├── package.json        # Dependencies
├── components/
│   ├── LandingPage.tsx     # Marketing landing page
│   ├── IdeaCard.tsx        # Card component for idea grid
│   ├── IdeaDetailModal.tsx # Full detail view with tabs (notebook, blueprints, tools)
│   ├── ChatWidget.tsx      # Floating AI chat assistant
│   ├── ErrorBoundary.tsx   # Error boundary wrapper
│   ├── DebugOverlay.tsx    # Debug diagnostics overlay
│   └── SocialMediaCard.tsx # OG image preview generator
├── services/
│   ├── geminiService.ts    # All Gemini AI API calls (analysis, chat, image gen, maps)
│   └── db.ts               # IndexedDB operations (CRUD for ideas)
```

### Key Flows
1. **Landing → Dashboard**: User clicks "Start Incubating Free" → enters dashboard
2. **Create Idea**: User enters title + notes → AI runs parallel analysis agents
3. **View Idea**: Click card → modal with Notebook, Blueprints (5 AI sections), Tools tabs
4. **Chat**: Floating chat widget with tool-calling to update blueprints
5. **Image Gen**: Generate concept art or UI flow mockups via Gemini

### Environment Variables
- `GEMINI_API_KEY` (secret) - Google Gemini API key, injected via Vite's `define` config

## User Preferences
- None recorded yet

## Recent Changes
- 2026-02-18: Fixed Vite server port to 5000, enabled allowedHosts for Replit environment
- 2026-02-18: Removed conflicting ESM import maps from index.html (Vite handles module resolution)
- 2026-02-18: Added marquee animation CSS
