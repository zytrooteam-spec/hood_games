import { toIdQuery } from '@/lib/mongodb';

export function canonicalPlayerUserId(dbUser) {
  if (!dbUser?._id) return '';
  return dbUser._id.toString();
}

/** Match messages stored under legacy userId / email keys. */
export function buildPlayerChatMessageQuery(dbUser) {
  const ownerId = canonicalPlayerUserId(dbUser);
  const email = String(dbUser?.email || '')
    .toLowerCase()
    .trim();
  const or = [{ userId: ownerId }];
  if (email) or.push({ userEmail: email });
  return { $or: or };
}

export async function resolveStaffChatTargetUser(db, targetUserId) {
  const raw = String(targetUserId || '').trim();
  if (!raw) return null;
  const player = await db.collection('users').findOne(toIdQuery(raw), {
    projection: { _id: 1, username: 1, email: 1 },
  });
  if (!player) return { userId: raw, username: 'Player', email: '' };
  return {
    userId: player._id.toString(),
    username: player.username || 'Player',
    email: (player.email || '').toLowerCase().trim(),
  };
}
