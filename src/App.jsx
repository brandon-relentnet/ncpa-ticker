import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import match_info from "./DummyData";
import SettingsPage from "./pages/Settings";
import TickerPage from "./pages/Ticker";
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "./utils/colors";

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
  { to: "/settings", label: "Settings" },
  { to: "/ticker", label: "Ticker" },
];

export default function App() {
  const storedTheme = useMemo(loadStoredTheme, []);

  const [primaryColor, setPrimaryColor] = useState(
    storedTheme?.primaryColor ?? DEFAULT_PRIMARY
  );
  const [secondaryColor, setSecondaryColor] = useState(
    storedTheme?.secondaryColor ?? DEFAULT_SECONDARY
  );
  const [showBorder, setShowBorder] = useState(
    storedTheme?.showBorder ?? true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ primaryColor, secondaryColor, showBorder })
      );
    } catch (error) {
      console.warn("Failed to persist ticker theme", error);
    }
  }, [primaryColor, secondaryColor, showBorder]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <NavLink to="/settings" className="text-xl font-semibold text-lime-400">
            Pickleball Ticker
          </NavLink>
          <nav className="flex gap-3 text-xs font-semibold uppercase tracking-wide">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 transition-colors hover:text-lime-300 ${
                    isActive ? "bg-slate-900 text-lime-300" : "text-slate-400"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Routes>
        <Route
          path="/settings"
          element={
            <SettingsPage
              matchInfo={match_info}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              setPrimaryColor={setPrimaryColor}
              setSecondaryColor={setSecondaryColor}
              showBorder={showBorder}
              setShowBorder={setShowBorder}
            />
          }
        />
        <Route path="/ticker" element={<TickerPage />} />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    </div>
  );
}
