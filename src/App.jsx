import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import HomePage from "./pages/Home";
import SettingsPage from "./pages/Settings";
import TickerPage from "./pages/Ticker";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  DEFAULT_SCORE_BACKGROUND,
  DEFAULT_BADGE_BACKGROUND,
  DEFAULT_TICKER_BACKGROUND,
  DEFAULT_TEXT_COLOR,
  hexToHsl,
} from "./utils/colors";
import { buildMatchInfo, fetchMatchBundle } from "./utils/matchService";
import {
  DEFAULT_LOGO_POSITION,
  DEFAULT_LOGO_SCALE,
  DEFAULT_TEAM_LOGO_SCALE,
  normalizeLogoPosition,
} from "./utils/logo";
import { createMatchSocket } from "./utils/matchSocket";
import {
  decodeLegacySyncToken,
  extractSyncTokenFromSearch,
  generateSyncId,
  loadShareIdFromStorage,
  persistShareId,
  SYNC_QUERY_PARAM,
} from "./utils/syncCodec";
import { fetchSyncState, pushSyncState } from "./utils/syncService";
import { onSlugChange } from "./utils/slugBroadcast";

const STORAGE_KEY = "pickleball-ticker-theme";
const SYNC_STORAGE_KEY = "pickleball-ticker-sync";
const LIVE_UPDATES_ERROR = "Live updates unavailable. Retrying…";

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

const DEFAULT_TICKER_OVERRIDES = {
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

const parseTimestamp = (value) => {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneGamesInfo = (value) => {
  if (!value || typeof value !== "object") return {};
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn("Failed to clone games payload with structuredClone", error);
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to clone games payload", error);
    return {};
  }
};

const toPlainSyncPayload = (value) => {
  if (!value || typeof value !== "object") return value;

  const seen = new WeakSet();
  const replacer = (key, item) => {
    if (!item) return item;

    if (typeof item === "object") {
      if (seen.has(item)) return undefined;
      seen.add(item);

      if (typeof window !== "undefined") {
        if (item instanceof Event || item instanceof PointerEvent) {
          return undefined;
        }
        if (typeof item.tagName === "string" && typeof item.cloneNode === "function") {
          return undefined;
        }
      }
    }

    if (typeof item === "function") return undefined;

    return item;
  };

  try {
    const serialized = JSON.stringify(value, replacer);
    return JSON.parse(serialized);
  } catch (error) {
    console.warn("Failed to serialize sync payload", error);
    return {};
  }
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTickerRoute = location.pathname.startsWith("/ticker");
  const isOnSyncPage =
    location.pathname === "/settings" || location.pathname === "/ticker";

  const initialSyncTokenRef = useRef(null);
  if (initialSyncTokenRef.current === null) {
    initialSyncTokenRef.current = extractSyncTokenFromSearch(location.search);
  }

  const initialSharedPayloadRef = useRef(null);
  if (initialSharedPayloadRef.current === null) {
    initialSharedPayloadRef.current = decodeLegacySyncToken(
      initialSyncTokenRef.current
    );
  }

  const initialSharedState = initialSharedPayloadRef.current;

  const storedTheme = useMemo(loadStoredTheme, []);

  const pickShared = (key, fallback) => {
    if (
      initialSharedState &&
      Object.prototype.hasOwnProperty.call(initialSharedState, key)
    ) {
      return initialSharedState[key];
    }
    return fallback;
  };

  const defaultMatchId = import.meta.env.VITE_DEFAULT_MATCH_ID ?? "5092";
  const tabId = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `tab-${Math.random().toString(36).slice(2)}`;
  }, []);

  const [matchIdInput, setMatchIdInput] = useState(() =>
    pickShared("matchIdInput", defaultMatchId)
  );
  const [activeMatchId, setActiveMatchId] = useState(() =>
    pickShared("activeMatchId", defaultMatchId)
  );
  const [matchInfo, setMatchInfo] = useState(null);
  const [gamesPayload, setGamesPayload] = useState(null);
  const [teamsPayload, setTeamsPayload] = useState(null);
  const [teamsMeta, setTeamsMeta] = useState(null);
  const [matchError, setMatchError] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const skipSyncRef = useRef(false);
  const releaseSyncSkip = useCallback(() => {
    if (typeof window === "undefined") {
      skipSyncRef.current = false;
      return;
    }

    const scheduler =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (callback) => window.setTimeout(callback, 0);

    scheduler(() => {
      skipSyncRef.current = false;
    });
  }, []);
  const matchSocketRef = useRef(null);
  const teamsMetaRef = useRef(null);
  const teamsPayloadRef = useRef(null);
  const [liveUpdatesConnected, setLiveUpdatesConnected] = useState(false);
  const latestSyncPayloadRef = useRef(null);
  const remoteSyncStateRef = useRef({ lastUpdate: "" });
  const pendingSyncBroadcastRef = useRef(null);
  const syncTimestampsRef = useRef({
    localUpdatedAt: 0,
    lastRemoteAppliedAt: 0,
  });

  const markLocalUpdate = useCallback(() => {
    syncTimestampsRef.current.localUpdatedAt = Date.now();
  }, []);

  const shouldApplyRemoteState = useCallback((remoteUpdatedAt) => {
    const remoteTimestamp = parseTimestamp(remoteUpdatedAt);
    const { localUpdatedAt, lastRemoteAppliedAt } = syncTimestampsRef.current;

    if (!remoteTimestamp) {
      return localUpdatedAt === 0;
    }

    if (lastRemoteAppliedAt && remoteTimestamp <= lastRemoteAppliedAt) {
      return false;
    }

    if (localUpdatedAt && remoteTimestamp <= localUpdatedAt) {
      return false;
    }

    return true;
  }, []);

  const noteRemoteApplied = useCallback((remoteUpdatedAt) => {
    const remoteTimestamp = parseTimestamp(remoteUpdatedAt);
    const effectiveTimestamp = remoteTimestamp || Date.now();
    syncTimestampsRef.current.lastRemoteAppliedAt = effectiveTimestamp;
    syncTimestampsRef.current.localUpdatedAt = Math.max(
      syncTimestampsRef.current.localUpdatedAt,
      effectiveTimestamp
    );
  }, []);

  const applySyncPayload = useCallback((payload = {}) => {
    if (payload.matchInfo !== undefined) {
      setMatchInfo((previous) => {
        const incoming = payload.matchInfo ?? null;
        if (!incoming) return null;
        if (typeof incoming.activeGameIndex === "number") return incoming;
        const preservedIndex =
          typeof previous?.activeGameIndex === "number"
            ? previous.activeGameIndex
            : 0;
        return { ...incoming, activeGameIndex: preservedIndex };
      });
    }
    if (payload.gamesPayload !== undefined)
      setGamesPayload(payload.gamesPayload);
    if (payload.teamsPayload !== undefined)
      setTeamsPayload(payload.teamsPayload);
    if (payload.teamsMeta !== undefined)
      setTeamsMeta(payload.teamsMeta ?? null);
    if (payload.matchIdInput !== undefined)
      setMatchIdInput(payload.matchIdInput ?? "");
    if (payload.activeMatchId !== undefined)
      setActiveMatchId(payload.activeMatchId ?? "");
    if (payload.primaryColor !== undefined)
      setPrimaryColor(payload.primaryColor ?? DEFAULT_PRIMARY);
    if (payload.secondaryColor !== undefined)
      setSecondaryColor(payload.secondaryColor ?? DEFAULT_SECONDARY);
    if (payload.scoreBackground !== undefined)
      setScoreBackground(payload.scoreBackground ?? DEFAULT_SCORE_BACKGROUND);
    if (payload.badgeBackground !== undefined)
      setBadgeBackground(payload.badgeBackground ?? DEFAULT_BADGE_BACKGROUND);
    if (payload.tickerBackground !== undefined)
      setTickerBackground(
        payload.tickerBackground ?? DEFAULT_TICKER_BACKGROUND
      );
    if (payload.manualTextColorEnabled !== undefined)
      setManualTextColorEnabled(!!payload.manualTextColorEnabled);
    if (payload.manualTextColor !== undefined)
      setManualTextColor(payload.manualTextColor ?? DEFAULT_TEXT_COLOR);
    if (payload.showBorder !== undefined) setShowBorder(!!payload.showBorder);
    if (payload.useFullAssociationName !== undefined)
      setUseFullAssociationName(!!payload.useFullAssociationName);
    if (payload.logoImage !== undefined)
      setLogoImage(payload.logoImage ?? null);
    if (payload.logoTransparentBackground !== undefined)
      setLogoTransparentBackground(!!payload.logoTransparentBackground);
    if (payload.logoTextHidden !== undefined)
      setLogoTextHidden(!!payload.logoTextHidden);
    if (payload.logoPosition !== undefined)
      setLogoPosition(normalizeLogoPosition(payload.logoPosition));
    if (payload.logoScale !== undefined) {
      setLogoScale(clampLogoScale(payload.logoScale));
    }
    if (payload.teamLogoScale !== undefined) {
      setTeamLogoScale(clampTeamLogoScale(payload.teamLogoScale));
    }
    if (payload.tickerOverrides !== undefined) {
      setTickerOverrides(normalizeOverrides(payload.tickerOverrides));
    }
    if (payload.matchError !== undefined)
      setMatchError(payload.matchError ?? null);
    if (payload.matchLoading !== undefined)
      setMatchLoading(!!payload.matchLoading);
  }, []);

  const handleActiveGameIndexChange = (nextIndex) =>
    setMatchInfo((previous) => {
      if (!previous?.games) return previous;
      const maxIndex = previous.games.length - 1;
      const clampedIndex = Math.max(0, Math.min(maxIndex, nextIndex));
      return { ...previous, activeGameIndex: clampedIndex };
    });

  const loadMatch = useCallback(
    async (targetMatchId, { markUpdate = false } = {}) => {
      if (!targetMatchId) {
        setMatchError("Enter a match ID to load data");
        return;
      }

      if (markUpdate) {
        markLocalUpdate();
      }

      setMatchLoading(true);
      setMatchError(null);

      try {
        const bundle = await fetchMatchBundle(targetMatchId);
        applySyncPayload({
          matchInfo: bundle.matchInfo,
          gamesPayload: bundle.gamesPayload,
          teamsPayload: bundle.teamsPayload,
          teamsMeta: bundle.teamsMeta,
        });
        if (markUpdate) {
          pendingSyncBroadcastRef.current = {
            options: undefined,
          };
        }
      } catch (error) {
        setMatchError(error.message ?? "Failed to load match data");
      } finally {
        setMatchLoading(false);
      }
    },
    [applySyncPayload, markLocalUpdate]
  );

  useEffect(() => {
    if (skipSyncRef.current) return;
    loadMatch(activeMatchId);
  }, [activeMatchId, loadMatch]);

  const handleMatchIdInputChange = (value) => {
    setMatchIdInput(value);
  };

  const handleApplyMatchId = () => {
    const trimmed = matchIdInput.trim();
    if (!trimmed) {
      setMatchError("Match ID cannot be empty");
      return;
    }
    if (trimmed === activeMatchId) {
      loadMatch(trimmed, { markUpdate: true });
    } else {
      markLocalUpdate();
      setActiveMatchId(trimmed);
    }
  };

  const handleReloadMatch = () => {
    loadMatch(activeMatchId, { markUpdate: true });
  };

  useEffect(() => {
    if (teamsMeta?.matchId && teamsMeta.matchId !== activeMatchId) {
      teamsMetaRef.current = null;
      return;
    }
    teamsMetaRef.current = teamsMeta;
  }, [teamsMeta, activeMatchId]);

  useEffect(() => {
    if (teamsPayload) {
      teamsPayloadRef.current = {
        matchId: activeMatchId,
        data: teamsPayload,
      };
    } else {
      teamsPayloadRef.current = null;
    }
  }, [teamsPayload, activeMatchId]);

  const [primaryColor, setPrimaryColor] = useState(() =>
    pickShared("primaryColor", storedTheme?.primaryColor ?? DEFAULT_PRIMARY)
  );
  const [secondaryColor, setSecondaryColor] = useState(() =>
    pickShared("secondaryColor", storedTheme?.secondaryColor ?? DEFAULT_SECONDARY)
  );
  const [scoreBackground, setScoreBackground] = useState(() =>
    pickShared(
      "scoreBackground",
      storedTheme?.scoreBackground ?? DEFAULT_SCORE_BACKGROUND
    )
  );
  const [badgeBackground, setBadgeBackground] = useState(() =>
    pickShared(
      "badgeBackground",
      storedTheme?.badgeBackground ?? DEFAULT_BADGE_BACKGROUND
    )
  );
  const [tickerBackground, setTickerBackground] = useState(() =>
    pickShared(
      "tickerBackground",
      storedTheme?.tickerBackground ?? DEFAULT_TICKER_BACKGROUND
    )
  );
  const [manualTextColorEnabled, setManualTextColorEnabled] = useState(() =>
    !!pickShared(
      "manualTextColorEnabled",
      storedTheme?.manualTextColorEnabled ?? false
    )
  );
  const [manualTextColor, setManualTextColor] = useState(() => {
    if (
      initialSharedState &&
      Object.prototype.hasOwnProperty.call(
        initialSharedState,
        "manualTextColor"
      )
    ) {
      return initialSharedState.manualTextColor ?? DEFAULT_TEXT_COLOR;
    }
    const manual = storedTheme?.manualTextColor;
    if (!manual) return DEFAULT_TEXT_COLOR;
    if (typeof manual === "string") {
      return hexToHsl(manual) ?? DEFAULT_TEXT_COLOR;
    }
    return manual;
  });
  const [showBorder, setShowBorder] = useState(() =>
    !!pickShared("showBorder", storedTheme?.showBorder ?? false)
  );
  const [useFullAssociationName, setUseFullAssociationName] = useState(() =>
    !!pickShared(
      "useFullAssociationName",
      storedTheme?.useFullAssociationName ?? false
    )
  );
  const [logoImage, setLogoImage] = useState(() =>
    pickShared("logoImage", storedTheme?.logoImage ?? null)
  );
  const [logoTransparentBackground, setLogoTransparentBackground] = useState(
    () =>
      !!pickShared(
        "logoTransparentBackground",
        storedTheme?.logoTransparentBackground ?? false
      )
  );
  const [logoTextHidden, setLogoTextHidden] = useState(() =>
    !!pickShared("logoTextHidden", storedTheme?.logoTextHidden ?? false)
  );
  const [logoPosition, setLogoPosition] = useState(() =>
    normalizeLogoPosition(pickShared("logoPosition", storedTheme?.logoPosition))
  );
  const [logoScale, setLogoScale] = useState(() =>
    clampLogoScale(
      pickShared("logoScale", storedTheme?.logoScale ?? DEFAULT_LOGO_SCALE)
    )
  );
  const [teamLogoScale, setTeamLogoScale] = useState(() =>
    clampTeamLogoScale(
      pickShared(
        "teamLogoScale",
        storedTheme?.teamLogoScale ?? DEFAULT_TEAM_LOGO_SCALE
      )
    )
  );
  const [tickerOverrides, setTickerOverrides] = useState(() =>
    normalizeOverrides(
      pickShared("tickerOverrides", storedTheme?.tickerOverrides)
    )
  );

  const buildCurrentPayload = useCallback(
    () => ({
      matchInfo,
      gamesPayload,
      teamsPayload,
      teamsMeta,
      matchIdInput,
      activeMatchId,
      primaryColor,
      secondaryColor,
      scoreBackground,
      badgeBackground,
      tickerBackground,
      manualTextColorEnabled,
      manualTextColor,
      showBorder,
      useFullAssociationName,
      matchError,
      matchLoading,
      logoImage,
      logoTransparentBackground,
      logoTextHidden,
      logoPosition,
      logoScale,
      teamLogoScale,
      tickerOverrides,
    }),
    [
      matchInfo,
      gamesPayload,
      teamsPayload,
      teamsMeta,
      matchIdInput,
      activeMatchId,
      primaryColor,
      secondaryColor,
      scoreBackground,
      badgeBackground,
      tickerBackground,
      manualTextColorEnabled,
      manualTextColor,
      showBorder,
      useFullAssociationName,
      matchError,
      matchLoading,
      logoImage,
      logoTransparentBackground,
      logoTextHidden,
      logoPosition,
      logoScale,
      teamLogoScale,
      tickerOverrides,
    ]
  );

  useEffect(() => {
    latestSyncPayloadRef.current = buildCurrentPayload();
  }, [buildCurrentPayload]);

  const storedShareIdRef = useRef(null);
  if (storedShareIdRef.current === null) {
    storedShareIdRef.current = loadShareIdFromStorage();
  }

  const [shareToken, setShareToken] = useState(() => {
    const tokenFromUrl = initialSyncTokenRef.current;
    const legacyPayload = initialSharedState;
    const storedShareId = storedShareIdRef.current;

    if (tokenFromUrl && !legacyPayload) {
      return tokenFromUrl;
    }

    if (legacyPayload?.syncId) {
      return legacyPayload.syncId;
    }

    if (storedShareId) {
      return storedShareId;
    }

    return generateSyncId();
  });

  const sendSyncPayload = useCallback(
    (payload, { skipLocalMark = false } = {}) => {
      if (typeof window === "undefined") return;
      if (!payload || typeof payload !== "object") return;

      if (!skipLocalMark) {
        markLocalUpdate();
      }

      const plainPayload = toPlainSyncPayload(payload);
      latestSyncPayloadRef.current = plainPayload;

      let currentShareToken = shareToken;
      if (!currentShareToken) {
        currentShareToken = generateSyncId();
        setShareToken(currentShareToken);
      }

      pushSyncState({
        syncId: currentShareToken,
        payload: plainPayload,
      })
        .then((result) => {
          if (result?.updatedAt) {
            remoteSyncStateRef.current.lastUpdate = result.updatedAt;
            noteRemoteApplied(result.updatedAt);
          }
        })
        .catch((error) => {
          console.warn("Failed to push remote ticker sync update", error);
        });

      try {
        window.localStorage.setItem(
          SYNC_STORAGE_KEY,
          JSON.stringify({
            sourceId: tabId,
            timestamp: Date.now(),
            payload: plainPayload,
          })
        );
      } catch (error) {
        console.warn("Failed to broadcast ticker update", error);
      }
    },
    [
      shareToken,
      setShareToken,
      markLocalUpdate,
      noteRemoteApplied,
      tabId,
    ]
  );

  const handleApplyTickerUpdate = useCallback(
    (overrides = {}, options) => {
      if (typeof window === "undefined") return;
      const basePayload = buildCurrentPayload();
      const payload = { ...basePayload, ...overrides };
      sendSyncPayload(payload, options);
    },
    [buildCurrentPayload, sendSyncPayload]
  );

  useEffect(() => {
    if (!pendingSyncBroadcastRef.current) return;
    const { options } = pendingSyncBroadcastRef.current;
    pendingSyncBroadcastRef.current = null;
    // Trigger after state commits so payload reflects latest data
    handleApplyTickerUpdate({}, options);
  }, [matchInfo, gamesPayload, handleApplyTickerUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!activeMatchId) {
      setLiveUpdatesConnected(false);
      return undefined;
    }

    if (matchSocketRef.current) {
      matchSocketRef.current.dispose();
      matchSocketRef.current = null;
    }

    let disposed = false;
    setLiveUpdatesConnected(false);

    try {
      const handle = createMatchSocket({
        matchId: activeMatchId,
        onConnect: () => {
          if (disposed) return;
          setLiveUpdatesConnected(true);
          setMatchError((previous) =>
            previous === LIVE_UPDATES_ERROR ? null : previous
          );
        },
        onDisconnect: ({ reason }) => {
          if (disposed) return;
          if (reason !== "transport error") {
            setLiveUpdatesConnected(false);
          }
        },
        onError: (error) => {
          if (disposed) return;
          console.warn("Match socket error", error);
          setLiveUpdatesConnected(false);
          setMatchError((previous) => {
            if (previous && previous !== LIVE_UPDATES_ERROR) return previous;
            return LIVE_UPDATES_ERROR;
          });
        },
        onGamesUpdate: (payload) => {
          if (disposed || !payload) return;

          const normalizedGamesPayload = (() => {
            if (!payload || typeof payload !== "object") {
              return { success: false };
            }
            const rawInfo =
              payload.info && typeof payload.info === "object"
                ? payload.info
                : payload;
            return {
              success: true,
              info: cloneGamesInfo(rawInfo),
            };
          })();

          setGamesPayload(normalizedGamesPayload);
          try {
            const teamsMetaForMatch =
              teamsMetaRef.current?.matchId === activeMatchId
                ? teamsMetaRef.current
                : null;
            const teamsPayloadForMatch =
              teamsPayloadRef.current?.matchId === activeMatchId
                ? teamsPayloadRef.current.data
                : null;
            const { matchInfo: nextMatchInfo, teamsMeta: nextTeamsMeta } =
              buildMatchInfo({
                matchId: activeMatchId,
                gamesPayload: normalizedGamesPayload,
                teamsMeta: teamsMetaForMatch,
                teamsPayload: teamsPayloadForMatch,
              });
            let resolvedMatchInfo = null;
            setMatchInfo((previous) => {
              if (!nextMatchInfo) {
                resolvedMatchInfo = null;
                return null;
              }
              if (typeof nextMatchInfo.activeGameIndex === "number") {
                resolvedMatchInfo = nextMatchInfo;
                return nextMatchInfo;
              }
              const preservedIndex =
                typeof previous?.activeGameIndex === "number"
                  ? previous.activeGameIndex
                  : 0;
              const merged = { ...nextMatchInfo, activeGameIndex: preservedIndex };
              resolvedMatchInfo = merged;
              return merged;
            });
            if (nextTeamsMeta && nextTeamsMeta !== teamsMetaRef.current) {
              setTeamsMeta(nextTeamsMeta);
            }
            const basePayload = latestSyncPayloadRef.current ?? {};
            const payloadForSync = {
              ...basePayload,
              matchInfo: resolvedMatchInfo ?? nextMatchInfo,
              gamesPayload: normalizedGamesPayload,
            };
            if (nextTeamsMeta) {
              payloadForSync.teamsMeta = nextTeamsMeta;
            }
            if (teamsPayloadForMatch) {
              payloadForSync.teamsPayload = teamsPayloadForMatch;
            }
            latestSyncPayloadRef.current = payloadForSync;
            pendingSyncBroadcastRef.current = {
              options: { skipLocalMark: true },
            };
          } catch (error) {
            console.warn("Failed to apply live game update", error);
          }
        },
      });

      matchSocketRef.current = handle;
    } catch (error) {
      console.warn("Failed to initialize live updates", error);
      setMatchError((previous) => {
        if (previous && previous !== LIVE_UPDATES_ERROR) return previous;
        return LIVE_UPDATES_ERROR;
      });
    }

    return () => {
      disposed = true;
      setLiveUpdatesConnected(false);
      if (matchSocketRef.current) {
        matchSocketRef.current.dispose();
        matchSocketRef.current = null;
      }
    };
  }, [activeMatchId, sendSyncPayload]);

  const syncTokenFromUrl = useMemo(
    () => extractSyncTokenFromSearch(location.search),
    [location.search]
  );

  const updateSyncParam = useCallback(
    (token) => {
      const params = new URLSearchParams(location.search);
      if (token) {
        params.set(SYNC_QUERY_PARAM, token);
      } else {
        params.delete(SYNC_QUERY_PARAM);
      }
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  useEffect(() => {
    if (!shareToken) return;
    persistShareId(shareToken);
    // Only inject ?sync= when on a sync page AND the URL has no token yet.
    // Never overwrite an existing URL token — the URL is the source of truth
    // when present. This prevents an infinite navigate loop between this
    // effect (state→URL) and the effect below (URL→state).
    if (isOnSyncPage && !syncTokenFromUrl) {
      updateSyncParam(shareToken);
    }
  }, [shareToken, syncTokenFromUrl, updateSyncParam, isOnSyncPage]);

  useEffect(() => {
    if (!syncTokenFromUrl || syncTokenFromUrl === shareToken) return;
    setShareToken(syncTokenFromUrl);
  }, [syncTokenFromUrl, shareToken]);

  // Listen for slug changes broadcast from the dashboard. When a user
  // renames a ticker's slug on the homepage, update this tab's URL and
  // internal state so it keeps syncing with the renamed ticker.
  useEffect(() => {
    const unsubscribe = onSlugChange(({ oldId, newId }) => {
      if (shareToken !== oldId) return;
      setShareToken(newId);
      persistShareId(newId);
      updateSyncParam(newId);
    });
    return unsubscribe;
  }, [shareToken, updateSyncParam]);

  const initialPayloadAppliedRef = useRef(false);
  useEffect(() => {
    if (initialPayloadAppliedRef.current || !initialSharedState) return;
    initialPayloadAppliedRef.current = true;
    skipSyncRef.current = true;
    applySyncPayload(initialSharedState);
    releaseSyncSkip();
  }, [initialSharedState, applySyncPayload, releaseSyncSkip]);

  useEffect(() => {
    if (!shareToken || !isOnSyncPage) return;
    // Wait for Effect A to sync shareToken with the URL token before
    // making any requests — avoids fetching/creating a stale ticker.
    if (syncTokenFromUrl && syncTokenFromUrl !== shareToken) return;

    fetchSyncState(shareToken)
      .then((result) => {
        if (!result?.payload) {
          // Ticker doesn't exist on the server yet (404). Bootstrap the
          // row with the current local state so the polling loop has
          // something to find instead of hammering 404s.
          const payload = toPlainSyncPayload(
            latestSyncPayloadRef.current ?? buildCurrentPayload()
          );
          pushSyncState({ syncId: shareToken, payload }).catch(() => {});
          return;
        }
        if (!shouldApplyRemoteState(result.updatedAt)) return;
        skipSyncRef.current = true;
        try {
          remoteSyncStateRef.current.lastUpdate = result.updatedAt ?? "";
          noteRemoteApplied(result.updatedAt);
          applySyncPayload(result.payload ?? {});
          const nextMatchId =
            result.payload?.activeMatchId ??
            result.payload?.matchIdInput ??
            activeMatchId;
          if (nextMatchId) {
            loadMatch(nextMatchId);
          }
        } finally {
          releaseSyncSkip();
        }
      })
      .catch((error) => {
        console.warn("Failed to load remote ticker state", error);
      });
  },
  // buildCurrentPayload is intentionally omitted — it changes on every state
  // update which would re-fire this fetch constantly. The ref
  // latestSyncPayloadRef is the real source for the bootstrap push.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [
    shareToken,
    syncTokenFromUrl,
    isOnSyncPage,
    activeMatchId,
    applySyncPayload,
    loadMatch,
    releaseSyncSkip,
    shouldApplyRemoteState,
    noteRemoteApplied,
  ]);

  useEffect(() => {
    if (!shareToken || !isOnSyncPage || typeof window === "undefined")
      return undefined;
    if (syncTokenFromUrl && syncTokenFromUrl !== shareToken) return undefined;

    remoteSyncStateRef.current.lastUpdate = "";

    let cancelled = false;
    let timeoutId = 0;

    const poll = async () => {
      if (cancelled) return;

      try {
        const result = await fetchSyncState(shareToken);

        if (result && result.updatedAt) {
          if (result.updatedAt !== remoteSyncStateRef.current.lastUpdate) {
            if (!shouldApplyRemoteState(result.updatedAt)) {
              remoteSyncStateRef.current.lastUpdate = result.updatedAt;
            } else {
              remoteSyncStateRef.current.lastUpdate = result.updatedAt;
              skipSyncRef.current = true;
              noteRemoteApplied(result.updatedAt);
              applySyncPayload(result.payload ?? {});
              releaseSyncSkip();
            }
          }
        }
      } catch (error) {
        console.warn("Failed to poll ticker sync state", error);
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(poll, 1500);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    shareToken,
    syncTokenFromUrl,
    isOnSyncPage,
    applySyncPayload,
    releaseSyncSkip,
    shouldApplyRemoteState,
    noteRemoteApplied,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStorage = (event) => {
      if (event.key !== SYNC_STORAGE_KEY || !event.newValue) return;

      try {
        const message = JSON.parse(event.newValue);
        if (!message || message.sourceId === tabId) return;

        skipSyncRef.current = true;
        applySyncPayload(message.payload ?? {});
        releaseSyncSkip();
      } catch (error) {
        console.warn("Failed to apply shared ticker state", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [applySyncPayload, releaseSyncSkip, tabId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          primaryColor,
          secondaryColor,
          scoreBackground,
          badgeBackground,
          tickerBackground,
          manualTextColorEnabled,
          manualTextColor,
          showBorder,
          useFullAssociationName,
          logoImage,
          logoTransparentBackground,
          logoTextHidden,
          logoPosition,
          logoScale,
          teamLogoScale,
          tickerOverrides,
        })
      );
    } catch (error) {
      console.warn("Failed to persist ticker theme", error);
    }
  }, [
    primaryColor,
    secondaryColor,
    scoreBackground,
    badgeBackground,
    tickerBackground,
    manualTextColorEnabled,
    manualTextColor,
    showBorder,
    useFullAssociationName,
    logoImage,
    logoTransparentBackground,
    logoTextHidden,
    logoPosition,
    logoScale,
    teamLogoScale,
    tickerOverrides,
  ]);

  const tickerShareSearch = shareToken
    ? `?${SYNC_QUERY_PARAM}=${encodeURIComponent(shareToken)}`
    : "";
  const tickerShareUrl = useMemo(() => {
    const path = `/ticker${tickerShareSearch}`;
    if (typeof window === "undefined") return path;
    try {
      const url = new URL(path, window.location.origin);
      return url.toString();
    } catch (error) {
      console.warn("Failed to build ticker share URL", error);
      return path;
    }
  }, [tickerShareSearch]);

  const appClassName = isTickerRoute
    ? "min-h-screen"
    : "min-h-screen bg-slate-950 text-slate-100";

  // Redirect to homepage if /settings or /ticker lack a ?sync= param
  const requiresSyncRedirect =
    (location.pathname === "/settings" || location.pathname === "/ticker") &&
    !syncTokenFromUrl;

  return (
    <div className={appClassName}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/settings"
          element={
            requiresSyncRedirect ? (
              <Navigate to="/" replace />
            ) : (
              <SettingsPage
                matchInfo={matchInfo}
                matchIdInput={matchIdInput}
                activeMatchId={activeMatchId}
                onMatchIdInputChange={handleMatchIdInputChange}
                onApplyMatchId={handleApplyMatchId}
                onReloadMatch={handleReloadMatch}
                onActiveGameIndexChange={handleActiveGameIndexChange}
                matchLoading={matchLoading}
                matchError={matchError}
                liveUpdatesConnected={liveUpdatesConnected}
                onApplyTickerUpdate={handleApplyTickerUpdate}
                tickerShareSearch={tickerShareSearch}
                tickerShareUrl={tickerShareUrl}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                scoreBackground={scoreBackground}
                badgeBackground={badgeBackground}
                setPrimaryColor={setPrimaryColor}
                setSecondaryColor={setSecondaryColor}
                setScoreBackground={setScoreBackground}
                setBadgeBackground={setBadgeBackground}
                tickerBackground={tickerBackground}
                setTickerBackground={setTickerBackground}
                manualTextColor={manualTextColor}
                manualTextColorEnabled={manualTextColorEnabled}
                setManualTextColor={setManualTextColor}
                setManualTextColorEnabled={setManualTextColorEnabled}
                showBorder={showBorder}
                setShowBorder={setShowBorder}
                useFullAssociationName={useFullAssociationName}
                setUseFullAssociationName={setUseFullAssociationName}
                logoImage={logoImage}
                setLogoImage={setLogoImage}
                logoTransparentBackground={logoTransparentBackground}
                setLogoTransparentBackground={setLogoTransparentBackground}
                logoTextHidden={logoTextHidden}
                setLogoTextHidden={setLogoTextHidden}
                logoPosition={logoPosition}
                setLogoPosition={setLogoPosition}
                logoScale={logoScale}
                setLogoScale={(value) => setLogoScale(clampLogoScale(value))}
                teamLogoScale={teamLogoScale}
                setTeamLogoScale={(value) =>
                  setTeamLogoScale(clampTeamLogoScale(value))
                }
                tickerOverrides={tickerOverrides}
                onTickerOverrideChange={(key, value) =>
                  setTickerOverrides((previous) => ({
                    ...previous,
                    [key]: value,
                  }))
                }
                onResetTickerOverrides={() =>
                  setTickerOverrides({ ...DEFAULT_TICKER_OVERRIDES })
                }
              />
            )
          }
        />
        <Route
          path="/ticker"
          element={
            requiresSyncRedirect ? (
              <Navigate to="/" replace />
            ) : (
              <TickerPage
                matchInfo={matchInfo}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                scoreBackground={scoreBackground}
                badgeBackground={badgeBackground}
                showBorder={showBorder}
                manualTextColor={manualTextColorEnabled ? manualTextColor : null}
                tickerBackground={tickerBackground}
                useFullAssociationName={useFullAssociationName}
                logoImage={logoImage}
                logoTransparentBackground={logoTransparentBackground}
                logoTextHidden={logoTextHidden}
                logoPosition={logoPosition}
                logoScale={logoScale}
                teamLogoScale={teamLogoScale}
                tickerOverrides={tickerOverrides}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
