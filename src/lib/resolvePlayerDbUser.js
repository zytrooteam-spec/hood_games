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

  const email = String(session.email || '')
    .toLowerCase()
    .trim();
  const username = String(session.username || '').trim();

  const orClauses = [];
  for (const id of idCandidates) {
    orClauses.push(toIdQuery(id));
  }
  if (email) orClauses.push({ email });
  if (username.length >= 2) {
    orClauses.push({
      username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
  }
  if (orClauses.length === 0) return null;

  const flatOr = orClauses.flatMap((c) => (c.$or ? c.$or : [c]));
  const row = await usersCol.findOne({ $or: flatOr });
  return row || null;
}
