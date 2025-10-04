/* eslint-env node */
import "dotenv/config";
import http from "node:http";
import process from "node:process";
import { parse } from "node:url";
import { Pool } from "pg";

const PORT = process.env.SYNC_SERVER_PORT
  ? Number.parseInt(process.env.SYNC_SERVER_PORT, 10)
  : 4000;
const HOST = process.env.SYNC_SERVER_HOST ?? "0.0.0.0";
const BASE_PATH = process.env.SYNC_BASE_PATH ?? "/api/ticker-sync";
const CORS_ORIGIN = process.env.SYNC_CORS_ORIGIN ?? "*";

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

const sendMethodNotAllowed = (res) => {
  res.statusCode = 405;
  res.setHeader("Allow", "GET, PUT");
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
};

const handleGetState = async (res, id) => {
  const result = await pool.query(
    "SELECT payload, updated_at FROM ticker_state WHERE id = $1",
    [id]
  );

  if (!result.rowCount) {
    sendNotFound(res);
    return;
  }

  const row = result.rows[0];
  json(res, 200, {
    payload: row.payload,
    updatedAt: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
  });
};

const handlePutState = async (res, id, body) => {
  if (!body || typeof body !== "object" || body.payload === undefined) {
    json(res, 400, { error: "payload is required" });
    return;
  }

  const payload = body.payload;
  const updatedAt = new Date();

  const result = await pool.query(
    `INSERT INTO ticker_state (id, payload, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload,
           updated_at = EXCLUDED.updated_at
     RETURNING updated_at`,
    [id, payload, updatedAt]
  );

  json(res, 200, {
    updatedAt: result.rows[0].updated_at?.toISOString?.() ?? updatedAt.toISOString(),
  });
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  const parsed = parse(req.url ?? "", true);
  if (!parsed.pathname?.startsWith(BASE_PATH)) {
    sendNotFound(res);
    return;
  }

  const segments = parsed.pathname.slice(BASE_PATH.length).split("/").filter(Boolean);
  if (segments.length !== 1) {
    sendNotFound(res);
    return;
  }

  const id = segments[0];

  try {
    if (req.method === "GET") {
      await handleGetState(res, id);
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      await handlePutState(res, id, body);
      return;
    }

    sendMethodNotAllowed(res);
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
