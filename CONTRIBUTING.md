# Contributing to SparkGarden

First off, thanks for taking the time to contribute! 🎉

SparkGarden is a community-driven project, and we value your help in making it the best AI-powered idea incubator.

## 🤝 How Can I Contribute?

### 1. Reporting Bugs
- **Check existing issues** to see if the bug has already been reported.
- **Open a new issue** if it hasn't. Be sure to include:
  - A clear title and description.
  - Steps to reproduce the issue.
  - Your environment (OS, Browser, Node version).
  - Screenshots or console logs if applicable.

### 2. Suggesting Enhancements
- We love new ideas! Open an issue with the **enhancement** label.
- Describe the feature you'd like to see and why it would be useful.
- If you have UI/UX ideas, mockups are highly appreciated.

### 3. Pull Requests
- **Fork the repository** and create your branch from `main`.
- **Clone your fork** locally.
- **Install dependencies**: `npm install`
- **Create a branch**: `git checkout -b feature/AmazingFeature`
- **Make your changes**.
- **Test your changes** locally to ensure nothing is broken.
- **Commit your changes**: `git commit -m 'Add some AmazingFeature'`
- **Push to the branch**: `git push origin feature/AmazingFeature`
- **Open a Pull Request** targeting the `main` branch of the original repository.

## 💻 Development Guidelines

### Code Style
- We use **TypeScript** for type safety. Please ensure no `any` types are used unless absolutely necessary.
- We use **Tailwind CSS** for styling. Avoid inline styles or separate CSS files unless for global overrides.
- **Components**: Keep components small and focused. Use the `components/` directory.
- **Services**: Business logic and API calls should reside in `services/`.

### AI Agents
- If you are modifying or adding AI agents, please check `services/geminiService.ts`.
- Ensure prompts are clear, concise, and use the existing "Persona" pattern (e.g., "You are a Product Manager...").
- Test your prompts with various inputs to ensure robustness.

### Database
- We use **IndexedDB** via the `idb` library.
- Schema changes should be handled carefully in `services/db.ts`. Currently, we use a simple key-value store for ideas.

## 🎨 Design System
- **Colors**: We use a specific palette defined in `App.tsx` (`CARD_COLORS`) and standard Tailwind colors.
- **Fonts**:
  - Headings: `Instrument Serif`
  - Body: `Inter`
  - Notes: `Patrick Hand`
- **Icons**: Use `lucide-react` for all icons.

## 📜 License
By contributing, you agree that your contributions will be licensed under its MIT License.
