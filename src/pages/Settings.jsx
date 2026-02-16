import { useCallback, useEffect, useRef, useState } from "react";
import { HslColorPicker } from "react-colorful";
import Scoreboard from "../components/Scoreboard";
import Accordion, { AccordionItem } from "../components/Accordion";
import { contrastTextColor, hsl } from "../utils/colors";
import { copyToClipboard } from "../utils/clipboard";
import { deriveMatchState } from "../utils/matchState";
import {
  DEFAULT_LOGO_POSITION,
  DEFAULT_LOGO_SCALE,
  DEFAULT_TEAM_LOGO_SCALE,
} from "../utils/logo";
import { NavLink } from "react-router-dom";
import { motion as Motion } from "motion/react";
import Breadcrumb from "../components/Breadcrumb";
import {
  SlidersHorizontal,
  Monitor,
  Lightbulb,
  Palette,
  PenLine,
  Image,
  Trophy,
  RotateCw,
  Link,
  ExternalLink,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Trash2,
  LocateFixed,
  Loader2,
  AlertCircle,
  Download,
  MonitorPlay,
  Globe,
} from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: EASE_OUT_EXPO },
});

/** Throttle a callback to fire at most once per animation frame. */
function useRafThrottle(callback) {
  const latestRef = useRef(null);
  const rafRef = useRef(null);

  return useCallback(
    (value) => {
      latestRef.current = value;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        callback(latestRef.current);
      });
    },
    [callback]
  );
}

function ColorControl({ label, color, onChange, className = "" }) {
  const throttledOnChange = useRafThrottle(onChange);
  const textColor = contrastTextColor(color);
  const swatchColor = hsl(color);

  return (
    <section className={`space-y-3 ${className}`}>
      <header>
        <h3 className="label-accent">{label}</h3>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {swatchColor}
        </p>
      </header>
      <HslColorPicker color={color} onChange={throttledOnChange} />
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: swatchColor,
          color: textColor,
          border: "1px solid var(--border-subtle)",
        }}
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
  const throttledOnChange = useRafThrottle(onColorChange);
  const description = "Auto B/W for contrast";
  const manualSwatch = hsl(manualColor);
  const manualContrast = contrastTextColor(manualColor).toUpperCase();

  return (
    <section className="space-y-3">
      <header>
        <div className="flex items-center justify-between">
          <h3 className="label-accent">Text Color</h3>
          <label
            className="flex items-center gap-2 text-[11px] font-semibold uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            {manualEnabled ? "Manual" : "Auto"}
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              style={{ accentColor: "var(--accent)" }}
              checked={manualEnabled}
              onChange={(event) => onToggleManual(event.target.checked)}
            />
          </label>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </header>
      <HslColorPicker
        color={manualColor}
        onChange={(value) => {
          throttledOnChange(value);
          if (!manualEnabled) onToggleManual(true);
        }}
      />
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: manualSwatch,
          color: manualContrast,
          border: "1px solid var(--border-subtle)",
        }}
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
    <label
      className="surface-card flex w-full items-center justify-between px-4 py-3 text-sm"
    >
      <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <input
        type="checkbox"
        className="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

const TIP_ITEMS = [
  {
    icon: <Download size={14} />,
    title: "Load Data First",
    body: (
      <>
        Enter the match ID and hit{" "}
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Load</span>.
        Watch the status badge under Match Info for success or refresh
        if the API times out.
      </>
    ),
  },
  {
    icon: <RefreshCw size={14} />,
    title: "Apply Changes",
    body: (
      <>
        Theme, logo, or active game tweaks auto-preview here. Use the
        floating{" "}
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Apply Update</span>{" "}
        button to push them to the ticker window.
      </>
    ),
  },
  {
    icon: <MonitorPlay size={14} />,
    title: "Keep Ticker Open",
    body: (
      <>
        Click{" "}
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Open Ticker</span>{" "}
        to launch a dedicated overlay tab. Capture that tab in OBS or
        your switcher for broadcast.
      </>
    ),
  },
  {
    icon: <Palette size={14} />,
    title: "Tune Branding",
    body: "Use the Design sliders to match your colors and scale team logos up to 1000%. Badge controls live in the Logo accordion for overlays and positioning.",
  },
  {
    icon: <PenLine size={14} />,
    title: "Manual Overrides",
    body: "The Content Overrides accordion lets you rewrite any label or score. Leave fields blank or hit Clear Overrides to return to API values.",
  },
  {
    icon: <Globe size={14} />,
    title: "Cross-Browser Sync",
    body: null, // rendered inline below because it has dynamic content
  },
];

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
  liveUpdatesConnected = false,
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
  logoScale,
  setLogoScale,
  teamLogoScale,
  setTeamLogoScale,
  tickerOverrides,
  onTickerOverrideChange,
  onResetTickerOverrides,
  tickerShareSearch,
  tickerShareUrl,
}) {
  const autoHeaderColor = contrastTextColor(primaryColor);
  const autoBodyColor = contrastTextColor(secondaryColor);
  const autoBadgeColor = contrastTextColor(badgeBackground);
  const autoScoreColor = contrastTextColor(scoreBackground);
  const resolvedTextColor = manualTextColorEnabled ? manualTextColor : null;
  const {
    match: safeMatch,
    games,
    activeGame,
    activeGameIndex,
    activeGameNumber,
    activeGameStatusLabel,
  } = deriveMatchState(matchInfo);

  const tickerBg = hsl(tickerBackground);
  const overrides = tickerOverrides ?? {};
  const defaultAssociationLabel = useFullAssociationName
    ? "National College Pickleball Association"
    : "NCPA";
  const defaultTournamentName = safeMatch?.tournament_name ?? "";
  const defaultTeamOneName = activeGame?.t1_name ?? "";
  const defaultTeamOnePlayers = Array.isArray(activeGame?.t1_players)
    ? activeGame.t1_players.join(" & ")
    : "";
  const defaultTeamOneScore =
    activeGame?.t1_score !== undefined ? String(activeGame.t1_score) : "";
  const defaultTeamTwoName = activeGame?.t2_name ?? "";
  const defaultTeamTwoPlayers = Array.isArray(activeGame?.t2_players)
    ? activeGame.t2_players.join(" & ")
    : "";
  const defaultTeamTwoScore =
    activeGame?.t2_score !== undefined ? String(activeGame.t2_score) : "";
  const defaultFooterText = [
    `Game ${activeGameNumber}${
      safeMatch?.best_of ? ` of ${safeMatch.best_of}` : ""
    }`,
    safeMatch?.rules,
    safeMatch?.winning,
  ]
    .filter(Boolean)
    .join(" / ");

  const overrideFields = [
    { key: "headerTitle", label: "headerTitle", placeholder: defaultAssociationLabel },
    { key: "headerSubtitle", label: "headerSubtitle", placeholder: defaultTournamentName },
    { key: "teamOneName", label: "teamOneName", placeholder: defaultTeamOneName },
    { key: "teamOnePlayers", label: "teamOnePlayers", placeholder: defaultTeamOnePlayers },
    { key: "teamOneScore", label: "teamOneScore", placeholder: defaultTeamOneScore },
    { key: "teamTwoName", label: "teamTwoName", placeholder: defaultTeamTwoName },
    { key: "teamTwoPlayers", label: "teamTwoPlayers", placeholder: defaultTeamTwoPlayers },
    { key: "teamTwoScore", label: "teamTwoScore", placeholder: defaultTeamTwoScore },
  ];

  const [copyStatus, setCopyStatus] = useState("idle");

  useEffect(() => {
    if (copyStatus !== "copied") return;
    const timeout = setTimeout(() => setCopyStatus("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const handleCopyTickerUrl = async () => {
    if (!tickerShareUrl) return;
    const ok = await copyToClipboard(tickerShareUrl);
    setCopyStatus(ok ? "copied" : "error");
  };

  const copyButtonLabel =
    copyStatus === "copied" ? "Link Copied" : "Copy Ticker URL";
  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoImage(reader.result);
        setLogoPosition({ ...DEFAULT_LOGO_POSITION });
        setLogoScale(DEFAULT_LOGO_SCALE);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoPosition({ ...DEFAULT_LOGO_POSITION });
    setLogoScale(DEFAULT_LOGO_SCALE);
  };

  const handleResetLogoPosition = () => {
    setLogoPosition({ ...DEFAULT_LOGO_POSITION });
  };

  const handleLogoScaleChange = (value) => {
    const clamped = Math.min(Math.max(value, 0.5), 10);
    setLogoScale(Number.isFinite(clamped) ? clamped : DEFAULT_LOGO_SCALE);
  };

  const handleTeamLogoScaleChange = (value) => {
    const clamped = Math.min(Math.max(value, 0.5), 10);
    setTeamLogoScale(
      Number.isFinite(clamped) ? clamped : DEFAULT_TEAM_LOGO_SCALE
    );
  };

  const hoverTap = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.97 },
  };

  return (
    <div className="page-shell py-10">
      <Motion.div className="mx-auto max-w-[1600px] px-6" {...fadeUp(0)}>
        <Breadcrumb current="Settings" />
      </Motion.div>
      <div className="mx-auto flex max-w-[1600px] flex-col justify-center gap-8 px-6 lg:flex-row">
        {/* ── Left column: Controls ────────────────────────────────────── */}
        <Motion.div className="w-114 space-y-6 rounded-3xl" {...fadeUp(0.05)}>
          <div className="mb-8 ml-2">
            <h1 className="flex items-center gap-2.5 section-heading mb-2 text-3xl">
              <SlidersHorizontal size={22} style={{ color: "var(--accent)" }} />
              Ticker Controls
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Adjust settings and see the preview update instantly.
            </p>
          </div>

          <Motion.div {...fadeUp(0.1)}>
            <Accordion>
              <AccordionItem title="Design" icon={<Palette size={16} />}>
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

                  <div className="surface-card px-4 py-3 sm:col-span-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="label-accent">Team Logos</span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {Math.round((teamLogoScale ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.05"
                      value={teamLogoScale ?? DEFAULT_TEAM_LOGO_SCALE}
                      onChange={(event) =>
                        handleTeamLogoScaleChange(Number(event.target.value))
                      }
                      className="mt-3 w-full"
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </div>
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

              <AccordionItem title="Content Overrides" icon={<PenLine size={16} />}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Override individual fields on the ticker. Leave any input blank
                  to fall back to live API data.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {overrideFields.map(({ key, label, placeholder }) => (
                    <label key={key} className="surface-card flex flex-col gap-1 px-4 py-3 text-xs">
                      <span className="label-accent">{label}</span>
                      <input
                        type="text"
                        className="input-field text-sm"
                        value={overrides[key] ?? ""}
                        placeholder={placeholder || "(from API)"}
                        onChange={(event) =>
                          onTickerOverrideChange(key, event.target.value)
                        }
                      />
                    </label>
                  ))}
                  <label className="surface-card flex flex-col gap-1 px-4 py-3 text-xs sm:col-span-2">
                    <span className="label-accent">footerText</span>
                    <textarea
                      rows={3}
                      className="input-field text-sm"
                      value={overrides.footerText ?? ""}
                      placeholder={defaultFooterText || "(from API)"}
                      onChange={(event) =>
                        onTickerOverrideChange("footerText", event.target.value)
                      }
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="btn-pill flex items-center gap-1.5"
                    onClick={onResetTickerOverrides}
                  >
                    <Eraser size={14} />
                    Clear Overrides
                  </button>
                </div>
              </AccordionItem>

              <AccordionItem title="Logo" icon={<Image size={16} />}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Upload an image to replace the NCPA badge. Drag it in the
                      preview to adjust placement.
                    </p>
                    {logoImage && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--danger)" }}
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>

                  <label
                    className="flex flex-col gap-2 rounded-xl px-4 py-3 text-xs"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px dashed var(--border-default)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span className="label-accent">Upload logo image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="file-input-styled"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </label>

                  {logoImage && (
                    <div className="surface-card flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={logoImage}
                          alt="Custom logo preview"
                          className="h-12 w-12 rounded object-contain"
                        />
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                            Logo loaded
                          </div>
                          <div>Drag the image on the preview to reposition.</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-pill flex items-center gap-1.5"
                        onClick={handleResetLogoPosition}
                      >
                        <LocateFixed size={14} />
                        Reset position
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="surface-card px-4 py-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="label-accent">Logo Scale</span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {Math.round((logoScale ?? 1) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.05"
                        value={logoScale ?? DEFAULT_LOGO_SCALE}
                        onChange={(event) =>
                          handleLogoScaleChange(Number(event.target.value))
                        }
                        className="mt-3 w-full"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </div>
                    <LabeledToggle
                      label="Transparent badge background"
                      checked={logoTransparentBackground}
                      onChange={setLogoTransparentBackground}
                    />
                    <LabeledToggle
                      label="Hide default NCPA logo"
                      checked={logoTextHidden}
                      onChange={setLogoTextHidden}
                    />
                    {logoImage && (
                      <div className="surface-card px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
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

              <AccordionItem title="Match Info" icon={<Trophy size={16} />}>
                <div className="space-y-4">
                  <label className="surface-card flex w-full flex-col gap-2 px-4 py-3 text-sm">
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      Match ID
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input-field flex-1"
                        value={matchIdInput}
                        onChange={(event) =>
                          onMatchIdInputChange(event.target.value)
                        }
                        placeholder="Enter match ID"
                      />
                      <button
                        type="button"
                        className="btn-pill flex items-center gap-1.5"
                        onClick={onApplyMatchId}
                        disabled={matchLoading}
                        aria-label="Load match by ID"
                      >
                        <Play size={14} />
                        Load
                      </button>
                    </div>
                    <div
                      className="flex items-center justify-between text-[11px] uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>Active: {activeMatchId || "\u2014"}</span>
                      <button
                        type="button"
                        className="btn-pill flex items-center gap-1.5"
                        onClick={onReloadMatch}
                        disabled={matchLoading || !activeMatchId}
                      >
                        <RefreshCw size={12} />
                        Refresh
                      </button>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className={
                          liveUpdatesConnected ? "status-dot status-dot-live" : "status-dot status-dot-offline"
                        }
                      />
                      <span style={{ color: liveUpdatesConnected ? "var(--accent)" : "var(--text-muted)" }}>
                        Live updates:{" "}
                        {liveUpdatesConnected ? "Connected" : "Reconnecting\u2026"}
                      </span>
                    </p>
                    {matchLoading && (
                      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--accent)" }}>
                        <Loader2 size={12} className="animate-spin" />
                        Loading match{"\u2026"}
                      </p>
                    )}
                    {matchError && (
                      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--danger)" }}>
                        <AlertCircle size={12} />
                        {matchError}
                      </p>
                    )}
                  </label>

                  <div className="surface-card flex w-full items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium" style={{ color: "var(--text-secondary)" }}>
                        Active Game
                      </div>
                      <div
                        className="text-[11px] uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {games.length} total &middot; {activeGameStatusLabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-pill flex items-center gap-1"
                        onClick={() =>
                          onActiveGameIndexChange(activeGameIndex - 1)
                        }
                        disabled={activeGameIndex <= 0}
                      >
                        <ChevronLeft size={14} />
                        Prev
                      </button>
                      <div
                        className="w-16 text-center text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Game {activeGameNumber}
                      </div>
                      <button
                        type="button"
                        className="btn-pill flex items-center gap-1"
                        onClick={() =>
                          onActiveGameIndexChange(activeGameIndex + 1)
                        }
                        disabled={activeGameIndex >= games.length - 1}
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </AccordionItem>
            </Accordion>
          </Motion.div>
        </Motion.div>

        {/* ── Right column: Preview + Quick Info ────────────────────────── */}
        <div className="relative lg:sticky lg:top-10 lg:w-200 lg:self-start">
          <Motion.div className="mb-8 ml-2" {...fadeUp(0.15)}>
            <h1 className="flex items-center gap-2.5 section-heading mb-2 text-3xl">
              <Monitor size={22} style={{ color: "var(--accent)" }} />
              Display Preview
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Adjust colors and see the scoreboard update instantly.
            </p>
          </Motion.div>
          <Motion.div
            className="mb-8 flex flex-col items-center justify-center rounded-lg p-6 shadow-lg"
            style={{
              backgroundColor: tickerBg,
              maxHeight: "calc(100vh - 8rem)",
              overflow: "auto",
            }}
            {...fadeUp(0.2)}
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
              logoScale={logoScale}
              teamLogoScale={teamLogoScale}
              tickerOverrides={tickerOverrides}
              logoDraggable
              onLogoPositionChange={setLogoPosition}
            />
          </Motion.div>

          <Motion.div className="mb-8 ml-2 space-y-4" {...fadeUp(0.25)}>
            <h1 className="flex items-center gap-2.5 section-heading text-3xl">
              <Lightbulb size={22} style={{ color: "var(--accent)" }} />
              Quick Info
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              A few tips for using the ticker effectively.
            </p>
          </Motion.div>
          <Motion.div className="surface-card p-6" {...fadeUp(0.3)}>
            <div className="space-y-3 text-sm">
              {TIP_ITEMS.map((tip) => (
                <div key={tip.title}>
                  <div className="flex items-center gap-2 label-accent">
                    <span style={{ color: "var(--accent)" }}>{tip.icon}</span>
                    {tip.title}
                  </div>
                  <p style={{ color: "var(--text-muted)" }}>
                    {tip.title === "Cross-Browser Sync" ? (
                      <>
                        Load the ticker URL below once in vMix (or any browser) and
                        keep this Settings page open. Every time you hit Apply Update
                        the overlay refreshes automatically in that remote view.
                        {tickerShareUrl ? (
                          <span
                            className="mt-2 block break-all font-mono text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {tickerShareUrl}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      tip.body
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Motion.div>
        </div>
      </div>

      {/* ── Floating Action Buttons ────────────────────────────────────── */}
      <Motion.div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: EASE_OUT_EXPO }}
      >
        <Motion.button
          type="button"
          className="btn-primary flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg"
          style={{ boxShadow: "0 4px 20px var(--accent-glow)" }}
          onClick={onApplyTickerUpdate}
          disabled={matchLoading || !matchInfo}
          {...hoverTap}
        >
          <RotateCw size={16} />
          <span>Apply Update</span>
        </Motion.button>

        <Motion.button
          type="button"
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-wide shadow-lg transition"
          style={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            boxShadow: "0 4px 20px rgba(0, 229, 160, 0.1)",
          }}
          onClick={handleCopyTickerUrl}
          disabled={!tickerShareUrl}
          {...hoverTap}
        >
          <Link size={16} />
          <span>{copyButtonLabel}</span>
        </Motion.button>

        {copyStatus === "error" ? (
          <div className="text-right text-xs font-medium" style={{ color: "var(--danger)" }}>
            Copy failed. Manually copy the link above.
          </div>
        ) : null}

        <Motion.div
          {...hoverTap}
          className="rounded-full shadow-lg"
          style={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--accent)",
            boxShadow: "0 4px 20px rgba(0, 229, 160, 0.1)",
          }}
        >
          <NavLink
            to={`/ticker${tickerShareSearch ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            <ExternalLink size={16} />
            <span>Open Ticker</span>
          </NavLink>
        </Motion.div>
      </Motion.div>
    </div>
  );
}
