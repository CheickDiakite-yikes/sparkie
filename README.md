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

*   **Frontend**: React 19, Tailwind CSS
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
*   Node.js v18+
*   A [Google Gemini API Key](https://aistudio.google.com/) (Free tier available).

### Installation

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
    Create a `.env` file in the root directory:
    ```env
    # Get your key at aistudio.google.com
    API_KEY=your_gemini_api_key_here
    ```

4.  **Run Locally**
    ```bash
    npm start
    ```

---

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

We love contributions! Specifically, we are looking for:
*   **New Agent Personas**: Add a "Legal" agent or a "Marketing" agent.
*   **Export Tools**: Export to PDF, Notion, or GitHub Issues.
*   **UI Themes**: More "Dopamine" visual modes.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ and too much caffeine by Cheick Diakite*
