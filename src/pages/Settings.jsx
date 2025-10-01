import { HslColorPicker } from "react-colorful";
import Scoreboard from "../components/Scoreboard";
import Accordion, { AccordionItem } from "../components/Accordian";
import { contrastTextColor, hsl } from "../utils/colors";
import { deriveMatchState } from "../utils/matchState";
import { DEFAULT_LOGO_POSITION } from "../utils/logo";
import { NavLink } from "react-router-dom";

function ColorControl({ label, color, onChange, className = "" }) {
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
      <HslColorPicker color={color} onChange={onChange} />
      <div
        className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs"
        style={{ backgroundColor: swatchColor, color: textColor }}
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
}) {
  const description = "Auto B/W for contrast";
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
        <p className="text-[11px] text-slate-500">{description}</p>
      </header>
      <HslColorPicker
        color={manualColor}
        onChange={(value) => {
          onColorChange(value);
          if (!manualEnabled) onToggleManual(true);
        }}
      />
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

function LabeledToggle({ label, checked, onChange }) {
  return (
    <label className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
      <span className="font-medium text-slate-300">{label}</span>
      <input
        type="checkbox"
        className="checkbox"
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
  scoreBackground,
  badgeBackground,
  setPrimaryColor,
  setSecondaryColor,
  setScoreBackground,
  setBadgeBackground,
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
  logoImage,
  setLogoImage,
  logoTransparentBackground,
  setLogoTransparentBackground,
  logoTextHidden,
  setLogoTextHidden,
  logoPosition,
  setLogoPosition,
}) {
  const autoHeaderColor = contrastTextColor(primaryColor);
  const autoBodyColor = contrastTextColor(secondaryColor);
  const autoBadgeColor = contrastTextColor(badgeBackground);
  const autoScoreColor = contrastTextColor(scoreBackground);
  const resolvedTextColor = manualTextColorEnabled ? manualTextColor : null;
  const { games, activeGameIndex, activeGameNumber, activeGameStatusLabel } =
    deriveMatchState(matchInfo);

  const tickerBg = hsl(tickerBackground);
  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoImage(reader.result);
        setLogoPosition({ ...DEFAULT_LOGO_POSITION });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoPosition({ ...DEFAULT_LOGO_POSITION });
  };

  const handleResetLogoPosition = () => {
    setLogoPosition({ ...DEFAULT_LOGO_POSITION });
  };

  return (
    <div className="bg-slate-950 py-10 text-slate-100">
      <NavLink
        to="/ticker"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-semibold text-lime-400 fixed bottom-4 right-4 z-50"
      >
        New Ticker
      </NavLink>
      <div className="mx-auto flex max-w-[1600px] justify-center flex-col gap-8 px-6 lg:flex-row">
        <div className="w-114 space-y-6 rounded-3xl">
          <div className="mb-8 ml-2">
            <h1 className="text-3xl mb-2 font-semibold text-lime-400">
              Ticker Controls
            </h1>
            <p className="text-sm text-slate-400">
              Adjust settings and see the preview update instantly.
            </p>
          </div>

          <Accordion>
            <AccordionItem title="Design">
              <div className="grid gap-6 sm:grid-cols-2">
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

                <ColorControl
                  label="Badge Background"
                  color={badgeBackground}
                  onChange={setBadgeBackground}
                />

                <ColorControl
                  label="Score Column"
                  color={scoreBackground}
                  onChange={setScoreBackground}
                />

                <ColorControl
                  label="Ticker Background"
                  color={tickerBackground}
                  onChange={setTickerBackground}
                />

                <TextColorControl
                  manualEnabled={manualTextColorEnabled}
                  manualColor={manualTextColor}
                  onToggleManual={setManualTextColorEnabled}
                  onColorChange={setManualTextColor}
                  autoHeaderColor={autoHeaderColor}
                  autoBadgeColor={autoBadgeColor}
                  autoBodyColor={autoBodyColor}
                  autoScoreColor={autoScoreColor}
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
              </div>
            </AccordionItem>

            <AccordionItem title="Logo">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Upload an image to replace the NCPA badge. Drag it in the
                    preview to adjust placement.
                  </p>
                  {logoImage && (
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-wide text-red-300 hover:text-red-200"
                      onClick={handleRemoveLogo}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-300">
                  <span className="font-semibold uppercase tracking-wide">
                    Upload logo image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-lime-400/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-lime-300 hover:file:bg-lime-400/20"
                  />
                </label>

                {logoImage && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoImage}
                        alt="Custom logo preview"
                        className="h-12 w-12 rounded object-contain"
                      />
                      <div className="text-xs text-slate-400">
                        <div className="font-semibold text-slate-200">
                          Logo loaded
                        </div>
                        <div>Drag the image on the preview to reposition.</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-wide text-lime-300 hover:text-lime-200"
                      onClick={handleResetLogoPosition}
                    >
                      Reset position
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <LabeledToggle
                    label="Transparent badge background"
                    checked={logoTransparentBackground}
                    onChange={setLogoTransparentBackground}
                  />
                  <LabeledToggle
                    label="Hide NCPA text"
                    checked={logoTextHidden}
                    onChange={setLogoTextHidden}
                  />
                  {logoImage && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
                      <div className="font-semibold text-slate-200">
                        Position
                      </div>
                      <div>
                        X offset: {logoPosition?.x ?? 0}px &middot; Y offset:{" "}
                        {logoPosition?.y ?? 0}px
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AccordionItem>

            <AccordionItem title="Match Info">
              <div className="space-y-4">
                <label className="flex w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-300">Match ID</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                      value={matchIdInput}
                      onChange={(event) =>
                        onMatchIdInputChange(event.target.value)
                      }
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
                    <div className="font-medium text-slate-300">
                      Active Game
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      {games.length} total &middot; {activeGameStatusLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                      onClick={() =>
                        onActiveGameIndexChange(activeGameIndex - 1)
                      }
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
                      onClick={() =>
                        onActiveGameIndexChange(activeGameIndex + 1)
                      }
                      disabled={activeGameIndex >= games.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="relative lg:sticky lg:top-10 lg:self-start lg:w-200">
          <div className="mb-8 ml-2">
            <h1 className="text-3xl mb-2 font-semibold text-lime-400">
              Display Preview
            </h1>
            <p className="text-sm text-slate-400">
              Adjust colors and see the scoreboard update instantly.
            </p>
          </div>
          <div
            className="rounded-lg p-6 shadow-lg mb-8 flex flex-col justify-center items-center"
            style={{
              backgroundColor: tickerBg,
              maxHeight: "calc(100vh - 8rem)",
              overflow: "auto",
            }}
          >
            <Scoreboard
              matchInfo={matchInfo}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              scoreBackground={scoreBackground}
              badgeBackground={badgeBackground}
              showBorder={showBorder}
              manualTextColor={resolvedTextColor}
              useFullAssociationName={useFullAssociationName}
              logoImage={logoImage}
              logoTransparentBackground={logoTransparentBackground}
              logoTextHidden={logoTextHidden}
              logoPosition={logoPosition}
              logoDraggable
              onLogoPositionChange={setLogoPosition}
            />
          </div>
          <div className="mb-8 ml-2">
            <h1 className="text-3xl mb-2 font-semibold text-lime-400">
              Quick Info
            </h1>
            <p className="text-sm text-slate-400">
              Information to help you understand the ticker app a little better.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
