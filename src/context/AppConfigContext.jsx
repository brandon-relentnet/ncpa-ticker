import { createContext, useEffect, useState } from "react";
import { fetchAppConfig } from "../utils/configService";

/**
 * Shape of runtime app config provided through context.
 *
 * Values are sourced from the server's `app_config` table at startup,
 * with build-time VITE_* env vars used as fallbacks when the server
 * is unreachable or hasn't been configured yet.
 */
const CONFIG_FALLBACKS = {
  ncpaApiKey: import.meta.env.VITE_NCPA_API_KEY ?? "",
  ncpaApiBase:
    import.meta.env.VITE_NCPA_API_BASE ??
    "https://tournaments.ncpaofficial.com",
  ncpaSocketUrl:
    import.meta.env.VITE_NCPA_SOCKET_URL ??
    "https://tournaments.ncpaofficial.com",
  defaultMatchId: import.meta.env.VITE_DEFAULT_MATCH_ID ?? "5092",
};

const AppConfigContext = createContext({
  config: { ...CONFIG_FALLBACKS },
  configLoading: true,
  configError: null,
});

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState({ ...CONFIG_FALLBACKS });
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const serverConfig = await fetchAppConfig();

        if (cancelled) return;

        // Merge: prefer server values when non-empty, else keep fallbacks
        setConfig({
          ncpaApiKey: serverConfig.ncpaApiKey || CONFIG_FALLBACKS.ncpaApiKey,
          ncpaApiBase: serverConfig.ncpaApiBase || CONFIG_FALLBACKS.ncpaApiBase,
          ncpaSocketUrl:
            serverConfig.ncpaSocketUrl || CONFIG_FALLBACKS.ncpaSocketUrl,
          defaultMatchId:
            serverConfig.defaultMatchId || CONFIG_FALLBACKS.defaultMatchId,
        });
      } catch (error) {
        if (cancelled) return;
        console.warn(
          "Failed to load app config from server, using fallbacks",
          error
        );
        setConfigError(error.message ?? "Failed to load config");
        // Keep FALLBACKS — already set as initial state
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, configLoading, configError }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export default AppConfigContext;
