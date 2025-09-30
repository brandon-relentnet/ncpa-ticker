import { memo, useMemo } from "react";
import { contrastTextColor, hsl } from "../utils/colors";
import { deriveMatchState } from "../utils/matchState";

function Scoreboard({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  useFullAssociationName,
  className = "",
}) {
  const { match: safeMatch, activeGame, activeGameNumber } = useMemo(
    () => deriveMatchState(matchInfo),
    [matchInfo]
  );

  const { headerTextColor, bodyTextColor } = useMemo(() => {
    if (manualTextColor) {
      const manualColorValue = hsl(manualTextColor);
      return {
        headerTextColor: manualColorValue,
        bodyTextColor: manualColorValue,
      };
    }

    return {
      headerTextColor: contrastTextColor(primaryColor),
      bodyTextColor: contrastTextColor(secondaryColor),
    };
  }, [manualTextColor, primaryColor, secondaryColor]);

  const associationLabel = useMemo(
    () =>
      useFullAssociationName
        ? "National College Pickleball Association"
        : "NCPA",
    [useFullAssociationName]
  );

  const footerText = useMemo(() => {
    const details = [
      `Game ${activeGameNumber}${
        safeMatch.best_of ? ` of ${safeMatch.best_of}` : ""
      }`,
      safeMatch.rules,
      safeMatch.winning,
    ];

    return details.filter(Boolean).join(" / ");
  }, [activeGameNumber, safeMatch.best_of, safeMatch.rules, safeMatch.winning]);

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
        className="flex overflow-hidden rounded min-w-120"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        <div className="flex w-40 items-center justify-center text-4xl font-bold">
          NCPA
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

const MemoizedScoreboard = memo(Scoreboard);
MemoizedScoreboard.displayName = "Scoreboard";

export default MemoizedScoreboard;
