/**
 * Client functions for fetching and updating app-wide runtime configuration
 * stored in the sync server's `app_config` table.
 */

import { API_BASE_URL } from "./apiBase";

const CONFIG_URL = `${API_BASE_URL}/config`;

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
