/** Fast staff inbox: thread docs + unread aggregation (no full message scan). */

function previewText(text, imageUrl) {
  const t = (text || '').trim();
  if (t) return t.slice(0, 200);
  if (imageUrl) return '📷 Image attachment';
  return '';
}

export async function buildStaffChatThreads(db, { limit = 400 } = {}) {
  const [threadMetas, unreadAgg] = await Promise.all([
    db
      .collection('chat_threads')
      .find({})
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(limit)
      .toArray(),
    db
      .collection('chat_messages')
      .aggregate([
        { $match: { senderRole: 'player', read: { $ne: true } } },
        { $group: { _id: '$userId', unreadCount: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const unreadMap = new Map(unreadAgg.map((r) => [String(r._id), Number(r.unreadCount || 0)]));

  if (threadMetas.length > 0) {
    return threadMetas.map((tm) => ({
      userId: String(tm.userId),
      username: tm.username || 'Player',
      userEmail: tm.userEmail || '',
      lastMessage: tm.lastMessage || '',
      lastMessageAt: tm.lastMessageAt || tm.updatedAt,
      unreadCount: unreadMap.get(String(tm.userId)) || 0,
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
          _id: '$userId',
          username: { $first: '$username' },
          userEmail: { $first: '$userEmail' },
          lastText: { $first: '$text' },
          lastImage: { $first: '$imageUrl' },
          lastMessageAt: { $first: '$createdAt' },
        },
      },
      { $limit: limit },
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
  await db.collection('chat_threads').updateOne(
    { userId: uid },
    {
      $set: {
        userId: uid,
        username: username || 'Player',
        userEmail: userEmail || '',
        lastMessage: preview,
        lastMessageAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}
