/**
 * Shared API base URL resolution for all client-side service modules.
 *
 * Reads VITE_SYNC_SERVICE_URL from the environment, falling back to a
 * sensible default for dev (localhost:4000) and production (relative path).
 */

const defaultBaseUrl = import.meta.env.DEV
  ? "http://localhost:4000/api/ticker-sync"
  : "/api/ticker-sync";

const raw = import.meta.env.VITE_SYNC_SERVICE_URL ?? defaultBaseUrl;

let resolved = raw;
if (resolved && /^https?:\/\//i.test(resolved)) {
  try {
    resolved = new URL(resolved).toString().replace(/\/$/, "");
  } catch {
    resolved = defaultBaseUrl;
  }
}

export const API_BASE_URL = resolved;
