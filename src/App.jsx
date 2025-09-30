import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import match_info, { sampleMatches } from "./DummyData";
import SettingsPage from "./pages/Settings";
import TestingPage from "./pages/Testing";
import TickerPage from "./pages/Ticker";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  DEFAULT_TICKER_BACKGROUND,
  DEFAULT_TEXT_COLOR,
  hexToHsl,
} from "./utils/colors";

const STORAGE_KEY = "pickleball-ticker-theme";

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
  { to: "/testing", label: "Testing", external: false },
  { to: "/ticker", label: "Ticker", external: true },
];

export default function App() {
  const location = useLocation();
  const isTickerRoute = location.pathname.startsWith("/ticker");

  const storedTheme = useMemo(loadStoredTheme, []);

  const cloneMatchInfo = (value) => ({
    ...value,
    games: Array.isArray(value.games)
      ? value.games.map((game) => ({ ...game }))
      : [],
  });

  const [matchInfo, setMatchInfo] = useState(() => cloneMatchInfo(match_info));

  const applyMatchInfo = (value) => setMatchInfo(cloneMatchInfo(value));

  const handleMatchIdChange = (nextMatchId) =>
    setMatchInfo((previous) => ({ ...previous, match_id: nextMatchId }));

  const handleActiveGameIndexChange = (nextIndex) =>
    setMatchInfo((previous) => {
      const maxIndex = previous.games.length - 1;
      const clampedIndex = Math.max(0, Math.min(maxIndex, nextIndex));
      return { ...previous, activeGameIndex: clampedIndex };
    });

  const handleLoadSampleMatch = (targetMatchId) => {
    const sampleMatch = sampleMatches.find(
      (item) => item.match_id === targetMatchId
    );
    if (!sampleMatch) return;

    applyMatchInfo(sampleMatch);
  };

  const [primaryColor, setPrimaryColor] = useState(
    storedTheme?.primaryColor ?? DEFAULT_PRIMARY
  );
  const [secondaryColor, setSecondaryColor] = useState(
    storedTheme?.secondaryColor ?? DEFAULT_SECONDARY
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

  const [manualTextColor, setManualTextColor] = useState(
    initialManualTextColor
  );
  const [showBorder, setShowBorder] = useState(
    storedTheme?.showBorder ?? false
  );
  const [useFullAssociationName, setUseFullAssociationName] = useState(
    storedTheme?.useFullAssociationName ?? true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          primaryColor,
          secondaryColor,
          tickerBackground,
          manualTextColorEnabled,
          manualTextColor,
          showBorder,
          useFullAssociationName,
        })
      );
    } catch (error) {
      console.warn("Failed to persist ticker theme", error);
    }
  }, [
    primaryColor,
    secondaryColor,
    tickerBackground,
    manualTextColorEnabled,
    manualTextColor,
    showBorder,
    useFullAssociationName,
  ]);

  const appClassName = isTickerRoute
    ? "min-h-screen"
    : "min-h-screen bg-slate-950 text-slate-100";

  const navLinkBaseClasses =
    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-lime-300";

  return (
    <div className={appClassName}>
      {!isTickerRoute && (
        <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
            <NavLink
              to="/settings"
              className="text-xl font-semibold text-lime-400"
            >
              Pickleball Ticker
            </NavLink>
            <nav className="flex gap-3">
              {NAV_LINKS.map((link) => {
                if (link.external) {
                  return (
                    <a
                      key={link.to}
                      href={link.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${navLinkBaseClasses} bg-slate-900/60 text-slate-300 hover:bg-slate-900`}
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `${navLinkBaseClasses} ${
                        isActive
                          ? "bg-slate-900 text-lime-300"
                          : "text-slate-400"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </header>
      )}

      <Routes>
        <Route
          path="/settings"
          element={
            <SettingsPage
              matchInfo={matchInfo}
              onMatchIdChange={handleMatchIdChange}
              onActiveGameIndexChange={handleActiveGameIndexChange}
              onLoadSampleMatch={handleLoadSampleMatch}
              sampleMatches={sampleMatches}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              setPrimaryColor={setPrimaryColor}
              setSecondaryColor={setSecondaryColor}
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
            />
          }
        />
        <Route
          path="/testing"
          element={
            <TestingPage
              matchInfo={matchInfo}
              onApplyMatch={applyMatchInfo}
              onActiveGameIndexChange={handleActiveGameIndexChange}
              onLoadSampleMatch={handleLoadSampleMatch}
              sampleMatches={sampleMatches}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              showBorder={showBorder}
              manualTextColor={manualTextColorEnabled ? manualTextColor : null}
              tickerBackground={tickerBackground}
              useFullAssociationName={useFullAssociationName}
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
              showBorder={showBorder}
              manualTextColor={manualTextColorEnabled ? manualTextColor : null}
              tickerBackground={tickerBackground}
              useFullAssociationName={useFullAssociationName}
            />
          }
        />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    </div>
  );
}
