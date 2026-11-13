import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady, ensureDbInitialized } from '@/lib/initDb';
import { ADMIN_BOOTSTRAP_HEAVY_LIMIT } from '@/lib/adminBootstrap.server';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { resolveStaffOrPlayer } from '@/lib/staffOrPlayerApi';
import { requirePlayerDbUser, playerIdentity } from '@/lib/requirePlayerDbUser';
import { publishFinanceDeposit, publishWalletSync } from '@/lib/realtimePublish';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';
import { pulseStaffStatsAsync, pulseStaffScope } from '@/lib/staffDeskPulse.server';
import { listStaffDeposits } from '@/lib/staffDeposits.server';
import { invalidateAuthCache, invalidateGameAccountsCache } from '@/lib/authCache';

export async function GET(req) {
  try {
    await ensureDbReady();
    const { user, isStaff, dbUser } = await resolveStaffOrPlayer(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    let deposits;
    if (isStaff) {
      deposits = await listStaffDeposits(db, { limit: ADMIN_BOOTSTRAP_HEAVY_LIMIT });
    } else {
      const uid = dbUser?._id?.toString() || user.userId || user.id || user._id?.toString?.();
      const email = (dbUser?.email || user.email || '').toLowerCase().trim();
      const filter = email
        ? { $or: [{ userId: uid }, { userEmail: email }] }
        : { userId: uid };
      deposits = await db.collection('deposits').find(filter).sort({ createdAt: -1 }).toArray();
    }

    return NextResponse.json({ success: true, deposits });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const { session, dbUser, error, status } = await requirePlayerDbUser(req);
    if (!dbUser) {
      return NextResponse.json({ success: false, error }, { status: status || 401 });
    }
    if (isStaffRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Staff session detected. Open the site in a player tab with a player login to deposit.' },
        { status: 403 }
      );
    }
    const { userId, username, userEmail } = playerIdentity(dbUser, session);

    const { amount, method, senderTag, proofImage, note, gameTitle, gameAccountUsername } = await req.json();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount < 5) {
      return NextResponse.json({ success: false, error: 'Minimum deposit is $5.00' }, { status: 400 });
    }

  const proofRaw = typeof proofImage === 'string' ? proofImage.trim() : '';
  if (!proofRaw || !proofRaw.startsWith('data:image')) {
    return NextResponse.json(
      { success: false, error: 'Payment receipt screenshot is required (Cash App / Zelle proof).' },
      { status: 400 }
    );
  }

    const db = await getDb();

  const compressedProof = await compressDataUrlIfNeeded(proofRaw, {
    maxChars: 120_000,
    maxSize: 1024,
    quality: 68,
  });
  if (!compressedProof || compressedProof.length > 200_000) {
    return NextResponse.json(
      { success: false, error: 'Screenshot is too large. Please upload a smaller image.' },
      { status: 400 }
    );
  }

    // Check system bonus settings
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const userDepositsCount = await db.collection('deposits').countDocuments({
      userId,
      status: 'approved',
    });

    const isFirstDeposit = userDepositsCount === 0;
    const bonusPercent = isFirstDeposit
      ? Number(settings?.welcomeBonusPercent ?? 300)
      : Number(settings?.regularBonusPercent ?? 50);

    const bonusAmount = Number(((numAmount * bonusPercent) / 100).toFixed(2));
    const totalExpectedSC = Number((numAmount + bonusAmount).toFixed(2));

    const depositDoc = {
      userId,
      username,
      userEmail,
      amount: numAmount,
      bonusPercent,
      bonusAmount,
      totalExpectedSC,
      method: method || 'Cash App',
      senderTag: senderTag || '',
      proofImage: compressedProof,
      hasProof: true,
      note: note || '',
      gameTitle: (gameTitle || '').trim() || null,
      gameAccountUsername: (gameAccountUsername || '').trim() || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('deposits').insertOne(depositDoc);

    // Notify staff desk of new incoming deposit!
    notifyStaff({
      title: `Incoming $${numAmount} Deposit from ${username}`,
      message: `Method: ${method || 'Cash App'} | Game: ${gameTitle || 'Wallet'} | Tag: ${senderTag || 'N/A'}`,
      type: 'deposit_request',
      data: { depositId: res.insertedId.toString() },
    });

    publishFinanceDeposit({
      action: 'created',
      status: 'pending',
      depositId: res.insertedId.toString(),
      amount: numAmount,
      username,
      userEmail,
      userId,
    });
    pulseStaffStatsAsync();
    pulseStaffScope('finance');

    return NextResponse.json({
      success: true,
      deposit: { ...depositDoc, _id: res.insertedId },
      message: 'Deposit submitted! Awaiting staff verification.',
    });
  } catch (err) {
    console.error('Deposit error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Staff approval or rejection
export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const { depositId, action, rejectionReason } = await req.json();
    if (!depositId || !action) {
      return NextResponse.json({ success: false, error: 'Deposit ID and action required' }, { status: 400 });
    }

    const db = await getDb();
    const pendingFilter = { ...toIdQuery(depositId), status: 'pending' };
    const deposit = await db.collection('deposits').findOne(pendingFilter);
    if (!deposit) {
      const existing = await db.collection('deposits').findOne(toIdQuery(depositId));
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 });
      }
      return NextResponse.json(
        { success: false, error: `Deposit is already ${existing.status}` },
        { status: 409 }
      );
    }

    if (action === 'approve') {
      const creditAmount = Number(deposit.totalExpectedSC || deposit.amount);
      const stamp = new Date();

      const lock = await db.collection('deposits').updateOne(pendingFilter, {
        $set: {
          status: 'approved',
          approvedBy: user.username,
          approvedAt: stamp,
          updatedAt: stamp,
        },
      });

      if (lock.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Deposit was already processed by another staff member' },
          { status: 409 }
        );
      }

      await db.collection('users').updateOne(toIdQuery(deposit.userId), {
        $inc: { balanceSC: creditAmount, availableSpins: 2 },
      });

      await db.collection('ledger').insertOne({
        userId: deposit.userId,
        username: deposit.username,
        type: 'deposit',
        amount: creditAmount,
        currency: 'SC',
        description: `Deposit via ${deposit.method} (Includes +$${deposit.bonusAmount} match bonus)`,
        referenceId: depositId,
        createdAt: stamp,
      });

      notifyPlayer({
        userId: deposit.userId,
        title: '💰 Deposit Approved & Credited!',
        message: `Your deposit of $${deposit.amount} (+ $${deposit.bonusAmount} bonus) has been credited. +$${creditAmount} SC added to your wallet!`,
        type: 'deposit_approved',
      });

      publishFinanceDeposit({
        action: 'updated',
        status: 'approved',
        depositId: String(depositId),
        amount: deposit.amount,
        username: deposit.username,
        userEmail: deposit.userEmail,
        userId: deposit.userId,
      });
      pulseStaffStatsAsync();
      pulseStaffScope('finance');

      if (deposit.userId) invalidateAuthCache(String(deposit.userId));
      if (deposit.userEmail) invalidateGameAccountsCache(deposit.userEmail);

      const updatedPlayer = await db.collection('users').findOne(toIdQuery(deposit.userId), {
        projection: { balanceSC: 1, balanceGC: 1, frozenBalance: 1, email: 1 },
      });
      if (updatedPlayer) {
        publishWalletSync({
          userId: String(deposit.userId),
          userEmail: deposit.userEmail || updatedPlayer.email,
          balanceSC: Number(updatedPlayer.balanceSC || 0),
          balanceGC: Number(updatedPlayer.balanceGC || 0),
          frozenBalance: Number(updatedPlayer.frozenBalance || 0),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Deposit approved and balance credited!',
        deposit: { _id: depositId, status: 'approved' },
      });
    } else if (action === 'reject') {
      const stamp = new Date();
      const lock = await db.collection('deposits').updateOne(pendingFilter, {
        $set: {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Payment could not be verified on our records.',
          rejectedBy: user.username,
          rejectedAt: stamp,
          updatedAt: stamp,
        },
      });

      if (lock.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Deposit was already processed by another staff member' },
          { status: 409 }
        );
      }

      notifyPlayer({
        userId: deposit.userId,
        title: '❌ Deposit Not Approved',
        message: `Deposit of $${deposit.amount} could not be verified. Note: ${rejectionReason || 'Contact live support for assistance.'}`,
        type: 'deposit_rejected',
      });

      publishFinanceDeposit({
        action: 'updated',
        status: 'rejected',
        depositId: String(depositId),
        amount: deposit.amount,
        username: deposit.username,
        userEmail: deposit.userEmail,
        userId: deposit.userId,
      });
      pulseStaffStatsAsync();
      pulseStaffScope('finance');

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected',
        deposit: { _id: depositId, status: 'rejected' },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Deposit PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
