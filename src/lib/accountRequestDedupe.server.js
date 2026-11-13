import { sanitizeGameTitle } from '@/lib/fastDiff';

function pendingKey(row) {
  const email = String(row.userEmail || row.email || '').toLowerCase().trim();
  const game = sanitizeGameTitle(row.gameTitle || '');
  return `${email}||${game}`;
}

function isGameIdPendingRow(row) {
  const st = String(row.status || '').toUpperCase();
  if (st !== 'PENDING') return false;
  if (row.requestType === 'COIN_LOAD') return false;
  if (Number(row.transferAmount || 0) > 0) return false;
  return true;
}

/** Staff list: one pending row per player+game (newest wins). */
export function dedupeStaffPendingGameIdRequests(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];
  const keepIds = new Set();
  const byKey = new Map();

  const pending = rows.filter(isGameIdPendingRow);
  const rest = rows.filter((r) => !isGameIdPendingRow(r));

  pending.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  for (const r of pending) {
    const key = pendingKey(r);
    if (!key || key === '||') {
      keepIds.add(String(r.id || r._id));
      continue;
    }
    if (!byKey.has(key)) {
      byKey.set(key, r);
      keepIds.add(String(r.id || r._id));
    }
  }

  const dedupedPending = pending.filter((r) => keepIds.has(String(r.id || r._id)));
  return [...dedupedPending, ...rest].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/** DB cleanup: keep newest pending per player+game; auto-reject older duplicates. */
export async function autoCloseDuplicatePendingInDb(db, rows) {
  if (!db || !Array.isArray(rows) || rows.length < 2) return 0;
  const groups = new Map();

  for (const r of rows) {
    const st = String(r.status || '').toLowerCase();
    if (st !== 'pending') continue;
    if (r.requestType === 'COIN_LOAD' || Number(r.transferAmount || 0) > 0) continue;
    const key = `${String(r.userId || '')}|${sanitizeGameTitle(r.gameTitle || '')}`;
    if (!key || key === '|') continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  let closed = 0;
  const now = new Date();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const stale = list.slice(1);
    const ids = stale.map((r) => r._id).filter(Boolean);
    if (!ids.length) continue;
    const res = await db.collection('accountRequests').updateMany(
      { _id: { $in: ids }, status: { $in: ['pending', 'PENDING', 'Pending'] } },
      {
        $set: {
          status: 'rejected',
          rejectionReason: 'Duplicate request — staff desk shows the newest pending only.',
          rejectedAt: now,
          updatedAt: now,
        },
      }
    );
    closed += res.modifiedCount || 0;
  }
  return closed;
}

export function annotateRepeatPendingFlags(rows) {
  if (!Array.isArray(rows)) return rows;
  const rejectedKeys = new Set();
  for (const r of rows) {
    const st = String(r.status || '').toUpperCase();
    if (st !== 'REJECTED' && st !== 'CANCELLED') continue;
    rejectedKeys.add(pendingKey(r));
  }
  return rows.map((r) => {
    if (!isGameIdPendingRow(r)) return r;
    const key = pendingKey(r);
    if (!rejectedKeys.has(key)) return r;
    return { ...r, priorRejectedForGame: true };
  });
}
