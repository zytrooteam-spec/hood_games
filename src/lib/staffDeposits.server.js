import { STAFF_LIST_LIMIT } from '@/lib/adminStats.server';

/** Staff deposit list without shipping multi-MB proof images over the wire. */
export async function listStaffDeposits(db, { limit = STAFF_LIST_LIMIT, pendingOnly = false } = {}) {
  const query = pendingOnly ? { status: 'pending' } : {};
  const rows = await db
    .collection('deposits')
    .find(query, { projection: { proofImage: 0, receiptImage: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return rows.map((d) => ({
    ...d,
    _id: d._id?.toString?.() || d._id,
    hasProof: Boolean(d.hasProof),
  }));
}
