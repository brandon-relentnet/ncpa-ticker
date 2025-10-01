# Pickleball Ticker

Pickleball Ticker is a small React + Vite application for operators who need to style and broadcast a live pickleball scoreboard. The app pulls match details from the National College Pickleball Association (NCPA) API, lets you tune the color palette and overlay a custom logo, then mirrors the configured layout on a dedicated ticker route for capture cards or stream overlays.

## Highlights
- **Live theme controls** – Adjust header, badge, body, score column, and ticker background colors with HSL pickers while previewing accessible text contrast in real time.
- **NCPA match data** – Fetches game results, teams, and player rosters by match ID using the official API and summarizes the current series status.
- **Layout-ready ticker view** – `/ticker` renders the Scoreboard component full screen with the latest settings, ideal for OBS or browser sources.
- **Cross-tab sync** – Theme selections, match state, and ticker payload broadcast between browser tabs via `localStorage`, making it easy to keep the ticker window up to date.
- **Logo overlay tools** – Upload a badge, toggle transparency, hide the built-in NCPA text, and drag to reposition the image directly in the preview.

## Getting Started
### Prerequisites
- Node.js 18.0 or newer (Vite 7 requires modern Node versions)
- npm 9+

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env.local` file in the project root with your NCPA credentials:
```bash
VITE_NCPA_API_KEY=your-api-key
# Optional overrides
VITE_NCPA_API_BASE=https://tournaments.ncpaofficial.com/api
VITE_DEFAULT_MATCH_ID=5092
```
The API key is required for match lookups. The default match ID seeds the Settings view on first load.

Mirror required variables in `.env.example` if you plan to share setup expectations with collaborators; never commit real secrets.

### Run the app
```bash
npm run dev
```
The development server runs on <http://localhost:5173>. Navigate to `/settings` to control the display. Opening `/ticker` in a separate tab or browser source will reflect the latest synced configuration.

## Usage Notes
- **Loading matches** – Enter a numeric match ID and click **Load**. The app requests `get-games` and `get-match` endpoints concurrently and normalizes them via `src/utils/officialAdapter.js`.
- **Active game selector** – Use **Prev/Next** to select which game in the series the scoreboard highlights. The footer displays match rules and status such as `Game 2 of 3 / First to 11 (win by 2)`.
- **Text color handling** – Automatic contrast picks black/white for header, badge, body, and score cells. Enabling Manual mode lets you dial an HSL value that applies across the board.
- **Logo adjustments** – After uploading, drag the badge in the preview (Settings view only). Position, transparency, and text toggles are stored with the theme.
- **Badge background** – Tune the NCPA badge color independently to match your broadcast palette without affecting the header strip.
- **Apply Update To Ticker** – Broadcasts the latest match payload and theme settings to other tabs. Automatic syncing also happens whenever state changes, unless a tab is mid-update.

## Project Structure
```
src/
  App.jsx              # Top-level router, theme state, match loading, sync
  main.jsx             # React entry point
  components/
    Scoreboard.jsx     # Presentation for the ticker/preview
  pages/
    Settings.jsx       # Control panel UI and preview
    Ticker.jsx         # Full-screen scoreboard output
  utils/
    colors.js          # HSL helpers and contrast utilities
    logo.js            # Logo default + normalization helpers
    matchService.js    # Fetches match data from the NCPA API
    matchState.js      # Derives active game metadata for views
    officialAdapter.js # Normalizes official API payloads
```
Tailwind CSS utilities are available via `@import "tailwindcss";` in `src/App.css`. Static assets ship from `public/`, including the default NCPA mark.

## Development Workflow
Common npm scripts:
- `npm run dev` – Start the Vite development server with HMR.
- `npm run build` – Produce a production build in `dist/`.
- `npm run preview` – Preview the production bundle locally.
- `npm run lint` – Run ESLint with the project rules (`eslint.config.js`).

Before committing, run linting and, once tests exist, ensure the Vitest suite passes. Keep feature-specific utilities close to their consumers and co-locate future tests as `*.test.jsx` files.

## Data & Persistence Details
- **API endpoints** – Managed in `src/utils/matchService.js`; change `VITE_NCPA_API_BASE` to point at staging environments.
- **Theme persistence** – Saved to `localStorage` under `pickleball-ticker-theme` so color choices and logo settings survive reloads.
- **Cross-tab sync** – Broadcasts via `pickleball-ticker-sync`. When a message comes from another tab, the receiving tab temporarily suppresses responding to avoid loops.
- **Fallback content** – If a match has no active game, the scoreboard displays a neutral “No game data available” message.

## Troubleshooting
- **Missing API key** – The Settings view will surface “Failed to load match data” if `VITE_NCPA_API_KEY` is absent or incorrect; check network calls in DevTools for details.
- **Blocked remote calls** – When running offline or behind a firewall, mock `fetchMatchBundle` or inject local JSON to keep developing UI changes.
- **Layout capture** – For streaming setups, open `/ticker` in a new browser window, set the background color to match your scene, and use a window capture or browser source.

## Roadmap Ideas
- Add Vitest + Testing Library specs covering loading, success, and error states for `SettingsPage` and `Scoreboard`.
- Support manual entry overrides when the API is unavailable.
- Expose additional branding controls (fonts, gradients, or per-team colors).

## License
Copyright © 2024. See project owners for licensing details.
