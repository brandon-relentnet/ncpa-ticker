import { contrastTextColor, hsl } from "../utils/colors";

export default function Scoreboard({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  useFullAssociationName,
  className = "",
}) {
  const safeMatch = matchInfo ?? { games: [] };
  const manualColorValue = manualTextColor ? hsl(manualTextColor) : null;
  const headerTextColor = manualColorValue ?? contrastTextColor(primaryColor);
  const bodyTextColor = manualColorValue ?? contrastTextColor(secondaryColor);
  const associationLabel = useFullAssociationName
    ? "National College Pickleball Association"
    : "NCPA";
  const games = safeMatch.games ?? [];
  const latestIndex = Math.max(0, games.length - 1);
  const selectedIndex =
    typeof safeMatch.activeGameIndex === "number"
      ? Math.min(Math.max(safeMatch.activeGameIndex, 0), latestIndex)
      : latestIndex;
  const activeGame = games[selectedIndex];
  const activeGameNumber = activeGame?.number ?? selectedIndex + 1;

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
        {[
          `Game ${activeGameNumber}${
            safeMatch.best_of ? ` of ${safeMatch.best_of}` : ""
          }`,
          safeMatch.rules,
          safeMatch.winning,
        ]
          .filter(Boolean)
          .join(" / ")}
      </div>
    </div>
  );
}
