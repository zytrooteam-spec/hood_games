import { STAFF_LIST_LIMIT } from '@/lib/adminStats.server';

/** Staff deposit list without shipping multi-MB proof images over the wire. */
export async function listStaffDeposits(db, { limit = STAFF_LIST_LIMIT } = {}) {
  const rows = await db
    .collection('deposits')
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $addFields: {
          hasProof: {
            $cond: [
              { $eq: ['$hasProof', true] },
              true,
              {
                $or: [
                  { $gt: [{ $strLenCP: { $ifNull: ['$proofImage', ''] } }, 0] },
                  { $gt: [{ $strLenCP: { $ifNull: ['$receiptImage', ''] } }, 0] },
                ],
              },
            ],
          },
        },
      },
      { $project: { proofImage: 0, receiptImage: 0 } },
    ])
    .toArray();

  return rows.map((d) => ({
    ...d,
    _id: d._id?.toString?.() || d._id,
    hasProof: Boolean(d.hasProof),
  }));
}
