import type { AppCtx } from '@/engine/types/controller.types.js';
import { Role } from '@/engine/constants/role.constants.js';
import { MessageStyle } from '@/engine/constants/message-style.constants.js';
import { OptionType } from '@/engine/modules/command/command-option.constants.js';
import type { CommandConfig } from '@/engine/types/module-config.types.js';

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const CATBOT_API_URL = 'https://cat-bot-core-intelligence--ztourx.replit.app';
const DB_PATH = path.resolve(process.cwd(), 'sim-data.json');

type ThreadState = {
  isOn: boolean;
  model: string;
};

// ================= DB =================

const loadDB = (): Record<string, ThreadState> => {
  try {
    if (!existsSync(DB_PATH)) {
      writeFileSync(DB_PATH, '{}');
      return {};
    }
    return JSON.parse(readFileSync(DB_PATH, 'utf-8') || '{}');
  } catch {
    return {};
  }
};

let db = loadDB();

const saveDB = () => {
  try {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('DB SAVE ERROR:', err);
  }
};

const getThread = (id: string): ThreadState => {
  if (!db[id]) {
    db[id] = {
      isOn: false,
      model: 'native',
    };
    saveDB();
  }
  return db[id];
};

const updateThread = (id: string, data: ThreadState) => {
  db[id] = data;
  saveDB();
};

// ================= CONFIG =================

export const config: CommandConfig = {
  name: 'sim',
  aliases: ['simi'],
  version: '7.2.0',
  author: 'Zephyrus Wym',
  role: Role.ANYONE,
  description: '🔥 Hardcore Bardagulan SIM AI (Cat-Bot Core)',
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

const askAI = async (input: string, threadId: string): Promise<string> => {
  const res = await fetch(`${CATBOT_API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: input,
      threadId,
    }),
  });

  if (!res.ok) throw new Error(`API ERROR: ${res.status}`);

  const data = (await res.json()) as { response: string };

  return data.response || '...';
};

// ================= EVENT (AUTO REPLY) =================

export const onEvent = async ({ chat, message }: AppCtx & { message: any }) => {
  const body = message?.body?.trim();
  if (!body) return;

  const lower = body.toLowerCase();

  if (lower.startsWith('/')) return;

  const threadId =
    (chat as any).threadID ||
    (chat as any).chatID ||
    (chat as any).id;

  if (!threadId) return;

  const thread = getThread(threadId);

  if (!thread.isOn) return;

  try {
    const reply = await askAI(body, threadId);

    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: reply,
    });
  } catch (err) {
    console.error('AUTO REPLY ERROR:', err);
  }
};

// ================= COMMAND =================

export const onCommand = async ({ chat, args }: AppCtx) => {
  const input = args.join(' ').trim();

  const threadId =
    (chat as any).threadID ||
    (chat as any).chatID ||
    (chat as any).id;

  const thread = getThread(threadId);

  if (!input) {
    return chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message:
        'SIM COMMANDS:\n• sim on\n• sim off\n• sim model <name>\n• sim <message>',
    });
  }

  if (input === 'on') {
    thread.isOn = true;
    updateThread(threadId, thread);

    return chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '🔥 SIM BARDAGULAN MODE ON NA ACCHA',
    });
  }

  if (input === 'off') {
    thread.isOn = false;
    updateThread(threadId, thread);

    return chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '💤 SIM OFF NA (tahimik muna ako)',
    });
  }

  if (args[0] === 'model' && args[1]) {
    thread.model = args[1].toLowerCase();
    updateThread(threadId, thread);

    return chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: `MODEL SWITCHED: ${thread.model}`,
    });
  }

  try {
    const reply = await askAI(input, threadId);

    return chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: reply,
    });
  } catch (err) {
    console.error('COMMAND ERROR:', err);
  }
};

export const handleEvent = onEvent;
export const onChat = onEvent;
