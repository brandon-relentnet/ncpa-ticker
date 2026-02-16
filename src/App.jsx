import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import "./App.css";
import useAppConfig from "./hooks/useAppConfig";
import useTickerState, { ACTIONS } from "./hooks/useTickerState";
import AdminPage from "./pages/Admin";
import HomePage from "./pages/Home";
import SettingsPage from "./pages/Settings";
import TickerPage from "./pages/Ticker";
import { buildMatchInfo, fetchMatchBundle } from "./utils/matchService";
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

const SYNC_STORAGE_KEY = "pickleball-ticker-sync";
const LIVE_UPDATES_ERROR = "Live updates unavailable. Retrying…";

const parseTimestamp = (value) => {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
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
        if (item instanceof Event || item instanceof PointerEvent) return undefined;
        if (typeof item.tagName === "string" && typeof item.cloneNode === "function") return undefined;
      }
    }
    if (typeof item === "function") return undefined;
    return item;
  };

  try {
    return JSON.parse(JSON.stringify(value, replacer));
  } catch (error) {
    console.warn("Failed to serialize sync payload", error);
    return {};
  }
};

export default function App() {
  const { config: appConfig } = useAppConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const isTickerRoute = location.pathname.startsWith("/ticker");
  const isOnSyncPage =
    location.pathname === "/settings" || location.pathname === "/ticker";

  /* ── Sync token bootstrapping ──────────────────────────────────────────── */
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
  const defaultMatchId = appConfig.defaultMatchId || "5092";

  /* ── Ticker state (useReducer) ─────────────────────────────────────────── */
  const {
    state: ticker,
    dispatch,
    setField,
    buildPayload,
    persistTheme,
    themeFingerprint,
  } = useTickerState(initialSharedState, defaultMatchId);

  /* ── Tab identity ──────────────────────────────────────────────────────── */
  const tabId = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `tab-${Math.random().toString(36).slice(2)}`;
  }, []);

  /* ── Skip-sync guard ───────────────────────────────────────────────────── */
  const skipSyncRef = useRef(false);
  const releaseSyncSkip = useCallback(() => {
    if (typeof window === "undefined") {
      skipSyncRef.current = false;
      return;
    }
    const scheduler =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (cb) => window.setTimeout(cb, 0);
    scheduler(() => {
      skipSyncRef.current = false;
    });
  }, []);

  /* ── Refs for live-update callbacks ────────────────────────────────────── */
  const matchSocketRef = useRef(null);
  const teamsMetaRef = useRef(null);
  const teamsPayloadRef = useRef(null);
  const latestSyncPayloadRef = useRef(null);
  const remoteSyncStateRef = useRef({ lastUpdate: "" });
  const pendingSyncBroadcastRef = useRef(null);

  /* ── Sync timestamps ───────────────────────────────────────────────────── */
  const syncTimestampsRef = useRef({ localUpdatedAt: 0, lastRemoteAppliedAt: 0 });

  const markLocalUpdate = useCallback(() => {
    syncTimestampsRef.current.localUpdatedAt = Date.now();
  }, []);

  const shouldApplyRemoteState = useCallback((remoteUpdatedAt) => {
    const remoteTimestamp = parseTimestamp(remoteUpdatedAt);
    const { localUpdatedAt, lastRemoteAppliedAt } = syncTimestampsRef.current;
    if (!remoteTimestamp) return localUpdatedAt === 0;
    if (lastRemoteAppliedAt && remoteTimestamp <= lastRemoteAppliedAt) return false;
    if (localUpdatedAt && remoteTimestamp <= localUpdatedAt) return false;
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

  /* ── applySyncPayload shorthand ────────────────────────────────────────── */
  const applySyncPayload = useCallback(
    (payload) => dispatch({ type: ACTIONS.APPLY_SYNC, payload }),
    [dispatch]
  );

  /* ── Match loading ─────────────────────────────────────────────────────── */
  const loadMatch = useCallback(
    async (targetMatchId, { markUpdate = false } = {}) => {
      if (!targetMatchId) {
        setField("matchError", "Enter a match ID to load data");
        return;
      }
      if (markUpdate) markLocalUpdate();

      setField("matchLoading", true);
      setField("matchError", null);

      try {
        const bundle = await fetchMatchBundle(targetMatchId, {
          apiKey: appConfig.ncpaApiKey,
          apiBase: appConfig.ncpaApiBase,
        });
        applySyncPayload({
          matchInfo: bundle.matchInfo,
          gamesPayload: bundle.gamesPayload,
          teamsPayload: bundle.teamsPayload,
          teamsMeta: bundle.teamsMeta,
        });
        if (markUpdate) {
          pendingSyncBroadcastRef.current = { options: undefined };
        }
      } catch (error) {
        setField("matchError", error.message ?? "Failed to load match data");
      } finally {
        setField("matchLoading", false);
      }
    },
    [applySyncPayload, markLocalUpdate, setField, appConfig.ncpaApiKey, appConfig.ncpaApiBase]
  );

  useEffect(() => {
    if (skipSyncRef.current) return;
    loadMatch(ticker.activeMatchId);
  }, [ticker.activeMatchId, loadMatch]);

  /* ── Match ID handlers ─────────────────────────────────────────────────── */
  const handleMatchIdInputChange = (value) => setField("matchIdInput", value);

  const handleApplyMatchId = () => {
    const trimmed = ticker.matchIdInput.trim();
    if (!trimmed) {
      setField("matchError", "Match ID cannot be empty");
      return;
    }
    if (trimmed === ticker.activeMatchId) {
      loadMatch(trimmed, { markUpdate: true });
    } else {
      markLocalUpdate();
      setField("activeMatchId", trimmed);
    }
  };

  const handleReloadMatch = () => loadMatch(ticker.activeMatchId, { markUpdate: true });

  const handleActiveGameIndexChange = (nextIndex) =>
    dispatch({ type: ACTIONS.SET_ACTIVE_GAME_INDEX, value: nextIndex });

  /* ── Keep refs in sync for live-update callbacks ────────────────────────── */
  useEffect(() => {
    if (ticker.teamsMeta?.matchId && ticker.teamsMeta.matchId !== ticker.activeMatchId) {
      teamsMetaRef.current = null;
      return;
    }
    teamsMetaRef.current = ticker.teamsMeta;
  }, [ticker.teamsMeta, ticker.activeMatchId]);

  useEffect(() => {
    if (ticker.teamsPayload) {
      teamsPayloadRef.current = { matchId: ticker.activeMatchId, data: ticker.teamsPayload };
    } else {
      teamsPayloadRef.current = null;
    }
  }, [ticker.teamsPayload, ticker.activeMatchId]);

  /* ── Sync payload ref ──────────────────────────────────────────────────── */
  useEffect(() => {
    latestSyncPayloadRef.current = buildPayload();
  }, [buildPayload]);

  /* ── Share token ───────────────────────────────────────────────────────── */
  const storedShareIdRef = useRef(null);
  if (storedShareIdRef.current === null) {
    storedShareIdRef.current = loadShareIdFromStorage();
  }

  const [shareToken, setShareToken] = useState(() => {
    const tokenFromUrl = initialSyncTokenRef.current;
    const legacyPayload = initialSharedState;
    const storedShareId = storedShareIdRef.current;
    if (tokenFromUrl && !legacyPayload) return tokenFromUrl;
    if (legacyPayload?.syncId) return legacyPayload.syncId;
    if (storedShareId) return storedShareId;
    return generateSyncId();
  });

  // Keep a ref in sync so callbacks can read the current value without
  // needing shareToken in their dependency array.
  const shareTokenRef = useRef(shareToken);
  shareTokenRef.current = shareToken;

  /* ── Send sync payload ─────────────────────────────────────────────────── */
  const sendSyncPayload = useCallback(
    (payload, { skipLocalMark = false } = {}) => {
      if (typeof window === "undefined") return;
      if (!payload || typeof payload !== "object") return;
      if (!skipLocalMark) markLocalUpdate();

      const plainPayload = toPlainSyncPayload(payload);
      latestSyncPayloadRef.current = plainPayload;

      const currentShareToken = shareTokenRef.current;
      if (!currentShareToken) return;

      pushSyncState({ syncId: currentShareToken, payload: plainPayload })
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
    [markLocalUpdate, noteRemoteApplied, tabId]
  );

  const handleApplyTickerUpdate = useCallback(
    (overrides = {}, options) => {
      if (typeof window === "undefined") return;
      const basePayload = buildPayload();
      const payload = { ...basePayload, ...overrides };
      sendSyncPayload(payload, options);
    },
    [buildPayload, sendSyncPayload]
  );

  /* ── Pending sync broadcast (after live game update settles) ────────────── */
  useEffect(() => {
    if (!pendingSyncBroadcastRef.current) return;
    const { options } = pendingSyncBroadcastRef.current;
    pendingSyncBroadcastRef.current = null;
    handleApplyTickerUpdate({}, options);
  }, [ticker.matchInfo, ticker.gamesPayload, handleApplyTickerUpdate]);

  /* ── Live match socket ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!ticker.activeMatchId) {
      setField("liveUpdatesConnected", false);
      return undefined;
    }

    if (matchSocketRef.current) {
      matchSocketRef.current.dispose();
      matchSocketRef.current = null;
    }

    let disposed = false;
    setField("liveUpdatesConnected", false);

    try {
      const handle = createMatchSocket({
        matchId: ticker.activeMatchId,
        socketUrl: appConfig.ncpaSocketUrl,
        apiKey: appConfig.ncpaApiKey,
        onConnect: () => {
          if (disposed) return;
          setField("liveUpdatesConnected", true);
          setField("matchError", (prev) =>
            prev === LIVE_UPDATES_ERROR ? null : prev
          );
        },
        onDisconnect: ({ reason }) => {
          if (disposed) return;
          if (reason !== "transport error") setField("liveUpdatesConnected", false);
        },
        onError: (error) => {
          if (disposed) return;
          console.warn("Match socket error", error);
          setField("liveUpdatesConnected", false);
          setField("matchError", (prev) => {
            if (prev && prev !== LIVE_UPDATES_ERROR) return prev;
            return LIVE_UPDATES_ERROR;
          });
        },
        onGamesUpdate: (payload) => {
          if (disposed || !payload) return;

          const normalizedGamesPayload = (() => {
            if (!payload || typeof payload !== "object") return { success: false };
            const rawInfo =
              payload.info && typeof payload.info === "object"
                ? payload.info
                : payload;
            return { success: true, info: cloneGamesInfo(rawInfo) };
          })();

          setField("gamesPayload", normalizedGamesPayload);

          try {
            const teamsMetaForMatch =
              teamsMetaRef.current?.matchId === ticker.activeMatchId
                ? teamsMetaRef.current
                : null;
            const teamsPayloadForMatch =
              teamsPayloadRef.current?.matchId === ticker.activeMatchId
                ? teamsPayloadRef.current.data
                : null;
            const { matchInfo: nextMatchInfo, teamsMeta: nextTeamsMeta } =
              buildMatchInfo({
                matchId: ticker.activeMatchId,
                gamesPayload: normalizedGamesPayload,
                teamsMeta: teamsMetaForMatch,
                teamsPayload: teamsPayloadForMatch,
              });

            dispatch({ type: ACTIONS.SET_MATCH_INFO, value: nextMatchInfo });
            if (nextTeamsMeta && nextTeamsMeta !== teamsMetaRef.current) {
              setField("teamsMeta", nextTeamsMeta);
            }

            const basePayload = latestSyncPayloadRef.current ?? {};
            const payloadForSync = {
              ...basePayload,
              matchInfo: nextMatchInfo,
              gamesPayload: normalizedGamesPayload,
            };
            if (nextTeamsMeta) payloadForSync.teamsMeta = nextTeamsMeta;
            if (teamsPayloadForMatch) payloadForSync.teamsPayload = teamsPayloadForMatch;
            latestSyncPayloadRef.current = payloadForSync;
            pendingSyncBroadcastRef.current = { options: { skipLocalMark: true } };
          } catch (error) {
            console.warn("Failed to apply live game update", error);
          }
        },
      });

      matchSocketRef.current = handle;
    } catch (error) {
      console.warn("Failed to initialize live updates", error);
      setField("matchError", (prev) => {
        if (prev && prev !== LIVE_UPDATES_ERROR) return prev;
        return LIVE_UPDATES_ERROR;
      });
    }

    return () => {
      disposed = true;
      setField("liveUpdatesConnected", false);
      if (matchSocketRef.current) {
        matchSocketRef.current.dispose();
        matchSocketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker.activeMatchId, sendSyncPayload, appConfig.ncpaSocketUrl, appConfig.ncpaApiKey]);

  const syncTokenFromUrl = useMemo(
    () => extractSyncTokenFromSearch(location.search),
    [location.search]
  );

  const updateSyncParam = useCallback(
    (token) => {
      const params = new URLSearchParams(location.search);
      if (token) params.set(SYNC_QUERY_PARAM, token);
      else params.delete(SYNC_QUERY_PARAM);
      const nextSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  /* ── URL ↔ shareToken sync ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!shareToken) return;
    persistShareId(shareToken);
    if (isOnSyncPage && !syncTokenFromUrl) updateSyncParam(shareToken);
  }, [shareToken, syncTokenFromUrl, updateSyncParam, isOnSyncPage]);

  useEffect(() => {
    if (!syncTokenFromUrl || syncTokenFromUrl === shareToken) return;
    setShareToken(syncTokenFromUrl);
  }, [syncTokenFromUrl, shareToken]);

  /* ── Slug rename listener ──────────────────────────────────────────────── */
  useEffect(() => {
    const unsubscribe = onSlugChange(({ oldId, newId }) => {
      if (shareToken !== oldId) return;
      setShareToken(newId);
      persistShareId(newId);
      updateSyncParam(newId);
    });
    return unsubscribe;
  }, [shareToken, updateSyncParam]);

  /* ── Apply initial shared state ────────────────────────────────────────── */
  const initialPayloadAppliedRef = useRef(false);
  useEffect(() => {
    if (initialPayloadAppliedRef.current || !initialSharedState) return;
    initialPayloadAppliedRef.current = true;
    skipSyncRef.current = true;
    applySyncPayload(initialSharedState);
    releaseSyncSkip();
  }, [initialSharedState, applySyncPayload, releaseSyncSkip]);

  /* ── Initial remote fetch ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!shareToken || !isOnSyncPage) return;
    if (syncTokenFromUrl && syncTokenFromUrl !== shareToken) return;

    fetchSyncState(shareToken)
      .then((result) => {
        if (!result?.payload) {
          const payload = toPlainSyncPayload(
            latestSyncPayloadRef.current ?? buildPayload()
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
            ticker.activeMatchId;
          if (nextMatchId) loadMatch(nextMatchId);
        } finally {
          releaseSyncSkip();
        }
      })
      .catch((error) => {
        console.warn("Failed to load remote ticker state", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shareToken,
    syncTokenFromUrl,
    isOnSyncPage,
    ticker.activeMatchId,
    applySyncPayload,
    loadMatch,
    releaseSyncSkip,
    shouldApplyRemoteState,
    noteRemoteApplied,
  ]);

  /* ── Polling loop ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!shareToken || !isOnSyncPage || typeof window === "undefined") return undefined;
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
        if (!cancelled) timeoutId = window.setTimeout(poll, 1500);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
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

  /* ── Cross-tab localStorage sync ───────────────────────────────────────── */
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
    return () => window.removeEventListener("storage", handleStorage);
  }, [applySyncPayload, releaseSyncSkip, tabId]);

  /* ── Persist theme to localStorage ─────────────────────────────────────── */
  useEffect(() => {
    persistTheme();
  }, [themeFingerprint, persistTheme]);

  /* ── Derived values ────────────────────────────────────────────────────── */
  const tickerShareSearch = shareToken
    ? `?${SYNC_QUERY_PARAM}=${encodeURIComponent(shareToken)}`
    : "";

  const tickerShareUrl = useMemo(() => {
    const path = `/ticker${tickerShareSearch}`;
    if (typeof window === "undefined") return path;
    try {
      return new URL(path, window.location.origin).toString();
    } catch (error) {
      console.warn("Failed to build ticker share URL", error);
      return path;
    }
  }, [tickerShareSearch]);

  const appClassName = isTickerRoute
    ? "min-h-screen"
    : "min-h-screen bg-slate-950 text-slate-100";

  const requiresSyncRedirect =
    (location.pathname === "/settings" || location.pathname === "/ticker") &&
    !syncTokenFromUrl;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <MotionConfig reducedMotion="user">
    <div className={appClassName}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/settings"
          element={
            requiresSyncRedirect ? (
              <Navigate to="/" replace />
            ) : (
              <SettingsPage
                ticker={ticker}
                dispatch={dispatch}
                onMatchIdInputChange={handleMatchIdInputChange}
                onApplyMatchId={handleApplyMatchId}
                onReloadMatch={handleReloadMatch}
                onActiveGameIndexChange={handleActiveGameIndexChange}
                onApplyTickerUpdate={handleApplyTickerUpdate}
                tickerShareSearch={tickerShareSearch}
                tickerShareUrl={tickerShareUrl}
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
                matchInfo={ticker.matchInfo}
                primaryColor={ticker.primaryColor}
                secondaryColor={ticker.secondaryColor}
                scoreBackground={ticker.scoreBackground}
                badgeBackground={ticker.badgeBackground}
                showBorder={ticker.showBorder}
                manualTextColor={
                  ticker.manualTextColorEnabled ? ticker.manualTextColor : null
                }
                tickerBackground={ticker.tickerBackground}
                tickerBackgroundTransparent={ticker.tickerBackgroundTransparent}
                useFullAssociationName={ticker.useFullAssociationName}
                logoImage={ticker.logoImage}
                logoTransparentBackground={ticker.logoTransparentBackground}
                logoTextHidden={ticker.logoTextHidden}
                logoPosition={ticker.logoPosition}
                logoScale={ticker.logoScale}
                teamLogoScale={ticker.teamLogoScale}
                tickerOverrides={ticker.tickerOverrides}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </MotionConfig>
  );
}
