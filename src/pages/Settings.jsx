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

        <aside className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
