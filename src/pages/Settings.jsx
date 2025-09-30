import { memo, useMemo } from "react";
import { HslColorPicker } from "react-colorful";
import Scoreboard from "../components/Scoreboard";
import { contrastTextColor, hsl } from "../utils/colors";
import { deriveMatchState } from "../utils/matchState";

const ColorControl = memo(function ColorControl({
  label,
  color,
  onChange,
  className = "",
}) {
  const textColor = contrastTextColor(color);
  const swatchColor = hsl(color);

  return (
    <section className={`space-y-3 ${className}`}>
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          {label}
        </h3>
        <p className="text-[11px] text-slate-500">{swatchColor}</p>
      </header>
      <div className="flex overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <HslColorPicker color={color} onChange={onChange} />
      </div>
      <div
        className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs"
        style={{ backgroundColor: swatchColor, color: textColor }}
      >
        <span>Preview swatch</span>
        <span className="font-semibold">{textColor.toUpperCase()}</span>
      </div>
    </section>
  );
});
ColorControl.displayName = "ColorControl";

const TextColorControl = memo(function TextColorControl({
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
});
TextColorControl.displayName = "TextColorControl";

function LabeledToggle({ label, checked, onChange }) {
  return (
    <label className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
      <span className="font-medium text-slate-300">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function SettingsPage({
  matchInfo,
  matchIdInput,
  activeMatchId,
  onMatchIdInputChange,
  onApplyMatchId,
  onReloadMatch,
  onActiveGameIndexChange,
  matchLoading,
  matchError,
  onApplyTickerUpdate,
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
  // Cheap calculations inline; only memoize expensive work
  const autoHeaderColor = contrastTextColor(primaryColor);
  const autoBodyColor = contrastTextColor(secondaryColor);
  const resolvedTextColor = manualTextColorEnabled ? manualTextColor : null;

  // Keep this memo if deriveMatchState does meaningful work
  const matchState = useMemo(() => deriveMatchState(matchInfo), [matchInfo]);
  const { games, activeGameIndex, activeGameNumber, activeGameStatusLabel } =
    matchState;

  const tickerBg = hsl(tickerBackground);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 py-10 mb-200 text-slate-100">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-6 lg:flex-row">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white">Theme Controls</h2>
          <p className="mb-6 mt-1 text-xs text-slate-500">
            Colors apply to both preview and ticker output.
          </p>

          <div className="mb-6 grid gap-6 sm:grid-cols-2">
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
            <LabeledToggle
              label="Show inner border"
              checked={showBorder}
              onChange={setShowBorder}
            />

            <LabeledToggle
              label="Use full association name"
              checked={useFullAssociationName}
              onChange={setUseFullAssociationName}
            />

            <label className="flex w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <span className="font-medium text-slate-300">Match ID</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  value={matchIdInput}
                  onChange={(event) => onMatchIdInputChange(event.target.value)}
                  placeholder="Enter match ID"
                />
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={onApplyMatchId}
                  disabled={matchLoading}
                  aria-label="Load match by ID"
                >
                  Load
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                <span>Active: {activeMatchId || "—"}</span>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={onReloadMatch}
                  disabled={matchLoading || !activeMatchId}
                >
                  Refresh
                </button>
              </div>
              {matchLoading && (
                <p className="text-[11px] text-lime-300">Loading match…</p>
              )}
              {matchError && (
                <p className="text-[11px] text-red-400">{matchError}</p>
              )}
            </label>

            <button
              type="button"
              className="w-full rounded-full border border-lime-400 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-lime-300 transition hover:bg-lime-400/10 disabled:opacity-40"
              onClick={onApplyTickerUpdate}
              disabled={matchLoading || !matchInfo}
            >
              Apply Update To Ticker
            </button>

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
                <div className="w-16 text-center text-sm font-semibold text-slate-2 00">
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
        <div className="relative w-200">
          <h1 className="text-3xl font-semibold text-lime-400">
            Display Preview
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Adjust colors and see the scoreboard update instantly.
          </p>
          <div
            className="mt-8 rounded-3xl border border-slate-800 p-12 shadow-lg fixed"
            style={{ backgroundColor: tickerBg }}
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
      </div>
    </div>
  );
}
