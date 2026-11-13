/** Fast staff inbox: thread docs + denormalized unread (Paradise-style). */

function previewText(text, imageUrl) {
  const t = (text || '').trim();
  if (t) return t.slice(0, 200);
  if (imageUrl) return '📷 Image attachment';
  return '';
}

async function buildUnreadMap(db) {
  const rows = await db
    .collection('chat_messages')
    .aggregate([
      { $match: { senderRole: 'player', read: { $ne: true } } },
      {
        $group: {
          _id: { $toString: '$userId' },
          unreadCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  return new Map(rows.map((r) => [String(r._id), Number(r.unreadCount || 0)]));
}

function resolveThreadUnread(tm, unreadMap) {
  const uid = String(tm.userId);
  const fromAgg = unreadMap.get(uid);
  if (fromAgg !== undefined) return fromAgg;
  if (typeof tm.unreadForStaff === 'number') return Math.max(0, tm.unreadForStaff);
  return 0;
}

export async function buildStaffChatThreads(db, { limit = 80 } = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 80));
  const [threadMetas, unreadMap] = await Promise.all([
    db
      .collection('chat_threads')
      .find({})
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(safeLimit)
      .toArray(),
    buildUnreadMap(db),
  ]);

  if (threadMetas.length > 0) {
    return threadMetas.map((tm) => ({
      userId: String(tm.userId),
      username: tm.username || 'Player',
      userEmail: tm.userEmail || '',
      lastMessage: tm.lastMessage || '',
      lastMessageAt: tm.lastMessageAt || tm.updatedAt,
      unreadCount: resolveThreadUnread(tm, unreadMap),
      labels: tm.labels || [],
      staffNotes: tm.staffNotes || [],
    }));
  }

  const latest = await db
    .collection('chat_messages')
    .aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toString: '$userId' },
          username: { $first: '$username' },
          userEmail: { $first: '$userEmail' },
          lastText: { $first: '$text' },
          lastImage: { $first: '$imageUrl' },
          lastMessageAt: { $first: '$createdAt' },
        },
      },
      { $limit: safeLimit },
    ])
    .toArray();

  return latest.map((t) => ({
    userId: String(t._id),
    username: t.username || 'Player',
    userEmail: t.userEmail || '',
    lastMessage: previewText(t.lastText, t.lastImage),
    lastMessageAt: t.lastMessageAt,
    unreadCount: unreadMap.get(String(t._id)) || 0,
    labels: [],
    staffNotes: [],
  }));
}

export async function clearStaffThreadUnread(db, userId) {
  const uid = String(userId || '');
  if (!uid) return;
  await db.collection('chat_threads').updateOne(
    { userId: uid },
    { $set: { unreadForStaff: 0, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function touchChatThreadOnMessage(db, {
  userId,
  username,
  userEmail,
  text,
  imageUrl,
  senderRole,
}) {
  const uid = String(userId);
  const preview = previewText(text, imageUrl);
  const now = new Date();
  const op = {
    $set: {
      userId: uid,
      username: username || 'Player',
      userEmail: userEmail || '',
      lastMessage: preview,
      lastMessageAt: now,
      updatedAt: now,
    },
  };
  if (senderRole === 'player') {
    op.$inc = { unreadForStaff: 1 };
  }
  await db.collection('chat_threads').updateOne({ userId: uid }, op, { upsert: true });
}
