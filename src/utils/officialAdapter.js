const DEFAULT_TEAM_ONE = {
  name: "Team One",
  shortName: "Team 1",
  logo: "/logos/team-one.png",
  teamId: "team_one",
};

const DEFAULT_TEAM_TWO = {
  name: "Team Two",
  shortName: "Team 2",
  logo: "/logos/team-two.png",
  teamId: "team_two",
};

const DEFAULT_RULES = "First to 11 (win by 2)";
const DEBUG_RULES =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_DEBUG_ACTIVE_GAME === "true";

const trimString = (value) =>
  typeof value === "string" ? value.trim() : value ?? "";

const formatName = (player) => {
  if (!player) return null;
  const first = trimString(player.first_name);
  const last = trimString(player.last_name);
  const name = [first, last].filter(Boolean).join(" ");
  return name || null;
};

const formatPlayers = (players) => {
  if (!Array.isArray(players) || players.length === 0) {
    return [];
  }

  return players.map((player) => formatName(player)).filter(Boolean);
};

const deriveStatus = (game, info, rules) => {
  const hasScores = game.t1score != null || game.t2score != null;
  if (!hasScores) return "scheduled";
  const winner = game.winner;
  if (winner == null) return "in_progress";

  const targetScoreRaw = info?.target_score;
  const winMarginRaw = info?.win_margin;
  const targetScore = Number(targetScoreRaw);
  const winMargin =
    Number.isFinite(Number(winMarginRaw)) && Number(winMarginRaw) > 0
      ? Number(winMarginRaw)
      : 1;

  const parsedRule = (() => {
    if (rules && typeof rules === "string") {
      const raceMatch = /(?:first|race)\s+to\s+(\d+)/i.exec(rules);
      const winByMatch = /win\s+by\s+(\d+)/i.exec(rules);
      return {
        target:
          raceMatch && Number.isFinite(Number(raceMatch[1]))
            ? Number(raceMatch[1])
            : undefined,
        margin:
          winByMatch && Number.isFinite(Number(winByMatch[1]))
            ? Number(winByMatch[1])
            : undefined,
      };
    }
    return {};
  })();
  const mergeTarget =
    Number.isFinite(parsedRule.target) && parsedRule.target > 0
      ? parsedRule.target
      : targetScore;
  const mergeMargin =
    Number.isFinite(parsedRule.margin) && parsedRule.margin > 0
      ? parsedRule.margin
      : winMargin;
  const resolvedTarget = Number.isFinite(mergeTarget) ? mergeTarget : undefined;
  const resolvedMargin =
    Number.isFinite(mergeMargin) && mergeMargin > 0 ? mergeMargin : 1;

  const t1 = Number(game.t1score ?? 0);
  const t2 = Number(game.t2score ?? 0);
  const leadingScore = winner === 0 ? t1 : t2;
  const trailingScore = winner === 0 ? t2 : t1;

  if (DEBUG_RULES && typeof console !== "undefined") {
    console.debug("[deriveStatus]", {
      number: game?.number ?? null,
      scores: { t1, t2 },
      winner,
      resolvedTarget,
      resolvedMargin,
      leadingScore,
      trailingScore,
      infoTarget: targetScore,
      infoMargin: winMargin,
      parsedRule,
    });
  }

  if (resolvedTarget) {
    if (leadingScore < resolvedTarget) return "in_progress";
    if (leadingScore - trailingScore < resolvedMargin) return "in_progress";
  }

  return "final";
};

const clampIndex = (index, total) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, index));
};

const deriveActiveGameIndex = (info, games) => {
  const totalGames = games.length;
  if (totalGames === 0) return 0;

  const inProgressIndex = games.findIndex((game) => game.status === "in_progress");
  if (inProgressIndex >= 0) return inProgressIndex;

  if (info && typeof info.current_game === "number" && info.current_game >= 0) {
    const possibleOneBased = info.current_game > 0 && info.current_game <= totalGames;
    const normalizedIndex = possibleOneBased
      ? info.current_game - 1
      : info.current_game;
    return clampIndex(normalizedIndex, totalGames);
  }

  let lastFinalIndex = -1;
  games.forEach((game, index) => {
    if (game.status === "final") lastFinalIndex = index;
  });
  if (lastFinalIndex >= 0) return lastFinalIndex;

  return clampIndex(totalGames - 1, totalGames);
};

const summarizeMatch = (info, teams) => {
  if (!info) return "";
  const { t1_wins, t2_wins, winner } = info;
  const totalOne = typeof t1_wins === "number" ? t1_wins : 0;
  const totalTwo = typeof t2_wins === "number" ? t2_wins : 0;

  if (winner === 0) return `${teams.one.name} wins ${totalOne}-${totalTwo}`;
  if (winner === 1) return `${teams.two.name} wins ${totalTwo}-${totalOne}`;

  if (totalOne === totalTwo) return "Match tied";

  return totalOne > totalTwo
    ? `${teams.one.name} leads ${totalOne}-${totalTwo}`
    : `${teams.two.name} leads ${totalTwo}-${totalOne}`;
};

const normalizeTeamOption = (defaults, overrides = {}) => {
  const merged = { ...defaults, ...overrides };
  if (!merged.name) merged.name = defaults.name;
  if (!merged.shortName) merged.shortName = merged.name;
  if (!merged.logo) merged.logo = defaults.logo;
  if (!merged.teamId) merged.teamId = overrides.teamId ?? defaults.teamId;
  return merged;
};

const sanitizeTeamId = (team) => {
  if (!team) return undefined;
  if (typeof team.ind === "number") return `team_${team.ind}`;
  const raw = trimString(team.team_name);
  if (!raw) return undefined;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

const extractTeamFromMatchPayload = (team, defaults) => {
  if (!team) return defaults;
  const fallbackName = trimString(team.team_name) || trimString(team.university_name);
  const name = fallbackName || defaults.name;
  const shortName = trimString(team.team_name) || name || defaults.shortName;
  const logo = trimString(team.university_picture) || defaults.logo;
  const teamId = sanitizeTeamId(team) ?? defaults.teamId;

  return normalizeTeamOption(defaults, {
    name,
    shortName,
    logo,
    teamId,
  });
};

export function normalizeOfficialMatch(officialPayload, options = {}) {
  if (!officialPayload || typeof officialPayload !== "object") {
    throw new Error("normalizeOfficialMatch expects a JSON object payload");
  }

  const info = officialPayload.info ?? {};
  const rawGames = Array.isArray(info.games) ? info.games : [];
  const rawRoundOf =
    typeof info.round_of === "number" && info.round_of > 0
      ? info.round_of
      : undefined;

  const teamOne = normalizeTeamOption(DEFAULT_TEAM_ONE, options.teamOne);
  const teamTwo = normalizeTeamOption(DEFAULT_TEAM_TWO, options.teamTwo);

  const resolvedRules = (() => {
    const target = Number(info?.target_score);
    const margin = Number(info?.win_margin);
    const ruleFromNumbers = (() => {
      if (Number.isFinite(target) && target > 0) {
        if (Number.isFinite(margin) && margin > 1) {
          return `First to ${target} (win by ${margin})`;
        }
        return `First to ${target}`;
      }
      return null;
    })();

    const ruleCandidates = [ruleFromNumbers, options.rules, info?.rules];
    for (const candidate of ruleCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
    return DEFAULT_RULES;
  })();

  const derivedGames = rawGames.map((game, index) => {
    const status = deriveStatus(game, info, resolvedRules);
    return {
      number: index + 1,
      status,
      t1_name: teamOne.name,
      t1_score: game.t1score ?? 0,
      t1_logo: teamOne.logo,
      t1_players: formatPlayers(game.t1_players),
      t2_name: teamTwo.name,
      t2_score: game.t2score ?? 0,
      t2_logo: teamTwo.logo,
      t2_players: formatPlayers(game.t2_players),
    };
  });

  const activeGameIndex = deriveActiveGameIndex(info, derivedGames);
  const bestOfValue = (() => {
    if (typeof options.bestOf === "number" && options.bestOf > 0) {
      return options.bestOf;
    }
    const parsed = Number(options.bestOf);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return derivedGames.length > 0 ? derivedGames.length : info.total_games ?? derivedGames.length;
  })();

  const roundOfValue = (() => {
    if (typeof options.roundOf === "number" && options.roundOf > 0) {
      return options.roundOf;
    }
    const parsed = Number(options.roundOf);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return rawRoundOf;
  })();

  return {
    match_id: options.matchId ?? "unknown-match",
    tournament_name: options.tournamentName ?? "Unknown Tournament",
    best_of: bestOfValue,
    rules: resolvedRules,
    winning: options.winning ?? summarizeMatch(info, { one: teamOne, two: teamTwo }),
    winner_team_id:
      info.winner === 0
        ? teamOne.teamId ?? teamOne.shortName
        : info.winner === 1
        ? teamTwo.teamId ?? teamTwo.shortName
        : null,
    games: derivedGames,
    activeGameIndex,
    roundOf: roundOfValue,
  };
}

export function extractTeamsFromMatchPayload(matchPayload) {
  if (!matchPayload || typeof matchPayload !== "object") return {};

  const info = matchPayload.match_info ?? {};
  const teamOne = extractTeamFromMatchPayload(info.t1, DEFAULT_TEAM_ONE);
  const teamTwo = extractTeamFromMatchPayload(info.t2, DEFAULT_TEAM_TWO);

  const tournamentName = trimString(info.tournament) || undefined;
  const eventType = trimString(info.event_type) || undefined;
  const bracketName = trimString(info.bracket_name) || undefined;
  const numTeams =
    typeof info.num_teams === "number" && info.num_teams > 0
      ? info.num_teams
      : undefined;

  return {
    teamOne,
    teamTwo,
    tournamentName,
    eventType,
    bracketName,
    numTeams,
  };
}

export default normalizeOfficialMatch;
