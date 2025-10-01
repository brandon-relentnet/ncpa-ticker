import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
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
import { fetchMatchBundle } from "./utils/matchService";
import { DEFAULT_LOGO_POSITION, normalizeLogoPosition } from "./utils/logo";

const STORAGE_KEY = "pickleball-ticker-theme";
const SYNC_STORAGE_KEY = "pickleball-ticker-sync";

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

const NAV_LINKS = [
  { to: "/settings", label: "Settings", external: false },
  { to: "/ticker", label: "Ticker", external: true },
];

export default function App() {
  const location = useLocation();
  const isTickerRoute = location.pathname.startsWith("/ticker");

  const storedTheme = useMemo(loadStoredTheme, []);

  const defaultMatchId = import.meta.env.VITE_DEFAULT_MATCH_ID ?? "5092";
  const tabId = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `tab-${Math.random().toString(36).slice(2)}`;
  }, []);

  const [matchIdInput, setMatchIdInput] = useState(defaultMatchId);
  const [activeMatchId, setActiveMatchId] = useState(defaultMatchId);
  const [matchInfo, setMatchInfo] = useState(null);
  const [gamesPayload, setGamesPayload] = useState(null);
  const [teamsPayload, setTeamsPayload] = useState(null);
  const [matchError, setMatchError] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const skipSyncRef = useRef(false);

  const applySyncPayload = useCallback((payload = {}) => {
    if (payload.matchInfo !== undefined) setMatchInfo(payload.matchInfo);
    if (payload.gamesPayload !== undefined)
      setGamesPayload(payload.gamesPayload);
    if (payload.teamsPayload !== undefined)
      setTeamsPayload(payload.teamsPayload);
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
    async (targetMatchId) => {
      if (!targetMatchId) {
        setMatchError("Enter a match ID to load data");
        return;
      }

      setMatchLoading(true);
      setMatchError(null);

      try {
        const bundle = await fetchMatchBundle(targetMatchId);
        applySyncPayload({
          matchInfo: bundle.matchInfo,
          gamesPayload: bundle.gamesPayload,
          teamsPayload: bundle.teamsPayload,
        });
      } catch (error) {
        setMatchError(error.message ?? "Failed to load match data");
      } finally {
        setMatchLoading(false);
      }
    },
    [applySyncPayload]
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
      loadMatch(trimmed);
    } else {
      setActiveMatchId(trimmed);
    }
  };

  const handleReloadMatch = () => {
    loadMatch(activeMatchId);
  };

  const [primaryColor, setPrimaryColor] = useState(
    storedTheme?.primaryColor ?? DEFAULT_PRIMARY
  );
  const [secondaryColor, setSecondaryColor] = useState(
    storedTheme?.secondaryColor ?? DEFAULT_SECONDARY
  );
  const [scoreBackground, setScoreBackground] = useState(
    storedTheme?.scoreBackground ?? DEFAULT_SCORE_BACKGROUND
  );
  const [badgeBackground, setBadgeBackground] = useState(
    storedTheme?.badgeBackground ?? DEFAULT_BADGE_BACKGROUND
  );
  const [tickerBackground, setTickerBackground] = useState(
    storedTheme?.tickerBackground ?? DEFAULT_TICKER_BACKGROUND
  );
  const [manualTextColorEnabled, setManualTextColorEnabled] = useState(
    storedTheme?.manualTextColorEnabled ?? false
  );
  const initialManualTextColor = useMemo(() => {
    const manual = storedTheme?.manualTextColor;
    if (!manual) return DEFAULT_TEXT_COLOR;
    if (typeof manual === "string") {
      return hexToHsl(manual) ?? DEFAULT_TEXT_COLOR;
    }
    return manual;
  }, [storedTheme]);
  const initialLogoPosition = useMemo(
    () => normalizeLogoPosition(storedTheme?.logoPosition),
    [storedTheme]
  );

  const [manualTextColor, setManualTextColor] = useState(
    initialManualTextColor
  );
  const [showBorder, setShowBorder] = useState(
    storedTheme?.showBorder ?? false
  );
  const [useFullAssociationName, setUseFullAssociationName] = useState(
    storedTheme?.useFullAssociationName ?? false
  );
  const [logoImage, setLogoImage] = useState(storedTheme?.logoImage ?? null);
  const [logoTransparentBackground, setLogoTransparentBackground] = useState(
    storedTheme?.logoTransparentBackground ?? false
  );
  const [logoTextHidden, setLogoTextHidden] = useState(
    storedTheme?.logoTextHidden ?? false
  );
  const [logoPosition, setLogoPosition] = useState(initialLogoPosition);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStorage = (event) => {
      if (event.key !== SYNC_STORAGE_KEY || !event.newValue) return;

      try {
        const message = JSON.parse(event.newValue);
        if (!message || message.sourceId === tabId) return;

        skipSyncRef.current = true;
        applySyncPayload(message.payload ?? {});

        requestAnimationFrame(() => {
          skipSyncRef.current = false;
        });
      } catch (error) {
        console.warn("Failed to apply shared ticker state", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [applySyncPayload, tabId]);

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
  ]);

  const appClassName = isTickerRoute
    ? "min-h-screen"
    : "min-h-screen bg-slate-950 text-slate-100";

  const navLinkBaseClasses =
    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-lime-300";

  const handleApplyTickerUpdate = () => {
    if (typeof window === "undefined") return;

    const payload = {
      matchInfo,
      gamesPayload,
      teamsPayload,
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
    };

    try {
      window.localStorage.setItem(
        SYNC_STORAGE_KEY,
        JSON.stringify({
          sourceId: tabId,
          timestamp: Date.now(),
          payload,
        })
      );
    } catch (error) {
      console.warn("Failed to broadcast ticker update", error);
    }
  };

  return (
    <div className={appClassName}>
      <Routes>
        <Route
          path="/settings"
          element={
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
              onApplyTickerUpdate={handleApplyTickerUpdate}
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
            />
          }
        />
        <Route
          path="/ticker"
          element={
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
            />
          }
        />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    </div>
  );
}
