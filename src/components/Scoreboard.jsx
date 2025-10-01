import { useCallback, useRef } from "react";
import { contrastTextColor, hsl } from "../utils/colors";
import { deriveMatchState } from "../utils/matchState";
import { normalizeLogoPosition } from "../utils/logo";

export default function Scoreboard({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  useFullAssociationName,
  logoImage,
  logoTransparentBackground = false,
  logoTextHidden = false,
  logoPosition,
  logoDraggable = false,
  onLogoPositionChange,
  className = "",
}) {
  const {
    match: safeMatch,
    activeGame,
    activeGameNumber,
  } = deriveMatchState(matchInfo);

  const manualColorValue = manualTextColor ? hsl(manualTextColor) : null;
  const headerTextColor = manualColorValue ?? contrastTextColor(primaryColor);
  const bodyTextColor = manualColorValue ?? contrastTextColor(secondaryColor);
  const associationLabel = useFullAssociationName
    ? "National College Pickleball Association"
    : "NCPA";
  const normalizedLogoPosition = normalizeLogoPosition(logoPosition);
  const badgeRef = useRef(null);
  const isLogoInteractive = Boolean(
    logoImage && logoDraggable && typeof onLogoPositionChange === "function"
  );
  const overlayTransform = `translate(-50%, -50%) translate(${normalizedLogoPosition.x}px, ${normalizedLogoPosition.y}px)`;
  const badgeBackgroundColor = logoTransparentBackground
    ? "transparent"
    : hsl(primaryColor);
  const rowBackgroundColor = logoTransparentBackground
    ? "transparent"
    : hsl(primaryColor);

  const handleLogoPointerDown = useCallback(
    (event) => {
      if (!isLogoInteractive) return;
      event.preventDefault();

      const startX = event.clientX;
      const startY = event.clientY;
      const originX = normalizedLogoPosition.x;
      const originY = normalizedLogoPosition.y;

      const handlePointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        onLogoPositionChange({ x: originX + deltaX, y: originY + deltaY });
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);

      const capture = badgeRef.current?.setPointerCapture;
      if (typeof capture === "function") {
        capture.call(badgeRef.current, event.pointerId);
      }
    },
    [
      isLogoInteractive,
      normalizedLogoPosition.x,
      normalizedLogoPosition.y,
      onLogoPositionChange,
    ]
  );

  const footerText = [
    `Game ${activeGameNumber}${
      safeMatch.best_of ? ` of ${safeMatch.best_of}` : ""
    }`,
    safeMatch.rules,
    safeMatch.winning,
  ]
    .filter(Boolean)
    .join(" / ");

  if (!activeGame) {
    return (
      <div
        className={`flex flex-col items-center justify-between ${className}`.trim()}
      >
        <div
          className="w-fit rounded px-4 py-2 text-center text-sm font-semibold"
          style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
        >
          No game data available
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-between ${className}`.trim()}
    >
      <div
        className="w-fit rounded-t px-3 py-1 text-center text-sm font-semibold tracking-wide"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        {associationLabel}
        {safeMatch.tournament_name ? ` - ${safeMatch.tournament_name}` : ""}
      </div>

      <div
        className="flex rounded min-w-120"
        style={{ backgroundColor: rowBackgroundColor, color: headerTextColor }}
      >
        <div
          ref={badgeRef}
          className={`relative flex w-40 items-center justify-center text-4xl font-bold ${
            isLogoInteractive ? "cursor-grab" : ""
          }`}
          style={{
            backgroundColor: badgeBackgroundColor,
            color: headerTextColor,
            touchAction: isLogoInteractive ? "none" : "auto",
          }}
          onPointerDown={handleLogoPointerDown}
        >
          {!logoTextHidden && "NCPA"}
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
          className={`flex w-full flex-col rounded ${
            showBorder ? "border" : ""
          }`}
          style={{ backgroundColor: hsl(secondaryColor), color: bodyTextColor }}
        >
          <div className="flex border-b">
            <div className="flex size-15 items-center justify-center">
              <img src={activeGame.t1_logo} alt="t1 logo" />
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="font-semibold">{activeGame.t1_name}</div>
              <div className="flex truncate text-sm">
                {activeGame.t1_players.join(" & ")}
              </div>
            </div>
            <div className="flex size-15 items-center justify-center border-l px-4 text-3xl font-bold">
              {activeGame.t1_score}
            </div>
          </div>

          <div className="flex">
            <div className="flex aspect-square w-15 items-center justify-center">
              <img src={activeGame.t2_logo} alt="t2 logo" />
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="font-semibold">{activeGame.t2_name}</div>
              <div className="flex truncate text-sm">
                {activeGame.t2_players.join(" & ")}
              </div>
            </div>
            <div className="flex size-15 items-center justify-center border-l px-4 text-3xl font-bold">
              {activeGame.t2_score}
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-fit rounded-b px-3 py-1 text-center text-sm font-medium"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        {footerText}
      </div>
    </div>
  );
}
