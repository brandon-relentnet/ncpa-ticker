import {
  extractTeamsFromMatchPayload,
  normalizeOfficialMatch,
} from "./officialAdapter";

const DEFAULT_API_BASE = "https://tournaments.ncpaofficial.com/api";

const buildEndpoint = (path, params) => {
  const apiBase = import.meta.env.VITE_NCPA_API_BASE ?? DEFAULT_API_BASE;
  const searchParams = new URLSearchParams(params);
  return `${apiBase}/${path}?${searchParams.toString()}`;
};

const getApiKey = () => {
  const key = import.meta.env.VITE_NCPA_API_KEY;
  if (!key) {
    throw new Error("Missing VITE_NCPA_API_KEY environment variable");
  }
  return key;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
};

export function buildMatchInfo({
  matchId,
  gamesPayload,
  teamsPayload,
  teamsMeta,
}) {
  if (!matchId) throw new Error("matchId is required to build match info");

  if (!gamesPayload?.success) {
    throw new Error("Failed to load games data");
  }

  let resolvedTeamsMeta = teamsMeta ?? null;

  if (!resolvedTeamsMeta && teamsPayload) {
    const extracted = extractTeamsFromMatchPayload(teamsPayload);
    if (extracted) {
      resolvedTeamsMeta = { ...extracted, matchId };
    }
  } else if (
    resolvedTeamsMeta &&
    resolvedTeamsMeta.matchId !== matchId
  ) {
    resolvedTeamsMeta = { ...resolvedTeamsMeta, matchId };
  }

  const matchInfo = normalizeOfficialMatch(gamesPayload, {
    matchId,
    tournamentName: resolvedTeamsMeta?.tournamentName,
    teamOne: resolvedTeamsMeta?.teamOne,
    teamTwo: resolvedTeamsMeta?.teamTwo,
    roundOf: resolvedTeamsMeta?.numTeams,
  });

  return {
    matchInfo,
    teamsMeta: resolvedTeamsMeta,
  };
}

export async function fetchMatchBundle(matchId) {
  if (!matchId) throw new Error("matchId is required");
  const key = getApiKey();

  const gamesUrl = buildEndpoint("get-games", { key, match_id: matchId });
  const matchUrl = buildEndpoint("get-match", { key, match_id: matchId });

  const [gamesPayload, teamsPayload] = await Promise.all([
    fetchJson(gamesUrl),
    fetchJson(matchUrl),
  ]);

  if (!gamesPayload?.success) {
    throw new Error("Failed to load games data");
  }

  if (!teamsPayload?.success) {
    throw new Error("Failed to load match data");
  }

  const { matchInfo, teamsMeta } = buildMatchInfo({
    matchId,
    gamesPayload,
    teamsPayload,
  });

  return {
    matchInfo,
    gamesPayload,
    teamsPayload,
    teamsMeta,
  };
}

export default fetchMatchBundle;
