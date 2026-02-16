/* eslint-env node */
import "dotenv/config";
import http from "node:http";
import process from "node:process";
import { Pool } from "pg";

const PORT = process.env.SYNC_SERVER_PORT
  ? Number.parseInt(process.env.SYNC_SERVER_PORT, 10)
  : 4000;
const HOST = process.env.SYNC_SERVER_HOST ?? "0.0.0.0";
const BASE_PATH = process.env.SYNC_BASE_PATH ?? "/api/ticker-sync";
const CORS_ORIGIN = process.env.SYNC_CORS_ORIGIN ?? "";

/* ── Simple in-memory rate limiter ─────────────────────────────────────────── */
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_REQUESTS = 120; // per window per IP
const ipHits = new Map(); // ip -> { count, resetAt }

const checkRateLimit = (ip) => {
  const now = Date.now();
  let entry = ipHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    ipHits.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_MAX_REQUESTS;
};

// Periodically prune expired entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now >= entry.resetAt) ipHits.delete(ip);
  }
}, RATE_WINDOW_MS);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL env var is required to start ticker sync server");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const sendNoContent = (res) => {
  res.statusCode = 204;
  res.end();
};

const sendNotFound = (res) => json(res, 404, { error: "Not found" });

const sendMethodNotAllowed = (res, allowed = "GET, PUT, PATCH, DELETE") => {
  res.statusCode = 405;
  res.setHeader("Allow", allowed);
  res.end();
};

const readBody = async (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticker_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE ticker_state
      ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  /* ── App-wide runtime configuration (singleton row) ──────────────────────── */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      ncpa_api_key TEXT NOT NULL DEFAULT '',
      ncpa_api_base TEXT NOT NULL DEFAULT 'https://tournaments.ncpaofficial.com',
      ncpa_socket_url TEXT NOT NULL DEFAULT 'https://tournaments.ncpaofficial.com',
      default_match_id TEXT NOT NULL DEFAULT '5092',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed the singleton row if it doesn't already exist
  await pool.query(`
    INSERT INTO app_config (id) VALUES (1) ON CONFLICT DO NOTHING;
  `);
};

/* ── List all tickers ──────────────────────────────────────────────────────── */
const handleListTickers = async (res) => {
  const result = await pool.query(
    "SELECT id, name, payload, created_at, updated_at FROM ticker_state ORDER BY updated_at DESC"
  );

  const tickers = result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    payload: row.payload,
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  }));

  json(res, 200, tickers);
};

/* ── Get single ticker ─────────────────────────────────────────────────────── */
const handleGetState = async (res, id) => {
  const result = await pool.query(
    "SELECT name, payload, created_at, updated_at FROM ticker_state WHERE id = $1",
    [id]
  );

  if (!result.rowCount) {
    sendNotFound(res);
    return;
  }

  const row = result.rows[0];
  json(res, 200, {
    name: row.name ?? "",
    payload: row.payload,
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  });
};

/* ── Create / update ticker ────────────────────────────────────────────────── */
const handlePutState = async (res, id, body) => {
  if (!body || typeof body !== "object" || body.payload === undefined) {
    json(res, 400, { error: "payload is required" });
    return;
  }

  const payload = body.payload;
  const name = typeof body.name === "string" ? body.name : "";
  const updatedAt = new Date();

  const result = await pool.query(
    `INSERT INTO ticker_state (id, name, payload, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload,
           name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE ticker_state.name END,
           updated_at = EXCLUDED.updated_at
     RETURNING name, created_at, updated_at`,
    [id, name, payload, updatedAt]
  );

  const row = result.rows[0];
  json(res, 200, {
    name: row.name ?? "",
    createdAt: row.created_at?.toISOString?.() ?? updatedAt.toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? updatedAt.toISOString(),
  });
};

/* ── Rename ticker ─────────────────────────────────────────────────────────── */
const handlePatchState = async (res, id, body) => {
  if (!body || typeof body !== "object" || typeof body.name !== "string") {
    json(res, 400, { error: "name (string) is required" });
    return;
  }

  const result = await pool.query(
    `UPDATE ticker_state SET name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING name, created_at, updated_at`,
    [id, body.name]
  );

  if (!result.rowCount) {
    sendNotFound(res);
    return;
  }

  const row = result.rows[0];
  json(res, 200, {
    name: row.name ?? "",
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  });
};

/* ── Change slug (custom URL) ───────────────────────────────────────────────── */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;

const handleChangeSlug = async (res, currentId, body) => {
  if (!body || typeof body !== "object" || typeof body.slug !== "string") {
    json(res, 400, { error: "slug (string) is required" });
    return;
  }

  const slug = body.slug.trim().toLowerCase();

  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    json(res, 400, {
      error: `Slug must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH} characters`,
    });
    return;
  }

  if (!SLUG_PATTERN.test(slug)) {
    json(res, 400, {
      error:
        "Slug may only contain lowercase letters, numbers, and hyphens (no leading/trailing/consecutive hyphens)",
    });
    return;
  }

  if (slug === currentId) {
    // No-op: slug is already the current id
    json(res, 200, { id: slug, oldId: currentId });
    return;
  }

  // Check for collision
  const existing = await pool.query(
    "SELECT 1 FROM ticker_state WHERE id = $1",
    [slug]
  );

  if (existing.rowCount > 0) {
    json(res, 409, { error: "This slug is already in use" });
    return;
  }

  // Verify the current ticker exists
  const current = await pool.query(
    "SELECT 1 FROM ticker_state WHERE id = $1",
    [currentId]
  );

  if (!current.rowCount) {
    sendNotFound(res);
    return;
  }

  // Update the primary key
  await pool.query("UPDATE ticker_state SET id = $1 WHERE id = $2", [
    slug,
    currentId,
  ]);

  // Atomic rename: insert new row, copy data, delete old — all in one
  // transaction so racing PUT requests from other tabs cannot re-create
  // a ghost row with the old ID.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE ticker_state SET id = $1 WHERE id = $2", [
      slug,
      currentId,
    ]);
    // Delete any ghost row that a racing PUT may have re-created with the old ID
    await client.query("DELETE FROM ticker_state WHERE id = $1", [currentId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  json(res, 200, { id: slug, oldId: currentId });
};

/* ── Get app config ────────────────────────────────────────────────────────── */
const handleGetConfig = async (res) => {
  const result = await pool.query(
    "SELECT ncpa_api_key, ncpa_api_base, ncpa_socket_url, default_match_id, updated_at FROM app_config WHERE id = 1"
  );

  if (!result.rowCount) {
    // Should never happen (seed in ensureSchema), but handle gracefully
    json(res, 200, {
      ncpaApiKey: "",
      ncpaApiBase: "https://tournaments.ncpaofficial.com",
      ncpaSocketUrl: "https://tournaments.ncpaofficial.com",
      defaultMatchId: "5092",
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const row = result.rows[0];
  json(res, 200, {
    ncpaApiKey: row.ncpa_api_key ?? "",
    ncpaApiBase: row.ncpa_api_base ?? "https://tournaments.ncpaofficial.com",
    ncpaSocketUrl: row.ncpa_socket_url ?? "https://tournaments.ncpaofficial.com",
    defaultMatchId: row.default_match_id ?? "5092",
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  });
};

/* ── Update app config ─────────────────────────────────────────────────────── */
const handlePutConfig = async (res, body) => {
  if (!body || typeof body !== "object") {
    json(res, 400, { error: "Request body is required" });
    return;
  }

  const fields = {};
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = {
    ncpaApiKey: "ncpa_api_key",
    ncpaApiBase: "ncpa_api_base",
    ncpaSocketUrl: "ncpa_socket_url",
    defaultMatchId: "default_match_id",
  };

  for (const [jsonKey, dbColumn] of Object.entries(allowedFields)) {
    if (Object.prototype.hasOwnProperty.call(body, jsonKey)) {
      const value = typeof body[jsonKey] === "string" ? body[jsonKey].trim() : "";
      fields[dbColumn] = value;
      setClauses.push(`${dbColumn} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    json(res, 400, { error: "At least one config field is required" });
    return;
  }

  setClauses.push("updated_at = NOW()");

  const result = await pool.query(
    `UPDATE app_config SET ${setClauses.join(", ")} WHERE id = 1
     RETURNING ncpa_api_key, ncpa_api_base, ncpa_socket_url, default_match_id, updated_at`,
    values
  );

  const row = result.rows[0];
  json(res, 200, {
    ncpaApiKey: row.ncpa_api_key ?? "",
    ncpaApiBase: row.ncpa_api_base ?? "",
    ncpaSocketUrl: row.ncpa_socket_url ?? "",
    defaultMatchId: row.default_match_id ?? "",
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  });
};

/* ── Delete ticker ─────────────────────────────────────────────────────────── */
const handleDeleteState = async (res, id) => {
  const result = await pool.query(
    "DELETE FROM ticker_state WHERE id = $1",
    [id]
  );

  if (!result.rowCount) {
    sendNotFound(res);
    return;
  }

  sendNoContent(res);
};

/* ── HTTP server ───────────────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const origin = CORS_ORIGIN || req.headers.origin || "";
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  /* ── Health check (no rate limiting) ─────────────────────────────────────── */
  const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/health") {
    try {
      await pool.query("SELECT 1");
      json(res, 200, { status: "ok" });
    } catch {
      json(res, 503, { status: "unhealthy" });
    }
    return;
  }

  /* ── Rate limiting ───────────────────────────────────────────────────────── */
  const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";

  if (!checkRateLimit(clientIp)) {
    res.statusCode = 429;
    res.setHeader("Retry-After", String(Math.ceil(RATE_WINDOW_MS / 1000)));
    json(res, 429, { error: "Too many requests" });
    return;
  }

  if (!url.pathname.startsWith(BASE_PATH)) {
    sendNotFound(res);
    return;
  }

  const segments = url.pathname.slice(BASE_PATH.length).split("/").filter(Boolean);

  try {
    /* LIST: GET /api/ticker-sync  (no id segment) */
    if (segments.length === 0) {
      if (req.method === "GET") {
        await handleListTickers(res);
        return;
      }
      sendMethodNotAllowed(res, "GET");
      return;
    }

    /* App config: /api/ticker-sync/config */
    if (segments.length === 1 && segments[0] === "config") {
      if (req.method === "GET") {
        await handleGetConfig(res);
        return;
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        await handlePutConfig(res, body);
        return;
      }
      sendMethodNotAllowed(res, "GET, PUT");
      return;
    }

    /* Single ticker: /api/ticker-sync/:id */
    if (segments.length === 1) {
      const id = segments[0];

      if (req.method === "GET") {
        await handleGetState(res, id);
        return;
      }

      if (req.method === "PUT") {
        const body = await readBody(req);
        await handlePutState(res, id, body);
        return;
      }

      if (req.method === "PATCH") {
        const body = await readBody(req);
        await handlePatchState(res, id, body);
        return;
      }

      if (req.method === "DELETE") {
        await handleDeleteState(res, id);
        return;
      }

      sendMethodNotAllowed(res);
      return;
    }

    /* Sub-resource: /api/ticker-sync/:id/slug */
    if (segments.length === 2 && segments[1] === "slug") {
      const id = segments[0];
      if (req.method === "PATCH") {
        const body = await readBody(req);
        await handleChangeSlug(res, id, body);
        return;
      }
      sendMethodNotAllowed(res, "PATCH");
      return;
    }

    sendNotFound(res);
  } catch (error) {
    console.error("Ticker sync request failed", error);
    json(res, 500, { error: "Internal server error" });
  }
});

ensureSchema()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Ticker sync server listening on http://${HOST}:${PORT}${BASE_PATH}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare ticker sync schema", error);
    process.exit(1);
  });
