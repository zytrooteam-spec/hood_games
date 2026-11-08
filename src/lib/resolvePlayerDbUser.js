import { toIdQuery } from '@/lib/mongodb';

/**
 * Resolve the real MongoDB user row from a getSessionUser() payload.
 * APK/WebView sessions may expose id as ObjectId, string, or stale JWT — email fallback covers mismatches.
 */
export async function resolvePlayerDbUser(session, usersCol) {
  if (!session) return null;

  const idCandidates = new Set();
  for (const key of ['userId', 'id', '_id']) {
    const raw = session[key];
    if (raw == null) continue;
    if (typeof raw === 'object' && typeof raw.toString === 'function') {
      idCandidates.add(raw.toString());
    } else if (typeof raw === 'string' && raw.trim()) {
      idCandidates.add(raw.trim());
    }
  }

  for (const id of idCandidates) {
    const row = await usersCol.findOne(toIdQuery(id));
    if (row) return row;
  }

  const email = String(session.email || '')
    .toLowerCase()
    .trim();
  if (email) {
    const row = await usersCol.findOne({ email });
    if (row) return row;
  }

  const username = String(session.username || '').trim();
  if (username.length >= 2) {
    const row = await usersCol.findOne({
      username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (row) return row;
  }

  return null;
}
