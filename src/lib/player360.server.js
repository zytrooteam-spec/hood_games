import bcrypt from 'bcryptjs';
import { toIdQuery } from '@/lib/mongodb';
import { invalidateAuthCache } from '@/lib/authCache';

const APPROVED_DEPOSIT = { $in: ['approved', 'APPROVED', 'COMPLETED', 'completed'] };
const PAID_WITHDRAW = { $in: ['approved', 'APPROVED', 'COMPLETED', 'completed', 'PAID', 'paid'] };

export async function findPlayerByStaffId(db, userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  let u = await db.collection('users').findOne(toIdQuery(id), { projection: { password: 0 } });
  if (!u && id.includes('@')) {
    u = await db.collection('users').findOne({ email: id.toLowerCase() }, { projection: { password: 0 } });
  }
  if (!u) {
    u = await db.collection('users').findOne(
      { username: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { projection: { password: 0 } }
    );
  }
  return u;
}

function ownerFilter(u) {
  const uIdStr = u._id.toString();
  const uEmail = (u.email || '').toLowerCase().trim();
  const uUsername = u.username || '';
  return {
    $or: [
      { userId: uIdStr },
      { userEmail: uEmail },
      { username: uUsername },
      { userName: uUsername },
    ],
  };
}

export async function buildPlayer360(db, userId) {
  const u = await findPlayerByStaffId(db, userId);
  if (!u) return null;

  const filter = ownerFilter(u);
  const uIdStr = u._id.toString();
  const uEmail = (u.email || '').toLowerCase().trim();
  const uUsername = u.username || '';

  const [
    deposits,
    withdrawals,
    gameAccounts,
    accountRequests,
    referrals,
    ledger,
    depAgg,
    withAgg,
  ] = await Promise.all([
    db
      .collection('deposits')
      .find(filter, { projection: { proofImage: 0, receiptImage: 0 } })
      .sort({ createdAt: -1 })
      .limit(80)
      .toArray(),
    db
      .collection('redemptions')
      .find(filter, { projection: { proofImage: 0, gameScreenshot: 0, qrCodeImage: 0 } })
      .sort({ createdAt: -1 })
      .limit(80)
      .toArray(),
    db.collection('game_accounts').find({ $or: [{ userId: uIdStr }, { userEmail: uEmail }] }).sort({ updatedAt: -1 }).toArray(),
    db.collection('accountRequests').find(filter).sort({ createdAt: -1 }).limit(50).toArray(),
    db
      .collection('users')
      .find({
        $or: [{ referredBy: uUsername }, { referredByCode: u.referralCode || '___none___' }],
        role: { $in: ['player', null] },
      })
      .project({ username: 1, email: 1, createdAt: 1, balanceSC: 1 })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
    db
      .collection('ledger')
      .find({ $or: [{ userId: uIdStr }, { username: uUsername }] })
      .sort({ createdAt: -1 })
      .limit(60)
      .toArray(),
    db
      .collection('deposits')
      .aggregate([
        { $match: { ...filter, status: APPROVED_DEPOSIT } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection('redemptions')
      .aggregate([
        { $match: { ...filter, status: PAID_WITHDRAW } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const totalDepositsAmount = Number(depAgg[0]?.total || 0);
  const totalWithdrawalsAmount = Number(withAgg[0]?.total || 0);
  const isBanned = u.status === 'banned' || u.status === 'suspended';

  return {
    user: {
      id: uIdStr,
      _id: uIdStr,
      username: u.username,
      email: u.email,
      balanceSC: Number(u.balanceSC || 0),
      balanceGC: Number(u.balanceGC || 0),
      role: u.role || 'player',
      status: u.status || 'active',
      isBanned,
      referralCode: u.referralCode || '',
      referredBy: u.referredBy || u.referredByCode || '',
      deviceId: u.deviceId || u.lastLoginDevice || u.boundDevices?.[0] || null,
      boundDevices: u.boundDevices || [],
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      isVerified: Boolean(u.isVerified),
    },
    deposits: deposits.map((d) => ({
      id: String(d._id),
      amount: Number(d.amount || 0),
      methodName: d.method || d.methodName || 'Payment',
      status: String(d.status || 'pending').toUpperCase(),
      senderTag: d.senderTag || '',
      note: d.note || '',
      hasProof: Boolean(d.hasProof),
      createdAt: d.createdAt,
    })),
    withdrawals: withdrawals.map((w) => ({
      id: String(w._id),
      amount: Number(w.amount || 0),
      gameTitle: w.gameTitle || '—',
      payoutMethod: w.method || w.payoutMethod || '—',
      destinationAddress: w.payoutAddress || w.destinationAddress || '',
      status: String(w.status || 'pending').toUpperCase(),
      hasProof: Boolean(w.hasProof || w.gameScreenshot),
      createdAt: w.createdAt,
    })),
    gameAccounts: gameAccounts.map((g) => ({
      id: String(g._id),
      gameTitle: g.gameTitle || g.platform || 'Game',
      username: g.username || g.gameUsername || '',
      password: g.password || g.gamePassword || '',
      status: g.status || 'READY',
      createdAt: g.createdAt,
    })),
    accountRequests: accountRequests.map((r) => ({
      id: String(r._id),
      gameTitle: r.gameTitle,
      transferAmount: Number(r.transferAmount || 0),
      status: String(r.status || 'pending').toUpperCase(),
      createdAt: r.createdAt,
    })),
    referrals: referrals.map((ref) => ({
      id: ref._id.toString(),
      username: ref.username,
      email: ref.email,
      balanceSC: Number(ref.balanceSC || 0),
      createdAt: ref.createdAt,
    })),
    ledger: ledger.map((l) => ({
      id: String(l._id),
      type: l.type || l.action || 'ADJUSTMENT',
      amount: Number(l.amount || 0),
      balanceAfter: l.balanceAfter,
      reason: l.reason || l.note || '',
      processedBy: l.processedBy || l.performedBy || l.staffUsername || 'System',
      createdAt: l.createdAt,
    })),
    stats: {
      totalDepositsAmount,
      totalWithdrawalsAmount,
      netMargin: Number((totalDepositsAmount - totalWithdrawalsAmount).toFixed(2)),
      referralsCount: referrals.length,
      gameAccountsCount: gameAccounts.length,
      depositsCount: depAgg[0]?.count || deposits.length,
      withdrawalsCount: withAgg[0]?.count || withdrawals.length,
    },
  };
}

export async function listPlayerDirectory(db, { search = '', limit = 100 } = {}) {
  const query = { role: { $in: ['player', null] } };
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { referralCode: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await db
    .collection('users')
    .find(query, { projection: { password: 0, boundDevices: 0 } })
    .sort({ createdAt: -1 })
    .limit(Math.min(200, limit))
    .toArray();

  return users.map((u) => {
    const uIdStr = u._id.toString();
    return {
      id: uIdStr,
      _id: uIdStr,
      username: u.username,
      email: u.email,
      balanceSC: Number(u.balanceSC || 0),
      balanceGC: Number(u.balanceGC || 0),
      role: u.role || 'player',
      status: u.status || 'active',
      isBanned: u.status === 'banned' || u.status === 'suspended',
      referralCode: u.referralCode || '',
      deviceId: u.deviceId || null,
      createdAt: u.createdAt,
    };
  });
}

export async function applyStaffPlayerAction(db, session, { userId, action, reason, newPassword, balanceAdjustment }) {
  const target = await findPlayerByStaffId(db, userId);
  if (!target) return { ok: false, status: 404, error: 'User not found.' };
  const targetFilter = toIdQuery(target._id);
  const staffName = session.username || 'Staff';

  if (action === 'toggleBan') {
    const bannedNow = target.status !== 'banned' && target.status !== 'suspended';
    const nextStatus = bannedNow ? 'banned' : 'active';
    await db.collection('users').updateOne(targetFilter, {
      $set: {
        status: nextStatus,
        banReason: bannedNow ? reason || 'Terms violation' : null,
        updatedAt: new Date(),
      },
    });
    return {
      ok: true,
      isBanned: bannedNow,
      message: bannedNow ? 'Player account banned.' : 'Player account restored.',
    };
  }

  if (action === 'resetPassword') {
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(targetFilter, { $set: { password: hash, updatedAt: new Date() } });
    return { ok: true, message: 'Password reset successfully.' };
  }

  if (action === 'resetDevice') {
    await db.collection('users').updateOne(targetFilter, {
      $set: {
        deviceId: '',
        lastLoginDevice: '',
        boundDevices: [],
        updatedAt: new Date(),
      },
    });
    return { ok: true, message: 'Device binding cleared.' };
  }

  if (action === 'adjustBalance') {
    const amount = Number(balanceAdjustment);
    if (!Number.isFinite(amount) || amount === 0) {
      return { ok: false, status: 400, error: 'Invalid adjustment amount.' };
    }
    const newBalance = Math.max(0, Number(target.balanceSC || 0) + amount);
    await db.collection('users').updateOne(targetFilter, { $set: { balanceSC: newBalance, updatedAt: new Date() } });
    await db.collection('ledger').insertOne({
      userId: target._id.toString(),
      username: target.username,
      type: amount > 0 ? 'STAFF_CREDIT' : 'STAFF_DEBIT',
      amount: Math.abs(amount),
      currency: 'SC',
      balanceAfter: newBalance,
      reason: reason || 'Staff adjustment',
      processedBy: staffName,
      createdAt: new Date(),
    });
    invalidateAuthCache(target._id.toString());
    return { ok: true, newBalance, message: `Balance updated to $${newBalance.toFixed(2)}` };
  }

  return { ok: false, status: 400, error: 'Unknown action.' };
}
