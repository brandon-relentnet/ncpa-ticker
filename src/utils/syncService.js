const defaultBaseUrl = import.meta.env.DEV
  ? "http://localhost:4000/api/ticker-sync"
  : "/api/ticker-sync";

const rawBaseUrl = import.meta.env.VITE_SYNC_SERVICE_URL ?? defaultBaseUrl;
let BASE_URL = rawBaseUrl;

// Only validate with URL constructor if it looks like an absolute URL.
// Relative paths (e.g. "/api/ticker-sync") are valid for fetch() and
// don't need normalization.
if (BASE_URL && /^https?:\/\//i.test(BASE_URL)) {
  try {
    const asUrl = new URL(BASE_URL);
    BASE_URL = asUrl.toString().replace(/\/$/, "");
  } catch (error) {
    console.warn("Invalid VITE_SYNC_SERVICE_URL provided", error);
    BASE_URL = defaultBaseUrl;
  }
}

const ensureTrailingSlash = (url) =>
  url.endsWith("/") ? url : `${url}/`;

const buildSyncUrl = (syncId) => {
  if (!syncId) throw new Error("syncId is required");
  const encodedId = encodeURIComponent(syncId);

  if (BASE_URL.startsWith("http")) {
    const url = new URL(encodedId, ensureTrailingSlash(BASE_URL));
    return url.toString();
  }

  return `${BASE_URL}/${encodedId}`;
};

const parseResponse = async (response) => {
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Sync request failed (${response.status})`);
  }
  return response.json();
};

export const fetchSyncState = async (syncId) => {
  if (!syncId) return null;
  const response = await fetch(buildSyncUrl(syncId), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
};

export const pushSyncState = async ({ syncId, payload, name }) => {
  if (!syncId) throw new Error("syncId is required to push state");
  const body = { payload };
  if (name !== undefined) body.name = name;
  const response = await fetch(buildSyncUrl(syncId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
};

const buildListUrl = () => ensureTrailingSlash(BASE_URL);

export const listTickers = async () => {
  const response = await fetch(buildListUrl(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
};

export const renameTicker = async (syncId, name) => {
  if (!syncId) throw new Error("syncId is required");
  const response = await fetch(buildSyncUrl(syncId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseResponse(response);
};

export const changeSlug = async (currentId, newSlug) => {
  if (!currentId) throw new Error("currentId is required");
  if (!newSlug) throw new Error("newSlug is required");
  const url = `${buildSyncUrl(currentId)}/slug`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: newSlug }),
  });
  if (response.status === 409) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.error || "Slug already in use");
    err.status = 409;
    throw err;
  }
  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.error || "Invalid slug");
    err.status = 400;
    throw err;
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Slug change failed (${response.status})`);
  }
  return response.json();
};

export const deleteTicker = async (syncId) => {
  if (!syncId) throw new Error("syncId is required");
  const response = await fetch(buildSyncUrl(syncId), {
    method: "DELETE",
  });
  if (response.status === 204) return true;
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Delete failed (${response.status})`);
  }
  return true;
};
