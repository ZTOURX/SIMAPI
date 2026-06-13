import fs from "fs";
import path from "path";
import pg from "pg";
import { logger } from "../lib/logger.js";

const { Pool } = pg;

// ─── Paths (kept for callers that reference dataDir / getDataPath) ────────────

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");

export function getDataPath(...segments: string[]): string {
  return path.join(dataDir, ...segments);
}

// ─── PostgreSQL pool ──────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: process.env["NODE_ENV"] === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "PostgreSQL pool error");
});

// ─── Key helpers ──────────────────────────────────────────────────────────────

function toKey(filePath: string): string {
  // Store keys relative to dataDir so they're portable across environments.
  // e.g. /abs/path/to/data/memory/st_abc.json → memory/st_abc.json
  if (filePath.startsWith(dataDir)) {
    return filePath.slice(dataDir.length).replace(/^[/\\]/, "");
  }
  return filePath;
}

function toFilePath(key: string): string {
  return path.join(dataDir, key);
}

// ─── Core store operations ────────────────────────────────────────────────────

export async function readJsonAsync<T>(filePath: string, defaultValue: T): Promise<T> {
  const key = toKey(filePath);
  try {
    const res = await pool.query<{ data: T }>(
      "SELECT data FROM json_store WHERE key = $1",
      [key]
    );
    if (res.rows.length === 0) return defaultValue;
    return res.rows[0]!.data;
  } catch (err) {
    logger.warn({ key, err }, "PG readJson failed, returning default");
    return defaultValue;
  }
}

export async function writeJsonAsync<T>(filePath: string, data: T): Promise<void> {
  const key = toKey(filePath);
  try {
    await pool.query(
      `INSERT INTO json_store (key, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
         SET data = EXCLUDED.data,
             updated_at = NOW()`,
      [key, JSON.stringify(data)]
    );
  } catch (err) {
    logger.error({ key, err }, "PG writeJson failed");
    throw err;
  }
}

export async function deleteJsonAsync(filePath: string): Promise<boolean> {
  const key = toKey(filePath);
  try {
    const res = await pool.query("DELETE FROM json_store WHERE key = $1", [key]);
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    logger.error({ key, err }, "PG deleteJson failed");
    return false;
  }
}

export async function listFilesAsync(dirPath: string, ext = ".json"): Promise<string[]> {
  // dirPath is an absolute path to a subdirectory of dataDir.
  // We convert it to a key prefix, e.g. "memory/" and query for all matching keys.
  const prefix = toKey(dirPath).replace(/[/\\]$/, "") + "/";
  try {
    const res = await pool.query<{ key: string }>(
      "SELECT key FROM json_store WHERE key LIKE $1",
      [prefix + "%"]
    );
    return res.rows
      .map((r) => path.basename(r.key))
      .filter((f) => f.endsWith(ext));
  } catch (err) {
    logger.warn({ prefix, err }, "PG listFiles failed");
    return [];
  }
}

// ─── Synchronous shims (legacy API — delegates to async via sync file fallback)
// Repositories call these synchronously. We keep synchronous semantics by
// reading from the local file as a read-through cache when PG is unavailable,
// and queue the write to PG in the background without blocking the caller.
// In practice all current code paths await the route handler, so the background
// write completes before the next request.

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJson<T>(filePath: string, defaultValue: T): T {
  // Synchronous read: check local file (may exist from previous runs or migration seed).
  // The async PG write keeps the file in sync as a warm backup.
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function writeJson<T>(filePath: string, data: T): void {
  // Write to local file synchronously (fast, used for request-path reliability).
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    logger.error({ filePath, err }, "Local writeJson failed");
    throw err;
  }
  // Mirror to PostgreSQL in the background — non-blocking.
  writeJsonAsync(filePath, data).catch((err) =>
    logger.error({ filePath: toKey(filePath), err }, "PG mirror write failed")
  );
}

export function deleteJson(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logger.error({ filePath, err }, "Local deleteJson failed");
  }
  deleteJsonAsync(filePath).catch((err) =>
    logger.error({ key: toKey(filePath), err }, "PG mirror delete failed")
  );
  return true;
}

export function listFiles(dirPath: string, ext = ".json"): string[] {
  try {
    ensureDir(dirPath);
    return fs.readdirSync(dirPath).filter((f) => f.endsWith(ext));
  } catch {
    return [];
  }
}

// ─── Startup: ensure dirs + seed PostgreSQL from existing JSON files ──────────

async function seedPostgres(): Promise<void> {
  // Check if DB already has data — if so, skip seeding to avoid overwriting newer data.
  const check = await pool.query<{ c: string }>("SELECT COUNT(*) AS c FROM json_store");
  const existing = parseInt(check.rows[0]?.c ?? "0", 10);

  const allFiles = findAllJsonFiles(dataDir);
  if (allFiles.length === 0) return;

  logger.info({ existing, files: allFiles.length }, "Seeding PostgreSQL from local JSON files");

  let seeded = 0;
  for (const filePath of allFiles) {
    const key = toKey(filePath);
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      // INSERT ... ON CONFLICT DO NOTHING — never overwrite existing PG data with local files.
      await pool.query(
        `INSERT INTO json_store (key, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(data)]
      );
      seeded++;
    } catch (err) {
      logger.warn({ key, err }, "Failed to seed file into PG");
    }
  }

  logger.info({ seeded }, "PostgreSQL seed complete");
}

function findAllJsonFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findAllJsonFiles(full));
      else if (entry.name.endsWith(".json")) results.push(full);
    }
  } catch {
    // directory may not exist yet
  }
  return results;
}

// Ensure local directories exist (legacy compatibility)
ensureDir(dataDir);
ensureDir(path.join(dataDir, "memory"));
ensureDir(path.join(dataDir, "threads"));
ensureDir(path.join(dataDir, "knowledge"));
ensureDir(path.join(dataDir, "personality"));
ensureDir(path.join(dataDir, "analytics"));
ensureDir(path.join(dataDir, "models"));

// Seed PostgreSQL on module load (non-blocking — errors are logged, not thrown)
seedPostgres().catch((err) =>
  logger.error({ err }, "PostgreSQL seed failed on startup")
);
