/** Map Hood DB doc → Players Paradise admin desk shape */
export function mapAccountRequest(r) {
  const raw = String(r.status || 'pending').toLowerCase();
  let status = 'PENDING';
  if (raw === 'approved' || raw === 'ready') status = 'READY';
  else if (raw === 'rejected' || raw === 'cancelled') status = 'REJECTED';
  else if (raw === 'dismissed') status = 'DISMISSED';
  else if (raw === 'pending') status = 'PENDING';
  else status = String(r.status || 'PENDING').toUpperCase();

  const transferAmount = Number(r.transferAmount || 0);
  const requestType =
    r.requestType ||
    (transferAmount > 0 ? 'COIN_LOAD' : 'ACCOUNT_CREATION');

  return {
    id: r._id?.toString?.() || r.id,
    _id: r._id?.toString?.() || r.id,
    userId: r.userId,
    userEmail: r.userEmail || r.email || '',
    userName: r.userName || r.username || '',
    username: r.username || r.userName || '',
    gameTitle: r.gameTitle,
    gameId: r.gameId || '',
    requestType,
    status,
    gameAccountUsername: r.gameAccountUsername || r.gameUsername || '',
    gameAccountPassword: r.gameAccountPassword || r.gamePassword || '',
    gameUsername: r.gameUsername || r.gameAccountUsername || '',
    gamePassword: r.gamePassword || r.gameAccountPassword || '',
    transferAmount,
    pendingCoinLoadAmount: Number(r.pendingCoinLoadAmount || transferAmount || 0),
    depositAmount: Number(r.depositAmount || 0),
    bonusSC: Number(r.bonusSC || 0),
    bonusPercent: Number(r.bonusPercent || 0),
    coinLoadQueued: Boolean(r.coinLoadQueued),
    freeplayPending: Boolean(r.freeplayPending),
    freeplayAmount: Number(r.freeplayAmount || 0),
    freeplayScreenshot: r.freeplayScreenshot || r.screenshot || '',
    freeplayTaskId: r.freeplayTaskId || '',
    notes: r.notes || '',
    rejectionReason: r.rejectionReason || r.rejectReason || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
