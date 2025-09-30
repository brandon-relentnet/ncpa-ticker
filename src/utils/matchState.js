const DEFAULT_MATCH = { games: [] };

const toLabel = (value) =>
  (value ?? "")
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export function deriveMatchState(matchInfo) {
  const match = matchInfo ?? DEFAULT_MATCH;
  const games = Array.isArray(match.games) ? match.games : [];
  const latestIndex = Math.max(0, games.length - 1);
  const activeGameIndex =
    typeof match.activeGameIndex === "number"
      ? Math.min(Math.max(match.activeGameIndex, 0), latestIndex)
      : latestIndex;
  const activeGame = games[activeGameIndex];
  const activeGameNumber = activeGame?.number ?? activeGameIndex + 1;
  const activeGameStatus = activeGame?.status ?? "scheduled";
  const activeGameStatusLabel = toLabel(activeGameStatus) || "Scheduled";

  return {
    match,
    games,
    activeGame,
    activeGameIndex,
    activeGameNumber,
    activeGameStatus,
    activeGameStatusLabel,
  };
}
