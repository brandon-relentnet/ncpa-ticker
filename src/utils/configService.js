/**
 * Client functions for fetching and updating app-wide runtime configuration
 * stored in the sync server's `app_config` table.
 */

const defaultBaseUrl = import.meta.env.DEV
  ? "http://localhost:4000/api/ticker-sync"
  : "/api/ticker-sync";

const rawBaseUrl = import.meta.env.VITE_SYNC_SERVICE_URL ?? defaultBaseUrl;

const resolveBaseUrl = () => {
  let url = rawBaseUrl;
  if (url && /^https?:\/\//i.test(url)) {
    try {
      url = new URL(url).toString().replace(/\/$/, "");
    } catch {
      url = defaultBaseUrl;
    }
  }
  return url;
};

const CONFIG_URL = `${resolveBaseUrl()}/config`;

/**
 * Fetch the current app config from the server.
 * Returns: { ncpaApiKey, ncpaApiBase, ncpaSocketUrl, defaultMatchId, updatedAt }
 */
export const fetchAppConfig = async () => {
  const response = await fetch(CONFIG_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to fetch config (${response.status})`);
  }

  return response.json();
};

/**
 * Save app config to the server.
 * Accepts partial updates — only include fields you want to change.
 * @param {Object} config - { ncpaApiKey?, ncpaApiBase?, ncpaSocketUrl?, defaultMatchId? }
 */
export const saveAppConfig = async (config) => {
  if (!config || typeof config !== "object") {
    throw new Error("Config object is required");
  }

  const response = await fetch(CONFIG_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to save config (${response.status})`);
  }

  return response.json();
};
