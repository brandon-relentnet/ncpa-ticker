import { useCallback, useMemo, useReducer } from "react";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  DEFAULT_SCORE_BACKGROUND,
  DEFAULT_BADGE_BACKGROUND,
  DEFAULT_TICKER_BACKGROUND,
  DEFAULT_TEXT_COLOR,
  hexToHsl,
} from "../utils/colors";
import {
  DEFAULT_LOGO_POSITION,
  DEFAULT_LOGO_SCALE,
  DEFAULT_TEAM_LOGO_SCALE,
  normalizeLogoPosition,
} from "../utils/logo";

/* ── Constants ─────────────────────────────────────────────────────────────── */
const STORAGE_KEY = "pickleball-ticker-theme";

export const DEFAULT_TICKER_OVERRIDES = {
  headerTitle: "",
  headerSubtitle: "",
  teamOneName: "",
  teamOnePlayers: "",
  teamOneScore: "",
  teamTwoName: "",
  teamTwoPlayers: "",
  teamTwoScore: "",
  footerText: "",
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const clampLogoScale = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LOGO_SCALE;
  return Math.min(Math.max(numeric, 0.5), 10);
};

const clampTeamLogoScale = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TEAM_LOGO_SCALE;
  return Math.min(Math.max(numeric, 0.5), 10);
};

const normalizeOverrides = (value) => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_TICKER_OVERRIDES };
  }
  const normalized = { ...DEFAULT_TICKER_OVERRIDES };
  Object.keys(normalized).forEach((key) => {
    const raw = value[key];
    normalized[key] = typeof raw === "string" ? raw : "";
  });
  return normalized;
};

const loadStoredTheme = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to read saved ticker theme", error);
    return null;
  }
};

/* ── Action types ──────────────────────────────────────────────────────────── */
export const ACTIONS = {
  SET_FIELD: "SET_FIELD",
  SET_MATCH_INFO: "SET_MATCH_INFO",
  SET_ACTIVE_GAME_INDEX: "SET_ACTIVE_GAME_INDEX",
  SET_TICKER_OVERRIDE: "SET_TICKER_OVERRIDE",
  RESET_TICKER_OVERRIDES: "RESET_TICKER_OVERRIDES",
  APPLY_SYNC: "APPLY_SYNC",
  SET_LOGO_SCALE: "SET_LOGO_SCALE",
  SET_TEAM_LOGO_SCALE: "SET_TEAM_LOGO_SCALE",
};

/* ── Reducer ───────────────────────────────────────────────────────────────── */
function tickerReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FIELD: {
      const nextValue =
        typeof action.value === "function"
          ? action.value(state[action.field])
          : action.value;
      if (nextValue === state[action.field]) return state;
      return { ...state, [action.field]: nextValue };
    }

    case ACTIONS.SET_MATCH_INFO: {
      const incoming = action.value ?? null;
      if (!incoming) return { ...state, matchInfo: null };
      if (typeof incoming.activeGameIndex === "number") {
        return { ...state, matchInfo: incoming };
      }
      const preservedIndex =
        typeof state.matchInfo?.activeGameIndex === "number"
          ? state.matchInfo.activeGameIndex
          : 0;
      return {
        ...state,
        matchInfo: { ...incoming, activeGameIndex: preservedIndex },
      };
    }

    case ACTIONS.SET_ACTIVE_GAME_INDEX: {
      if (!state.matchInfo?.games) return state;
      const maxIndex = state.matchInfo.games.length - 1;
      const clampedIndex = Math.max(
        0,
        Math.min(maxIndex, action.value)
      );
      return {
        ...state,
        matchInfo: { ...state.matchInfo, activeGameIndex: clampedIndex },
      };
    }

    case ACTIONS.SET_TICKER_OVERRIDE:
      return {
        ...state,
        tickerOverrides: {
          ...state.tickerOverrides,
          [action.key]: action.value,
        },
      };

    case ACTIONS.RESET_TICKER_OVERRIDES:
      return { ...state, tickerOverrides: { ...DEFAULT_TICKER_OVERRIDES } };

    case ACTIONS.SET_LOGO_SCALE:
      return { ...state, logoScale: clampLogoScale(action.value) };

    case ACTIONS.SET_TEAM_LOGO_SCALE:
      return { ...state, teamLogoScale: clampTeamLogoScale(action.value) };

    case ACTIONS.APPLY_SYNC: {
      const p = action.payload ?? {};
      const next = { ...state };

      // Match data
      if (p.matchInfo !== undefined) {
        const incoming = p.matchInfo ?? null;
        if (!incoming) {
          next.matchInfo = null;
        } else if (typeof incoming.activeGameIndex === "number") {
          next.matchInfo = incoming;
        } else {
          const preservedIndex =
            typeof state.matchInfo?.activeGameIndex === "number"
              ? state.matchInfo.activeGameIndex
              : 0;
          next.matchInfo = { ...incoming, activeGameIndex: preservedIndex };
        }
      }
      if (p.gamesPayload !== undefined) next.gamesPayload = p.gamesPayload;
      if (p.teamsPayload !== undefined) next.teamsPayload = p.teamsPayload;
      if (p.teamsMeta !== undefined) next.teamsMeta = p.teamsMeta ?? null;
      if (p.matchIdInput !== undefined)
        next.matchIdInput = p.matchIdInput ?? "";
      if (p.activeMatchId !== undefined)
        next.activeMatchId = p.activeMatchId ?? "";
      if (p.matchError !== undefined) next.matchError = p.matchError ?? null;
      if (p.matchLoading !== undefined) next.matchLoading = !!p.matchLoading;

      // Colors
      if (p.primaryColor !== undefined)
        next.primaryColor = p.primaryColor ?? DEFAULT_PRIMARY;
      if (p.secondaryColor !== undefined)
        next.secondaryColor = p.secondaryColor ?? DEFAULT_SECONDARY;
      if (p.scoreBackground !== undefined)
        next.scoreBackground = p.scoreBackground ?? DEFAULT_SCORE_BACKGROUND;
      if (p.badgeBackground !== undefined)
        next.badgeBackground = p.badgeBackground ?? DEFAULT_BADGE_BACKGROUND;
      if (p.tickerBackground !== undefined)
        next.tickerBackground = p.tickerBackground ?? DEFAULT_TICKER_BACKGROUND;
      if (p.tickerBackgroundTransparent !== undefined)
        next.tickerBackgroundTransparent = !!p.tickerBackgroundTransparent;
      if (p.manualTextColorEnabled !== undefined)
        next.manualTextColorEnabled = !!p.manualTextColorEnabled;
      if (p.manualTextColor !== undefined)
        next.manualTextColor = p.manualTextColor ?? DEFAULT_TEXT_COLOR;

      // Display options
      if (p.showBorder !== undefined) next.showBorder = !!p.showBorder;
      if (p.useFullAssociationName !== undefined)
        next.useFullAssociationName = !!p.useFullAssociationName;

      // Logo
      if (p.logoImage !== undefined) next.logoImage = p.logoImage ?? null;
      if (p.logoTransparentBackground !== undefined)
        next.logoTransparentBackground = !!p.logoTransparentBackground;
      if (p.logoTextHidden !== undefined)
        next.logoTextHidden = !!p.logoTextHidden;
      if (p.logoPosition !== undefined)
        next.logoPosition = normalizeLogoPosition(p.logoPosition);
      if (p.logoScale !== undefined)
        next.logoScale = clampLogoScale(p.logoScale);
      if (p.teamLogoScale !== undefined)
        next.teamLogoScale = clampTeamLogoScale(p.teamLogoScale);

      // Overrides
      if (p.tickerOverrides !== undefined)
        next.tickerOverrides = normalizeOverrides(p.tickerOverrides);

      return next;
    }

    default:
      return state;
  }
}

/* ── Initial state builder ─────────────────────────────────────────────────── */
function buildInitialState(sharedState, defaultMatchId) {
  const storedTheme = loadStoredTheme();

  const pick = (key, fallback) => {
    if (
      sharedState &&
      Object.prototype.hasOwnProperty.call(sharedState, key)
    ) {
      return sharedState[key];
    }
    return fallback;
  };

  // Special handling for manualTextColor (legacy hex → HSL migration)
  let manualTextColor;
  if (
    sharedState &&
    Object.prototype.hasOwnProperty.call(sharedState, "manualTextColor")
  ) {
    manualTextColor = sharedState.manualTextColor ?? DEFAULT_TEXT_COLOR;
  } else {
    const manual = storedTheme?.manualTextColor;
    if (!manual) {
      manualTextColor = DEFAULT_TEXT_COLOR;
    } else if (typeof manual === "string") {
      manualTextColor = hexToHsl(manual) ?? DEFAULT_TEXT_COLOR;
    } else {
      manualTextColor = manual;
    }
  }

  return {
    // Match data
    matchInfo: null,
    gamesPayload: null,
    teamsPayload: null,
    teamsMeta: null,
    matchIdInput: pick("matchIdInput", defaultMatchId),
    activeMatchId: pick("activeMatchId", defaultMatchId),
    matchError: null,
    matchLoading: false,
    liveUpdatesConnected: false,

    // Colors
    primaryColor: pick(
      "primaryColor",
      storedTheme?.primaryColor ?? DEFAULT_PRIMARY
    ),
    secondaryColor: pick(
      "secondaryColor",
      storedTheme?.secondaryColor ?? DEFAULT_SECONDARY
    ),
    scoreBackground: pick(
      "scoreBackground",
      storedTheme?.scoreBackground ?? DEFAULT_SCORE_BACKGROUND
    ),
    badgeBackground: pick(
      "badgeBackground",
      storedTheme?.badgeBackground ?? DEFAULT_BADGE_BACKGROUND
    ),
    tickerBackground: pick(
      "tickerBackground",
      storedTheme?.tickerBackground ?? DEFAULT_TICKER_BACKGROUND
    ),
    tickerBackgroundTransparent: !!pick(
      "tickerBackgroundTransparent",
      storedTheme?.tickerBackgroundTransparent ?? false
    ),
    manualTextColorEnabled: !!pick(
      "manualTextColorEnabled",
      storedTheme?.manualTextColorEnabled ?? false
    ),
    manualTextColor,

    // Display options
    showBorder: !!pick("showBorder", storedTheme?.showBorder ?? false),
    useFullAssociationName: !!pick(
      "useFullAssociationName",
      storedTheme?.useFullAssociationName ?? false
    ),

    // Logo
    logoImage: pick("logoImage", storedTheme?.logoImage ?? null),
    logoTransparentBackground: !!pick(
      "logoTransparentBackground",
      storedTheme?.logoTransparentBackground ?? false
    ),
    logoTextHidden: !!pick(
      "logoTextHidden",
      storedTheme?.logoTextHidden ?? false
    ),
    logoPosition: normalizeLogoPosition(
      pick("logoPosition", storedTheme?.logoPosition)
    ),
    logoScale: clampLogoScale(
      pick("logoScale", storedTheme?.logoScale ?? DEFAULT_LOGO_SCALE)
    ),
    teamLogoScale: clampTeamLogoScale(
      pick(
        "teamLogoScale",
        storedTheme?.teamLogoScale ?? DEFAULT_TEAM_LOGO_SCALE
      )
    ),

    // Overrides
    tickerOverrides: normalizeOverrides(
      pick("tickerOverrides", storedTheme?.tickerOverrides)
    ),
  };
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */
export default function useTickerState(sharedState, defaultMatchId) {
  const [state, dispatch] = useReducer(
    tickerReducer,
    { sharedState, defaultMatchId },
    ({ sharedState: s, defaultMatchId: d }) => buildInitialState(s, d)
  );

  /** Convenience: set a single top-level field. */
  const setField = useCallback(
    (field, value) => dispatch({ type: ACTIONS.SET_FIELD, field, value }),
    []
  );

  /** Build a plain object snapshot suitable for sync/persistence. */
  const buildPayload = useCallback(
    () => ({
      matchInfo: state.matchInfo,
      gamesPayload: state.gamesPayload,
      teamsPayload: state.teamsPayload,
      teamsMeta: state.teamsMeta,
      matchIdInput: state.matchIdInput,
      activeMatchId: state.activeMatchId,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      scoreBackground: state.scoreBackground,
      badgeBackground: state.badgeBackground,
      tickerBackground: state.tickerBackground,
      tickerBackgroundTransparent: state.tickerBackgroundTransparent,
      manualTextColorEnabled: state.manualTextColorEnabled,
      manualTextColor: state.manualTextColor,
      showBorder: state.showBorder,
      useFullAssociationName: state.useFullAssociationName,
      matchError: state.matchError,
      matchLoading: state.matchLoading,
      logoImage: state.logoImage,
      logoTransparentBackground: state.logoTransparentBackground,
      logoTextHidden: state.logoTextHidden,
      logoPosition: state.logoPosition,
      logoScale: state.logoScale,
      teamLogoScale: state.teamLogoScale,
      tickerOverrides: state.tickerOverrides,
    }),
    [state]
  );

  /** Persist the theme-related slice to localStorage. */
  const persistTheme = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          primaryColor: state.primaryColor,
          secondaryColor: state.secondaryColor,
          scoreBackground: state.scoreBackground,
          badgeBackground: state.badgeBackground,
          tickerBackground: state.tickerBackground,
          tickerBackgroundTransparent: state.tickerBackgroundTransparent,
          manualTextColorEnabled: state.manualTextColorEnabled,
          manualTextColor: state.manualTextColor,
          showBorder: state.showBorder,
          useFullAssociationName: state.useFullAssociationName,
          logoImage: state.logoImage,
          logoTransparentBackground: state.logoTransparentBackground,
          logoTextHidden: state.logoTextHidden,
          logoPosition: state.logoPosition,
          logoScale: state.logoScale,
          teamLogoScale: state.teamLogoScale,
          tickerOverrides: state.tickerOverrides,
        })
      );
    } catch (error) {
      console.warn("Failed to persist ticker theme", error);
    }
  }, [state]);

  /** The list of theme-related keys — used by App to trigger persistence. */
  const themeFingerprint = useMemo(
    () =>
      JSON.stringify([
        state.primaryColor,
        state.secondaryColor,
        state.scoreBackground,
        state.badgeBackground,
        state.tickerBackground,
        state.tickerBackgroundTransparent,
        state.manualTextColorEnabled,
        state.manualTextColor,
        state.showBorder,
        state.useFullAssociationName,
        state.logoImage,
        state.logoTransparentBackground,
        state.logoTextHidden,
        state.logoPosition,
        state.logoScale,
        state.teamLogoScale,
        state.tickerOverrides,
      ]),
    [
      state.primaryColor,
      state.secondaryColor,
      state.scoreBackground,
      state.badgeBackground,
      state.tickerBackground,
      state.tickerBackgroundTransparent,
      state.manualTextColorEnabled,
      state.manualTextColor,
      state.showBorder,
      state.useFullAssociationName,
      state.logoImage,
      state.logoTransparentBackground,
      state.logoTextHidden,
      state.logoPosition,
      state.logoScale,
      state.teamLogoScale,
      state.tickerOverrides,
    ]
  );

  return {
    state,
    dispatch,
    setField,
    buildPayload,
    persistTheme,
    themeFingerprint,
    ACTIONS,
  };
}
