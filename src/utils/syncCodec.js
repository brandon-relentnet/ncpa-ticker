const SHARE_ID_STORAGE_KEY = "pickleball-ticker-share-id";

export const SYNC_QUERY_PARAM = "sync";

const base64DecodeLegacy = (value) => {
  if (typeof value !== "string" || !value.length) return "";

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(value);
    if (typeof TextDecoder !== "undefined") {
      const decoder = new TextDecoder();
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return decoder.decode(bytes);
    }
    return binary;
  }

  if (typeof globalThis !== "undefined" && globalThis.Buffer) {
    return globalThis.Buffer.from(value, "base64").toString("utf-8");
  }

  return "";
};

const fromBase64UrlLegacy = (value = "") => {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad) normalized = normalized.padEnd(normalized.length + (4 - pad), "=");
  return normalized;
};

export const decodeLegacySyncToken = (token) => {
  if (!token || typeof token !== "string") return null;

  try {
    const base64 = fromBase64UrlLegacy(token);
    const json = base64DecodeLegacy(base64);
    if (!json) return null;
    const envelope = JSON.parse(json);
    if (!envelope || typeof envelope !== "object") return null;
    return envelope.payload ?? null;
  } catch {
    return null;
  }
};

export const extractSyncTokenFromSearch = (search = "") => {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const raw = params.get(SYNC_QUERY_PARAM);
  return raw && typeof raw === "string" && raw.length ? raw : null;
};

export const generateSyncId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sync-${Math.random().toString(36).slice(2, 11)}`;
};

/* ── Slug validation (custom URL) ──────────────────────────────────────────── */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 64;

export const isValidSlug = (slug) => {
  if (typeof slug !== "string") return false;
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < SLUG_MIN_LENGTH || trimmed.length > SLUG_MAX_LENGTH) return false;
  return SLUG_PATTERN.test(trimmed);
};

export const loadShareIdFromStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(SHARE_ID_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to read saved share id", error);
    return null;
  }
};

export const persistShareId = (value) => {
  if (typeof window === "undefined") return;

  try {
    if (value) {
      window.localStorage.setItem(SHARE_ID_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SHARE_ID_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to persist share id", error);
  }
};
