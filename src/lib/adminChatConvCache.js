import { HOOD_ADMIN_CHAT_CONV_CACHE, readJson, writeJson } from '@/lib/clientCache';

const MAX_THREADS = 48;

export function readAdminChatThreadCache(userId) {
  const uid = String(userId || '');
  if (!uid) return null;
  const store = readJson(HOOD_ADMIN_CHAT_CONV_CACHE);
  if (!store || typeof store !== 'object') return null;
  const row = store[uid];
  if (!row || !Array.isArray(row.messages)) return null;
  return row;
}

export function writeAdminChatThreadCache(userId, payload) {
  const uid = String(userId || '');
  if (!uid || !payload) return;
  const prev = readJson(HOOD_ADMIN_CHAT_CONV_CACHE) || {};
  prev[uid] = { ...payload, t: Date.now() };
  const ordered = Object.entries(prev).sort((a, b) => (b[1]?.t || 0) - (a[1]?.t || 0));
  const trimmed = {};
  ordered.slice(0, MAX_THREADS).forEach(([id, val]) => {
    trimmed[id] = val;
  });
  writeJson(HOOD_ADMIN_CHAT_CONV_CACHE, trimmed);
}
