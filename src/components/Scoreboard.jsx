import { contrastTextColor, hsl } from "../utils/colors";

export default function Scoreboard({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  className = "",
}) {
  const headerTextColor = contrastTextColor(primaryColor);
  const bodyTextColor = contrastTextColor(secondaryColor);

  return (
    <div
      className={`flex flex-col items-center justify-between ${className}`.trim()}
    >
      <div
        className="w-fit rounded-t px-3 py-1 text-center text-sm font-semibold uppercase tracking-wide"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        National College Pickleball Association - {matchInfo.tournament_name}
      </div>

      <div
        className="flex overflow-hidden rounded"
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
              <img src={matchInfo.active_game.t1_logo} alt="t1_logo" />
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="font-semibold">
                {matchInfo.active_game.t1_name}
              </div>
              <div className="flex truncate text-sm">
                {matchInfo.active_game.t1_players.join(" & ")}
              </div>
            </div>
            <div className="flex aspect-square items-center justify-center border-l px-4 text-3xl font-bold">
              {matchInfo.active_game.t1_score}
            </div>
          </div>

          <div className="flex">
            <div className="flex size-15 items-center justify-center">
              <img src={matchInfo.active_game.t2_logo} alt="t2_logo" />
            </div>
            <div className="flex flex-1 flex-col justify-center pl-2">
              <div className="font-semibold">
                {matchInfo.active_game.t2_name}
              </div>
              <div className="flex truncate text-sm">
                {matchInfo.active_game.t2_players.join(" & ")}
              </div>
            </div>
            <div className="flex aspect-square items-center justify-center border-l px-4 text-3xl font-bold">
              {matchInfo.active_game.t2_score}
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-fit rounded-b px-3 py-1 text-center text-sm font-medium"
        style={{ backgroundColor: hsl(primaryColor), color: headerTextColor }}
      >
        Game {matchInfo.game_index} of {matchInfo.best_of} / {matchInfo.rules} /{" "}
        {matchInfo.winning}
      </div>
    </div>
  );
}
