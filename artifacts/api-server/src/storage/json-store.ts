import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ filePath, err }, "Failed to read JSON file, using default");
    return defaultValue;
  }
}

export function writeJson<T>(filePath: string, data: T): void {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    logger.error({ filePath, err }, "Failed to write JSON file");
    throw err;
  }
}

export function deleteJson(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    logger.error({ filePath, err }, "Failed to delete JSON file");
    return false;
  }
}

export function listFiles(dirPath: string, ext = ".json"): string[] {
  try {
    ensureDir(dirPath);
    return fs.readdirSync(dirPath).filter((f) => f.endsWith(ext));
  } catch {
    return [];
  }
}

export function getDataPath(...segments: string[]): string {
  return path.join(dataDir, ...segments);
}

ensureDir(dataDir);
ensureDir(path.join(dataDir, "memory"));
ensureDir(path.join(dataDir, "threads"));
ensureDir(path.join(dataDir, "knowledge"));
ensureDir(path.join(dataDir, "personality"));
ensureDir(path.join(dataDir, "analytics"));
ensureDir(path.join(dataDir, "models"));
