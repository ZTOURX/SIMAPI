import { v4 as uuidv4 } from "uuid";
import type { Personality } from "../types/personality.types.js";
import { readJson, writeJson, getDataPath } from "../storage/json-store.js";
import { DEFAULT_PERSONALITY } from "../prompts/cat-bot-personality.js";

const personalityPath = () => getDataPath("personality", "personalities.json");

function load(): Personality[] {
  const all = readJson<Personality[]>(personalityPath(), []);
  if (all.length === 0) {
    const def = DEFAULT_PERSONALITY;
    writeJson(personalityPath(), [def]);
    return [def];
  }
  return all;
}

function save(list: Personality[]): void {
  writeJson(personalityPath(), list);
}

export function getPersonality(id: string): Personality | null {
  return load().find((p) => p.id === id) ?? null;
}

export function getDefault(): Personality {
  const all = load();
  return all.find((p) => p.isDefault) ?? all[0] ?? DEFAULT_PERSONALITY;
}

export function createPersonality(data: Omit<Personality, "id" | "createdAt" | "updatedAt">): Personality {
  const all = load();
  const now = Date.now();
  const p: Personality = { id: uuidv4(), createdAt: now, updatedAt: now, ...data };
  if (p.isDefault) {
    for (const existing of all) existing.isDefault = false;
  }
  all.push(p);
  save(all);
  return p;
}

export function updatePersonality(id: string, updates: Partial<Personality>): Personality | null {
  const all = load();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  if (updates.isDefault) {
    for (const p of all) p.isDefault = false;
  }
  all[idx] = { ...all[idx]!, ...updates, id, updatedAt: Date.now() };
  save(all);
  return all[idx]!;
}

export function deletePersonality(id: string): boolean {
  const all = load();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  save(filtered);
  return true;
}

export function listPersonalities(): Personality[] {
  return load();
}
