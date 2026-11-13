/** Admin dashboard counters — aggregation only (no full collection scans). */

export async function computeAdminStats(db) {
  const [
    totalUsers,
    pendingDeposits,
    pendingRedemptions,
    pendingAccountRequests,
    pendingCoinLoads,
    depositVolAgg,
    redeemVolAgg,
  ] = await Promise.all([
    db.collection('users').countDocuments({ role: 'player' }),
    db.collection('deposits').countDocuments({ status: 'pending' }),
    db.collection('redemptions').countDocuments({
      status: 'pending',
      $or: [{ stage: 'finance_payout' }, { stage: { $exists: false } }, { stage: null }],
    }),
    db.collection('accountRequests').countDocuments({
      status: { $in: ['pending', 'PENDING', 'Pending'] },
      $nor: [{ requestType: 'COIN_LOAD' }, { transferAmount: { $gt: 0 } }],
    }),
    db.collection('accountRequests').countDocuments({
      status: { $in: ['pending', 'PENDING', 'Pending'] },
      $or: [{ requestType: 'COIN_LOAD' }, { transferAmount: { $gt: 0 } }],
    }),
    db
      .collection('deposits')
      .aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
      ])
      .toArray(),
    db
      .collection('redemptions')
      .aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
      ])
      .toArray(),
  ]);

  const totalDepositVol = Number(depositVolAgg[0]?.total || 0);
  const totalRedeemVol = Number(redeemVolAgg[0]?.total || 0);

  return {
    totalUsers,
    pendingDeposits,
    pendingRedemptions,
    pendingAccountRequests,
    pendingCoinLoads,
    totalDepositVol,
    totalRedeemVol,
    netRevenue: totalDepositVol - totalRedeemVol,
  };
}

export const STAFF_FINANCE_PROJECTION = {
  proofImage: 0,
  receiptImage: 0,
};

export const STAFF_LIST_LIMIT = 400;
