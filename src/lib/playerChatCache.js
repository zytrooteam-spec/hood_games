import { readJson, writeJson } from '@/lib/clientCache';

const KEY = 'hood_player_chat_messages';
const TTL_MS = 3 * 60 * 1000;
const MAX_MSG = 80;

export function readPlayerChatCache(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  const row = readJson(KEY);
  if (!row || row.userId !== uid || !Array.isArray(row.messages)) return null;
  if (Date.now() - (row.t || 0) > TTL_MS) return null;
  return row.messages;
}

export function writePlayerChatCache(userId, messages) {
  const uid = String(userId || '').trim();
  if (!uid || !Array.isArray(messages)) return;
  writeJson(KEY, {
    userId: uid,
    messages: messages.slice(-MAX_MSG),
    t: Date.now(),
  });
}

/** Warm player chat before opening /chat (deduped by TTL). */
export async function prefetchPlayerChat(userId) {
  const uid = String(userId || '').trim();
  if (!uid || readPlayerChatCache(uid)) return;
  try {
    const res = await fetch(`/api/chat?limit=60&_t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'X-Hood-Player-Chat': '1' },
    });
    const d = await res.json();
    if (d?.success && Array.isArray(d.messages)) writePlayerChatCache(uid, d.messages);
  } catch {
    /* ignore */
  }
}
