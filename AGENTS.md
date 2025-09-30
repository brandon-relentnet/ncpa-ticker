# Repository Guidelines

## Project Structure & Module Organization
The Vite workspace centers on `src/`, where `main.jsx` mounts the app and `App.jsx` handles the ticker fetch. Create `src/components/` for new screens and shared widgets, and keep feature-specific hooks or helpers beside their consumers. Global styles live in `src/App.css`; reusable images or icons belong in `src/assets/`. Static files in `public/` ship as-is, and `vite.config.js` plus `eslint.config.js` store build and lint settings—extend them instead of overwriting.

## Build, Test, and Development Commands
Run `npm install` once. `npm run dev` starts the Vite server with HMR; `npm run build` outputs an optimized bundle in `dist/`; `npm run preview` serves that bundle for validation. Execute `npm run lint` before each commit to enforce the shared ESLint rules.

## Coding Style & Naming Conventions
Use modern React with functional components, hooks, and early returns for loading or error states. Keep two-space indentation, include semicolons, and prefer `const`. Name components in `PascalCase`, hooks in `camelCase` prefixed with `use`, and asset files in `kebab-case` (for example, `score-panel.svg`). Tailwind ships via the Vite plugin—favor utility classes for layout tweaks while keeping legacy styles in `App.css` contained.

## Testing Guidelines
Automated tests are not configured yet; plan on `vitest` with `@testing-library/react` and place specs beside implementation files using the `*.test.jsx` pattern. Mock the pickleball API so runs stay deterministic. Cover loading, data rendering, and error fallbacks, and add coverage gates in CI once a suite exists.

## Commit & Pull Request Guidelines
Write commit subjects in imperative mood with a clear scope, such as `Add polling interval guard`, and keep diffs focused. Pull requests should summarize the problem, explain the fix, list manual verification (`npm run dev`, `npm run build`, etc.), and attach UI screenshots or clips when visuals change. Link related issues or tickets for traceability.

## Configuration & Secrets
Move API keys and tournament identifiers into `.env.local` using the `VITE_` prefix (for example, `VITE_MATCH_ID=5092`) so Vite can expose them securely. Track required variables in `.env.example`, avoid committing real secrets, and consume values through `import.meta.env`.
