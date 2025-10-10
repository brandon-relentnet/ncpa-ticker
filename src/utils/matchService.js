import {
  extractTeamsFromMatchPayload,
  normalizeOfficialMatch,
} from "./officialAdapter";

const DEFAULT_API_BASE = "https://tournaments.ncpaofficial.com";
const API_PATH_PREFIX = "/api";

const resolveApiBase = () => {
  const rawBase = import.meta.env.VITE_NCPA_API_BASE;
  const trimmed =
    typeof rawBase === "string" && rawBase.trim()
      ? rawBase.trim()
      : DEFAULT_API_BASE;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  return withoutTrailingSlash || DEFAULT_API_BASE;
};

const normalizeApiPath = (baseUrl, path) => {
  if (path === undefined || path === null) {
    throw new Error("API path is required");
  }

  const trimmedPath = String(path).trim();
  if (!trimmedPath) throw new Error("API path is required");

  let normalized = `/${trimmedPath.replace(/^\/+/, "")}`;
  if (!normalized.startsWith(`${API_PATH_PREFIX}/`)) {
    normalized = `${API_PATH_PREFIX}${normalized}`;
  }

  const baseHasApiSuffix = /\/api$/i.test(baseUrl);
  if (baseHasApiSuffix && normalized.startsWith(API_PATH_PREFIX)) {
    const sliced = normalized.slice(API_PATH_PREFIX.length);
    normalized = sliced.startsWith("/") ? sliced : `/${sliced}`;
  }

  return normalized;
};

const buildEndpoint = (path, params = {}) => {
  const apiBase = resolveApiBase();
  const normalizedPath = normalizeApiPath(apiBase, path);
  const urlBase = apiBase.replace(/\/+$/, "");
  const fullPath = normalizedPath.startsWith("/")
    ? `${urlBase}${normalizedPath}`
    : `${urlBase}/${normalizedPath}`;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    searchParams.append(key, value);
  });

  const query = searchParams.toString();
  return query ? `${fullPath}?${query}` : fullPath;
};

const getApiKey = () => {
  const key = import.meta.env.VITE_NCPA_API_KEY;
  if (!key) {
    throw new Error("Missing VITE_NCPA_API_KEY environment variable");
  }
  return key;
};

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.clone().json();
    if (payload && typeof payload === "object") {
      const message =
        (typeof payload.error === "string" && payload.error.trim()) ||
        (typeof payload.message === "string" && payload.message.trim()) ||
        (typeof payload.detail === "string" && payload.detail.trim());
      if (message) return message;
    }
  } catch {
    // fall through to attempt reading text
  }

  try {
    const text = await response.clone().text();
    if (text) return text.trim() || null;
  } catch {
    // ignore secondary parsing errors
  }

  return null;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const parsedMessage =
      (await parseErrorMessage(response)) ??
      `Request failed with status ${response.status}`;
    throw new Error(parsedMessage);
  }
  return response.json();
};

const resolveApiError = (payload, fallbackMessage) => {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  const message =
    (typeof payload.error === "string" && payload.error.trim()) ||
    (typeof payload.message === "string" && payload.message.trim()) ||
    (typeof payload.detail === "string" && payload.detail.trim());
  return message || fallbackMessage;
};

export function buildMatchInfo({
  matchId,
  gamesPayload,
  teamsPayload,
  teamsMeta,
}) {
  if (!matchId) throw new Error("matchId is required to build match info");

  if (!gamesPayload?.success) {
    throw new Error(resolveApiError(gamesPayload, "Failed to load games data"));
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
    throw new Error(resolveApiError(gamesPayload, "Failed to load games data"));
  }

  if (!teamsPayload?.success) {
    throw new Error(resolveApiError(teamsPayload, "Failed to load match data"));
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
