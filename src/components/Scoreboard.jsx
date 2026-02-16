import { memo, useCallback, useRef } from "react";
import { contrastTextColor, hsl } from "../utils/colors";
import { deriveMatchState } from "../utils/matchState";
import {
  DEFAULT_LOGO_SCALE,
  DEFAULT_TEAM_LOGO_SCALE,
  normalizeLogoPosition,
} from "../utils/logo";

/** Shallow-compare two HSL objects { h, s, l } by value. */
const hslEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.h === b.h && a.s === b.s && a.l === b.l;
};

/** Shallow-compare two plain objects one level deep. */
const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

/** Custom comparator for React.memo — value-compares HSL and object props. */
const arePropsEqual = (prev, next) => {
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(prev).length) return false;

  for (const key of keys) {
    const a = prev[key];
    const b = next[key];
    if (a === b) continue;

    // Value-compare known HSL color props
    if (
      key === "primaryColor" ||
      key === "secondaryColor" ||
      key === "scoreBackground" ||
      key === "badgeBackground" ||
      key === "manualTextColor"
    ) {
      if (!hslEqual(a, b)) return false;
      continue;
    }

    // Value-compare known plain-object props
    if (key === "logoPosition" || key === "tickerOverrides") {
      if (!shallowEqual(a, b)) return false;
      continue;
    }

    // matchInfo is a complex nested object — compare by reference
    // (it only changes when the API returns new data, which creates a new ref)
    return false;
  }

  return true;
};

function Scoreboard({
  matchInfo,
  primaryColor,
  secondaryColor,
  scoreBackground,
  badgeBackground,
  showBorder,
  manualTextColor,
  useFullAssociationName,
  logoImage,
  logoTransparentBackground = false,
  logoTextHidden = false,
  logoPosition,
  logoScale,
  teamLogoScale,
  tickerOverrides,
  logoDraggable = false,
  onLogoPositionChange,
  className = "",
}) {
  const { match: safeMatch, activeGame } = deriveMatchState(matchInfo);

  const manualColorValue = manualTextColor ? hsl(manualTextColor) : null;
  const bodyBackgroundColor = secondaryColor;
  const scoreBackgroundColor = scoreBackground ?? secondaryColor;
  const badgeBackgroundColorValue = badgeBackground ?? primaryColor;
  const normalizedLogoScale = Number.isFinite(logoScale)
    ? Math.min(Math.max(logoScale, 0.5), 10)
    : DEFAULT_LOGO_SCALE;
  const normalizedTeamLogoScale = Number.isFinite(teamLogoScale)
    ? Math.min(Math.max(teamLogoScale, 0.5), 10)
    : DEFAULT_TEAM_LOGO_SCALE;
  const overrides = tickerOverrides ?? {};
  const hasManualContent = Object.values(overrides).some(
    (value) => typeof value === "string" && value.trim()
  );
  const headerTextColor = manualColorValue ?? contrastTextColor(primaryColor);
  const bodyTextColor =
    manualColorValue ?? contrastTextColor(bodyBackgroundColor);
  const scoreTextColor =
    manualColorValue ?? contrastTextColor(scoreBackgroundColor);
  const normalizedLogoPosition = normalizeLogoPosition(logoPosition);
  const badgeRef = useRef(null);
  const isLogoInteractive = Boolean(
    logoDraggable && typeof onLogoPositionChange === "function"
  );
  const overlayTransform = `translate(-50%, -50%) translate(${normalizedLogoPosition.x}px, ${normalizedLogoPosition.y}px) scale(${normalizedLogoScale})`;
  const badgeBackgroundColor = logoTransparentBackground
    ? "transparent"
    : hsl(badgeBackgroundColorValue);
  const rowBackgroundColor = logoTransparentBackground
    ? "transparent"
    : hsl(primaryColor);

  const handleLogoPointerDown = useCallback(
    (event) => {
      if (!isLogoInteractive) return;
      let startX = event.clientX;
      let startY = event.clientY;
      const originX = normalizedLogoPosition.x;
      const originY = normalizedLogoPosition.y;

      const pointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        onLogoPositionChange({ x: originX + deltaX, y: originY + deltaY });
      };

      const pointerUp = () => {
        window.removeEventListener("pointermove", pointerMove);
        window.removeEventListener("pointerup", pointerUp);
      };

      window.addEventListener("pointermove", pointerMove, { passive: true });
      window.addEventListener("pointerup", pointerUp, { passive: true });

      const capture = event.target?.setPointerCapture;
      if (typeof capture === "function") {
        capture.call(event.target, event.pointerId);
      }
    },
    [
      isLogoInteractive,
      normalizedLogoPosition.x,
      normalizedLogoPosition.y,
      onLogoPositionChange,
    ]
  );

  const defaultHeaderTitle =
    overrides.headerTitle?.trim() ||
    (useFullAssociationName
      ? "National College Pickleball Association"
      : "NCPA");
  const defaultHeaderSubtitle =
    overrides.headerSubtitle?.trim() || (safeMatch.tournament_name ?? "");

  const defaultFooterParts = [
    safeMatch?.roundOf ? `Round of ${safeMatch.roundOf}` : null,
    safeMatch.rules,
    safeMatch.winning,
  ].filter(Boolean);
  const defaultFooterText =
    overrides.footerText?.trim() || defaultFooterParts.join(" / ");

  const defaultTeamOneName =
    overrides.teamOneName?.trim() || activeGame?.t1_name || "";
  const defaultTeamOnePlayers =
    overrides.teamOnePlayers?.trim() ||
    (Array.isArray(activeGame?.t1_players)
      ? activeGame.t1_players.join(" & ")
      : "");
  const defaultTeamOneScore =
    overrides.teamOneScore?.trim() || (activeGame?.t1_score ?? "");

  const defaultTeamTwoName =
    overrides.teamTwoName?.trim() || activeGame?.t2_name || "";
  const defaultTeamTwoPlayers =
    overrides.teamTwoPlayers?.trim() ||
    (Array.isArray(activeGame?.t2_players)
      ? activeGame.t2_players.join(" & ")
      : "");
  const defaultTeamTwoScore =
    overrides.teamTwoScore?.trim() || (activeGame?.t2_score ?? "");

  if (!activeGame && !hasManualContent) {
    return (
      <div
        className={`flex flex-col items-center justify-between ${className}`.trim()}
      >
        <div
          className="w-fit rounded px-4 py-2 text-center text-base font-semibold"
          style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
        >
          No game data available
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-end justify-between ${className}`.trim()}
    >
      <div
        className="w-full rounded-t px-4 py-1 text-right text-base font-semibold tracking-wide scoreboard-header"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        {defaultHeaderTitle}
        {defaultHeaderSubtitle ? ` - ${defaultHeaderSubtitle}` : ""}
      </div>

      <div
        className="flex rounded min-w-120"
        style={{ backgroundColor: rowBackgroundColor, color: headerTextColor }}
      >
        <div
          ref={badgeRef}
          className={`relative flex w-40 rounded-l items-center justify-center ${
            isLogoInteractive ? "cursor-grab" : ""
          }`}
          style={{
            backgroundColor: badgeBackgroundColor,
            touchAction: isLogoInteractive ? "none" : "auto",
          }}
          onPointerDown={handleLogoPointerDown}
        >
          {!logoTextHidden && (
            <img
              src="/NCPA-Logo.jpg"
              alt="NCPA badge"
              draggable={true}
              className="pointer-events-none select-none max-h-32 max-w-32 object-contain"
              style={{
                position: "absolute",
                top: "75%",
                left: "1%",
                transform: overlayTransform,
              }}
            />
          )}
          {logoImage && (
            <img
              src={logoImage}
              alt="Custom logo"
              draggable={false}
              className="pointer-events-none select-none max-h-32 max-w-32 object-contain"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: overlayTransform,
              }}
            />
          )}
        </div>

        <div
          className={`flex w-full flex-col ${showBorder ? "border" : ""}`}
          style={{
            backgroundColor: hsl(bodyBackgroundColor),
            color: bodyTextColor,
          }}
        >
          <div className="flex border-b">
            <div className="flex size-13 items-center justify-center">
              {activeGame?.t1_logo ? (
                <img
                  src={activeGame.t1_logo}
                  alt="t1 logo"
                  style={{
                    transform: `scale(${normalizedTeamLogoScale})`,
                    transformOrigin: "center",
                  }}
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="text-xl font-semibold">{defaultTeamOneName}</div>
              <div className="flex truncate text-xl">
                {defaultTeamOnePlayers}
              </div>
            </div>
            <div
              className="flex w-13 items-center justify-center border-l px-4 text-4xl font-bold"
              style={{
                backgroundColor: hsl(scoreBackgroundColor),
                color: scoreTextColor,
              }}
            >
              {defaultTeamOneScore}
            </div>
          </div>

          <div className="flex">
            <div className="flex aspect-square w-13 items-center justify-center">
              {activeGame?.t2_logo ? (
                <img
                  src={activeGame.t2_logo}
                  alt="t2 logo"
                  style={{
                    transform: `scale(${normalizedTeamLogoScale})`,
                    transformOrigin: "center",
                  }}
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="text-xl font-semibold">{defaultTeamTwoName}</div>
              <div className="flex truncate text-xl">
                {defaultTeamTwoPlayers}
              </div>
            </div>
            <div
              className="flex w-13 items-center justify-center border-l px-4 text-4xl font-bold"
              style={{
                backgroundColor: hsl(scoreBackgroundColor),
                color: scoreTextColor,
              }}
            >
              {defaultTeamTwoScore}
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-full rounded-b px-4 py-1 text-right text-base font-medium scoreboard-header"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        {defaultFooterText}
      </div>
    </div>
  );
}

export default memo(Scoreboard, arePropsEqual);
