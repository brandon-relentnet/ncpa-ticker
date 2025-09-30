import { HslColorPicker } from "react-colorful";
import Scoreboard from "../components/Scoreboard";
import { contrastTextColor, hsl } from "../utils/colors";

function ColorControl({ label, color, onChange, className = "" }) {
  const textColor = contrastTextColor(color);

  return (
    <section className={`space-y-3 ${className}`.trim()}>
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          {label}
        </h3>
        <p className="text-[11px] text-slate-500">{hsl(color)}</p>
      </header>
      <div className="flex overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <HslColorPicker color={color} onChange={onChange} />
      </div>
      <div
        className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs"
        style={{ backgroundColor: hsl(color), color: textColor }}
      >
        <span>Preview swatch</span>
        <span className="font-semibold">{textColor.toUpperCase()}</span>
      </div>
    </section>
  );
}

function TextColorControl({
  manualEnabled,
  manualColor,
  onToggleManual,
  onColorChange,
  autoHeaderColor,
  autoBodyColor,
}) {
  const autoHeader = autoHeaderColor.toUpperCase();
  const autoBody = autoBodyColor.toUpperCase();
  const manualSwatch = hsl(manualColor);
  const manualContrast = contrastTextColor(manualColor).toUpperCase();

  return (
    <section className="space-y-3">
      <header>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Text Color
          </h3>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-400">
            {manualEnabled ? "Manual" : "Auto"}
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-lime-400"
              checked={manualEnabled}
              onChange={(event) => onToggleManual(event.target.checked)}
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          header: {autoHeader} &middot; body: {autoBody}
        </p>
      </header>
      <div className="flex overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <HslColorPicker
          color={manualColor}
          onChange={(value) => {
            onColorChange(value);
            if (!manualEnabled) onToggleManual(true);
          }}
        />
      </div>
      <div
        className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs"
        style={{ backgroundColor: manualSwatch, color: manualContrast }}
      >
        <span>
          {manualEnabled ? "Manual color in use" : "Automatic contrast"}
        </span>
        <span className="font-semibold">{manualContrast}</span>
      </div>
    </section>
  );
}

export default function SettingsPage({
  matchInfo,
  onMatchIdChange,
  onActiveGameIndexChange,
  onLoadSampleMatch,
  sampleMatches,
  primaryColor,
  secondaryColor,
  setPrimaryColor,
  setSecondaryColor,
  tickerBackground,
  setTickerBackground,
  manualTextColor,
  manualTextColorEnabled,
  setManualTextColor,
  setManualTextColorEnabled,
  showBorder,
  setShowBorder,
  useFullAssociationName,
  setUseFullAssociationName,
}) {
  const autoHeaderColor = contrastTextColor(primaryColor);
  const autoBodyColor = contrastTextColor(secondaryColor);
  const resolvedTextColor = manualTextColorEnabled ? manualTextColor : null;
  const games = matchInfo.games ?? [];
  const latestIndex = Math.max(0, games.length - 1);
  const activeGameIndex =
    typeof matchInfo.activeGameIndex === "number"
      ? Math.min(Math.max(matchInfo.activeGameIndex, 0), latestIndex)
      : latestIndex;
  const activeGame = games[activeGameIndex];
  const activeGameNumber = activeGame?.number ?? activeGameIndex + 1;
  const activeGameStatus = activeGame?.status ?? "scheduled";
  const activeGameStatusLabel = activeGameStatus
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  const availableSampleMatches = sampleMatches ?? [];
  const sampleMatchIds = availableSampleMatches.map((item) => item.match_id);
  const sampleSelectValue = sampleMatchIds.includes(matchInfo.match_id)
    ? matchInfo.match_id
    : "custom";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 lg:flex-row">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-lime-400">
            Display Preview
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Adjust colors and see the scoreboard update instantly.
          </p>
          <div
            className="mt-8 rounded-3xl border border-slate-800 p-12 shadow-lg"
            style={{ backgroundColor: hsl(tickerBackground) }}
          >
            <Scoreboard
              matchInfo={matchInfo}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              showBorder={showBorder}
              manualTextColor={resolvedTextColor}
              useFullAssociationName={useFullAssociationName}
            />
          </div>
        </div>

        <aside className="w-full max-w-[456px] rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white">Theme Controls</h2>
          <p className="mb-6 mt-1 text-xs text-slate-500">
            Colors apply to both preview and ticker output.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <ColorControl
              label="Header & Footer"
              color={primaryColor}
              onChange={setPrimaryColor}
            />

            <ColorControl
              label="Body"
              color={secondaryColor}
              onChange={setSecondaryColor}
            />

            <TextColorControl
              manualEnabled={manualTextColorEnabled}
              manualColor={manualTextColor}
              onToggleManual={setManualTextColorEnabled}
              onColorChange={setManualTextColor}
              autoHeaderColor={autoHeaderColor}
              autoBodyColor={autoBodyColor}
            />

            <ColorControl
              label="Ticker Background"
              color={tickerBackground}
              onChange={setTickerBackground}
            />
          </div>
          <div className="space-y-3">
            <label className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <span className="font-medium text-slate-300">
                Show inner border
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={showBorder}
                onChange={(event) => setShowBorder(event.target.checked)}
              />
            </label>

            <label className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <span className="font-medium text-slate-300">
                Use full association name
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={useFullAssociationName}
                onChange={(event) =>
                  setUseFullAssociationName(event.target.checked)
                }
              />
            </label>

            <label className="flex w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <span className="font-medium text-slate-300">Match ID</span>
              <input
                type="text"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                value={matchInfo.match_id ?? ""}
                onChange={(event) => onMatchIdChange(event.target.value)}
              />
            </label>

            {availableSampleMatches.length > 0 && onLoadSampleMatch && (
              <label className="flex w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                <span className="font-medium text-slate-300">
                  Sample Matches
                </span>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  value={sampleSelectValue}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (value === "custom") return;
                    onLoadSampleMatch(value);
                  }}
                >
                  <option value="custom">Custom match</option>
                  {availableSampleMatches.map((item) => (
                    <option key={item.match_id} value={item.match_id}>
                      {item.match_id} · {item.tournament_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-slate-300">Active Game</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  {games.length} total &middot; {activeGameStatusLabel}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={() => onActiveGameIndexChange(activeGameIndex - 1)}
                  disabled={activeGameIndex <= 0}
                >
                  Prev
                </button>
                <div className="w-16 text-center text-sm font-semibold text-slate-200">
                  Game {activeGameNumber}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={() => onActiveGameIndexChange(activeGameIndex + 1)}
                  disabled={activeGameIndex >= games.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
