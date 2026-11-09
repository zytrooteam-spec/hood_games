/** Live Support threads — instant SSE bumps + poll merge. */

export function threadKey(t) {
  return String(t?.userId || t?._id || '');
}

export function mergeChatThreadsPreservingUnread(local, remote, { exceptUserId = null } = {}) {
  const localMap = new Map((local || []).map((c) => [threadKey(c), c]));
  const remoteIds = new Set((remote || []).map((c) => threadKey(c)));
  const merged = (remote || []).map((c) => {
    const id = threadKey(c);
    if (exceptUserId && id === String(exceptUserId)) {
      return { ...c, unreadCount: 0 };
    }
    const loc = localMap.get(id);
    if (!loc) return c;
    const localUnread = Number(loc.unreadCount || 0);
    const remoteUnread = Number(c.unreadCount || 0);
    let unreadCount = Math.max(localUnread, remoteUnread);
    if (remoteUnread > 0 && localUnread > remoteUnread) {
      unreadCount = remoteUnread;
    }
    const locTs = new Date(loc.lastMessageAt || loc.updatedAt || 0).getTime();
    const remTs = new Date(c.lastMessageAt || c.updatedAt || 0).getTime();
    return {
      ...c,
      unreadCount,
      lastMessage: locTs > remTs ? loc.lastMessage : c.lastMessage,
      lastMessageAt: locTs > remTs ? loc.lastMessageAt : c.lastMessageAt,
      username: loc.username && loc.username !== 'Player' ? loc.username : c.username,
    };
  });
  const orphanLocal = (local || []).filter((lc) => !remoteIds.has(threadKey(lc)));
  return [...orphanLocal, ...merged].sort(
    (a, b) =>
      new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
      new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
  );
}

export function createChatInboxDedup() {
  const seen = new Set();
  return (key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    setTimeout(() => seen.delete(key), 5000);
    return true;
  };
}

export function applyInboundChatThreadBump(setChatThreads, payload, ctx) {
  const uid = String(payload.userId || payload.conversationId || '').trim();
  if (!uid) return;
  const snippet = String(payload.text || payload.message?.text || 'New message').slice(0, 160);
  const uName = payload.username || payload.message?.username || 'Player';
  const ts = payload.timestamp || payload.time || Date.now();
  const openUid = String(ctx.selectedThreadUserRef?.current || '');
  const viewingThread = ctx.activeTabRef?.current === 'chat' && openUid && openUid === uid;

  setChatThreads((prev) => {
    const idx = prev.findIndex((t) => threadKey(t) === uid);
    const next = {
      ...(idx >= 0 ? prev[idx] : {}),
      userId: uid,
      username: uName,
      lastMessage: snippet,
      lastMessageAt: new Date(ts).toISOString(),
      unreadCount: viewingThread ? 0 : Number(idx >= 0 ? prev[idx].unreadCount || 0 : 0) + 1,
    };
    const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
    return [next, ...rest];
  });
}

export function dedupeChatMessagesById(msgs) {
  if (!Array.isArray(msgs) || msgs.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const m of msgs) {
    const id = String(m?.id || m?._id || '').trim();
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ ...m, id });
      continue;
    }
    out.push(m);
  }
  return out;
}
