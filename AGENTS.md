# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with `main.jsx` mounting the app and `App.jsx` orchestrating ticker data. Place screens and reusable widgets in `src/components/`, and keep feature-specific hooks or helpers beside their consumers. Store shared styles in `src/App.css`, while Tailwind utility classes handle layout touches. Drop reusable media in `src/assets/` and ship static files through `public/`. Add future tests next to implementations using the `*.test.jsx` suffix. Adjust build and lint behavior via `vite.config.js` and `eslint.config.js`; extend these files rather than replacing them.

## Build, Test, and Development Commands
Use `npm install` once to sync dependencies. Run `npm run dev` for the Vite HMR server during feature work. Validate production output with `npm run build`, then smoke-check it via `npm run preview`. Enforce lint rules before commits with `npm run lint`.

## Coding Style & Naming Conventions
Favor modern functional React with hooks and early returns for loading or error states. Keep two-space indentation, include semicolons, and default to `const` unless reassignment is required. Name components in PascalCase, hooks as `useName`, and assets with kebab-case filenames (e.g., `score-panel.svg`).

## Testing Guidelines
Planned automation uses Vitest with `@testing-library/react`. Co-locate specs beside components as `Component.test.jsx`, mock the pickleball API for determinism, and cover loading, success, and error branches. Add coverage thresholds once the suite lands to guard regressions.

## Commit & Pull Request Guidelines
Write commit subjects in imperative mood, such as `Add polling interval guard`, and keep each change focused. PRs should describe the issue, summarize the fix, list manual verification steps (`npm run dev`, `npm run build`, etc.), and attach relevant UI screenshots or clips. Link issues or tickets for traceability.

## Security & Configuration Tips
Store API keys and tournament identifiers in `.env.local` using `VITE_` prefixes (e.g., `VITE_MATCH_ID=5092`). Mirror required entries in `.env.example`, never commit real secrets, and read values through `import.meta.env` within the app.
