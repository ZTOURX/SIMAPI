import type { AppCtx } from '@/engine/types/controller.types.js';
import { Role } from '@/engine/constants/role.constants.js';
import { MessageStyle } from '@/engine/constants/message-style.constants.js';
import { OptionType } from '@/engine/modules/command/command-option.constants.js';
import type { CommandConfig } from '@/engine/types/module-config.types.js';

const BASE_URL = 'https://cat-bot-core-intelligence--ztourx.replit.app';

// ================= STATE =================
// In-memory state scoped per `${userId}:${sessionId}:${threadID}` —
// required by Cat-Bot multi-instance safety rules (no flat files allowed).
// State is ephemeral: resets on server restart, which is acceptable for on/off toggle.

type ThreadState = { isOn: boolean; model: string };

const stateMap = new Map<string, ThreadState>();

const makeKey = (userId: string, sessionId: string, threadID: string): string =>
  `${userId}:${sessionId}:${threadID}`;

const getState = (key: string): ThreadState => {
  if (!stateMap.has(key)) {
    stateMap.set(key, { isOn: false, model: 'native' });
  }
  return stateMap.get(key)!;
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

const askAI = async (
  input: string,
  threadId: string
): Promise<string> => {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
        threadId,
      }),
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
// onChat fires for every incoming message — before prefix parsing and command dispatch.
// This is the correct hook for passive auto-reply in Cat-Bot (not onEvent).

export const onChat = async ({ chat, event, native }: AppCtx): Promise<void> => {
  const body = (event['message'] as string | undefined)?.trim();
  if (!body) return;

  const threadID = event['threadID'] as string | undefined;
  if (!threadID) return;

  const { userId, sessionId } = native;
  const key = makeKey(userId, sessionId, threadID);
  const thread = getState(key);

  if (!thread.isOn) return;

  // Use sessionId:threadID as the AI conversation key so each bot session
  // has its own isolated memory on the Cat-Bot AI Platform.
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
  const key = makeKey(userId, sessionId, threadID);
  const thread = getState(key);

  if (!input) {
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: 'SIM COMMANDS:\n• sim on\n• sim off\n• sim model <name>\n• sim <message>',
    });
    return;
  }

  if (input === 'on') {
    thread.isOn = true;
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '🔥 SIM BARDAGULAN MODE ON NA ACCHA',
    });
    return;
  }

  if (input === 'off') {
    thread.isOn = false;
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: '💤 SIM OFF NA (tahimik muna ako)',
    });
    return;
  }

  if (args[0] === 'model' && args[1]) {
    thread.model = args[1].toLowerCase();
    await chat.replyMessage({
      style: MessageStyle.MARKDOWN,
      message: `MODEL SWITCHED: ${thread.model}`,
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
