import type { AppCtx } from '@/engine/types/controller.types.js';
import { Role } from '@/engine/constants/role.constants.js';
import { MessageStyle } from '@/engine/constants/message-style.constants.js';
import { OptionType } from '@/engine/modules/command/command-option.constants.js';
import type { CommandConfig } from '@/engine/types/module-config.types.js';
import pg from 'pg';

const { Pool } = pg;

const BASE_URL = 'https://cat-bot-core-intelligence--ztourx.replit.app';

// ================= PERSISTENT SETTINGS =================
// PostgreSQL is the source of truth. stateMap is a write-through cache.
// On first access per key the DB is queried once; after that the cache serves reads.
// Every write hits the DB immediately — no data is lost on restart.

type ThreadState = { isOn: boolean; model: string };

const stateMap = new Map<string, ThreadState>();

// Lazy pool — created on first DB access so module load never throws.
let _pool: pg.Pool | null = null;

const getPool = (): pg.Pool => {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
      ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    _pool.on('error', (err) => console.error('[SIM] PG pool error:', err));
  }
  return _pool;
};

const makeKey = (userId: string, sessionId: string, threadID: string): string =>
  `${userId}:${sessionId}:${threadID}`;

// Load settings — cache-aside: check RAM first, then DB, then return default.
const loadState = async (
  userId: string,
  sessionId: string,
  threadID: string
): Promise<ThreadState> => {
  const key = makeKey(userId, sessionId, threadID);

  if (stateMap.has(key)) return stateMap.get(key)!;

  try {
    const res = await getPool().query<{ is_on: boolean; model: string }>(
      `SELECT is_on, model
       FROM thread_settings
       WHERE user_id = $1 AND session_id = $2 AND thread_id = $3`,
      [userId, sessionId, threadID]
    );

    const state: ThreadState =
      res.rows.length > 0
        ? { isOn: res.rows[0]!.is_on, model: res.rows[0]!.model }
        : { isOn: false, model: 'native' };

    stateMap.set(key, state);
    return state;
  } catch (err) {
    console.error('[SIM] DB load failed, using default:', err);
    const fallback: ThreadState = { isOn: false, model: 'native' };
    stateMap.set(key, fallback);
    return fallback;
  }
};

// Save settings — writes to cache AND DB immediately.
const saveState = async (
  userId: string,
  sessionId: string,
  threadID: string,
  state: ThreadState
): Promise<void> => {
  const key = makeKey(userId, sessionId, threadID);
  stateMap.set(key, state);

  try {
    await getPool().query(
      `INSERT INTO thread_settings (user_id, session_id, thread_id, is_on, model, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, session_id, thread_id) DO UPDATE
         SET is_on      = EXCLUDED.is_on,
             model      = EXCLUDED.model,
             updated_at = NOW()`,
      [userId, sessionId, threadID, state.isOn, state.model]
    );
  } catch (err) {
    console.error('[SIM] DB save failed (cache still updated):', err);
  }
};

// ================= CONFIG =================

export const config: CommandConfig = {
  name: 'sim',
  aliases: ['simi'],
  version: '7.3.0',
  author: 'Zephyrus Wym',
  role: Role.ANYONE,
  description: '🔥 Hardcore Bardagulan SIM AI (Persistent Settings)',
  category: 'AI',
  hasPrefix: true,
  cooldown: 0,
  options: [
    {
      type: OptionType.string,
      name: 'text',
      description: 'message / on / off / model <name>',
      required: true,
    },
  ],
};

// ================= AI CORE =================

const askAI = async (
  input: string,
  threadId: string
): Promise<string> => {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, threadId }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API ERROR ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data?.response || 'Walang response mula sa Cat-Bot API.';
  } catch (err) {
    console.error('SIM API ERROR:', err);
    return '❌ Hindi ma-contact ang Cat-Bot API.';
  }
};

// ================= AUTO REPLY (onChat) =================

export const onChat = async ({ chat, event, native }: AppCtx): Promise<void> => {
  const body = (event['message'] as string | undefined)?.trim();
  if (!body) return;

  const threadID = event['threadID'] as string | undefined;
  if (!threadID) return;

  const { userId, sessionId } = native;

  // Load from DB on first access — subsequent calls hit the cache.
  const thread = await loadState(userId, sessionId, threadID);
  if (!thread.isOn) return;

  const aiThreadId = `${sessionId}:${threadID}`;
  const reply = await askAI(body, aiThreadId);

  await chat.replyMessage({
    style: MessageStyle.MARKDOWN,
    message: reply,
  });
};

// ================= COMMAND =================

export const onCommand = async ({ chat, args, event, native }: AppCtx): Promise<void> => {
  const input = args.join(' ').trim();

  const threadID = event['threadID'] as string | undefined;
  if (!threadID) return;

  const { userId, sessionId } = native;

  // Load current settings from DB (or cache if already loaded).
  const thread = await loadState(userId, sessionId, threadID);

  if (!input) {
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: 'SIM COMMANDS:\n• sim on\n• sim off\n• sim model <name>\n• sim <message>',
    });
    return;
  }

  if (input === 'on') {
    await saveState(userId, sessionId, threadID, { ...thread, isOn: true });
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '🔥 SIM BARDAGULAN MODE ON NA ACCHA',
    });
    return;
  }

  if (input === 'off') {
    await saveState(userId, sessionId, threadID, { ...thread, isOn: false });
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '💤 SIM OFF NA (tahimik muna ako)',
    });
    return;
  }

  if (args[0] === 'model' && args[1]) {
    const model = args[1].toLowerCase();
    await saveState(userId, sessionId, threadID, { ...thread, model });
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: `MODEL SWITCHED: ${model}`,
    });
    return;
  }

  const aiThreadId = `${sessionId}:${threadID}`;
  const reply = await askAI(input, aiThreadId);

  await chat.replyMessage({
    style: MessageStyle.MARKDOWN,
    message: reply,
  });
};
