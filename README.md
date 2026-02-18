# SparkGarden ⚡🌱

**Don't let your ideas die in a notebook.**

SparkGarden is an intelligent, local-first workspace that **researches, plans, and visualizes** your ideas while you sleep. It turns a single sentence into a full Product Requirements Document (PRD), Market Analysis, and Execution Plan using recursive AI agents.

![SparkGarden Banner](https://placehold.co/1200x400/1a1a1a/FFF?text=SparkGarden+v1.0&font=playfair)

## 🌟 Why SparkGarden?

Most ideas fail because the "Next Step" is too hard. You write "Uber for Dog Walkers" in a note, and it sits there for 3 years.

SparkGarden removes the friction. You plant the seed (a raw note), and our **Autonomous Agent Swarm** gets to work:

1.  **🕵️‍♂️ Market Scout**: Searches the live web for competitors, trends, and recent funding news.
2.  **🏗️ Tech Architect**: Analyzes feasibility, recommends a tech stack, and identifies engineering risks.
3.  **💎 Product Owner**: Drafts a complete PRD, User Stories, and "Magic Moment" definitions.
4.  **🎨 Design Lead**: Defines the aesthetic, color palette, and generates UI concept art.
5.  **💻 Lead Engineer**: Writes the **"One-Shot Prompt"**—a massive, context-aware prompt you can paste into tools like Cursor or Bolt to build the app instantly.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, Tailwind CSS (via Vite)
*   **AI Intelligence**: [Google Gemini API](https://ai.google.dev/) (via `@google/genai` SDK)
    *   **Reasoning**: `gemini-3-flash-preview` with **Thinking Config** enabled.
    *   **Visuals**: `gemini-3-pro-image-preview` for high-fidelity UI concepts.
    *   **Grounding**: `googleSearch` and `googleMaps` tools for real-time validity.
*   **Database**: IndexedDB (Client-side only via `idb`). **Zero backend.**
*   **Icons**: Lucide React.
*   **Fonts**: Instrument Serif (Display), Inter (UI), Patrick Hand (Notes).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js v18+ (LTS recommended)
*   npm or yarn
*   A [Google Gemini API Key](https://aistudio.google.com/) (Free tier available).

### 💻 Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/sparkgarden.git
    cd sparkgarden
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory. You can copy `.env.local` if it exists, or start fresh:
    ```env
    # Get your key at aistudio.google.com
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    > **Note:** The app uses `vite.config.ts` to map `GEMINI_API_KEY` to `process.env.API_KEY` for the client.

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

### ☁️ Cloud Development (Replit, Gitpod, Codespaces)

SparkGarden is designed to run easily in cloud environments.

1.  **Import the repo** into your cloud IDE.
2.  **Set Environment Variables**:
    *   Find the "Secrets" or "Environment Variables" settings in your IDE.
    *   Add `GEMINI_API_KEY` with your API key.
3.  **Install & Run**:
    *   In the shell, run `npm install`.
    *   Run `npm run dev`.
    *   **Replit specific**: Ensure your `.replit` file is configured to run `npm run dev` and expose port 3000.

---

## 📂 Project Structure

```
/
├── components/          # React UI Components
│   ├── ChatWidget.tsx   # AI Chat Interface
│   ├── IdeaCard.tsx     # Dashboard Card Component
│   ├── LandingPage.tsx  # Hero/Landing View
│   └── ...
├── services/            # Core Logic & API Layers
│   ├── db.ts            # IndexedDB Wrapper (Local Database)
│   └── geminiService.ts # AI Agent Orchestrator & Gemini API Client
├── types.ts             # TypeScript Definitions
├── App.tsx              # Main Application Controller
├── main.tsx             # Entry Point
└── vite.config.ts       # Vite Configuration
```

## 🧠 Architecture: The Recursive Loop

The core logic lies in `services/geminiService.ts`. Unlike standard chat bots, SparkGarden uses a **Dual-Track Research** pattern:

1.  **Parallel Execution**: It launches two distinct agents simultaneously—one for Market Research (Business) and one for Technical Feasibility (Engineering).
2.  **Context Fusion**: The results are merged into a "Master Context."
3.  **Blueprint Generation**: Four specialized agents (PRD, Design, Exec Summary, Prompt Engineer) run against this Master Context to generate the final artifacts.

This ensures your "One-Shot Coding Prompt" isn't just generic code—it's code informed by actual market competitors and technical constraints.

---

## 🔒 Privacy & Local-First

SparkGarden follows a **Local-First** philosophy:
*   **No Backend**: We do not run a server. All logic happens in your browser.
*   **IndexedDB**: Your notes, ideas, and generated blueprints are stored in your browser's IndexedDB.
*   **Direct API Calls**: Your API key is used directly from the client to Google's servers. Your ideas are not sent to any intermediate party.

---

## 🤝 Contributing

We love contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, report bugs, or suggest features.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ and too much caffeine by Cheick Diakite*
