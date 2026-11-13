import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady, ensureDbInitialized } from '@/lib/initDb';
import { ADMIN_BOOTSTRAP_HEAVY_LIMIT } from '@/lib/adminBootstrap.server';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { publishFinanceWithdraw, publishWalletSync } from '@/lib/realtimePublish';
import { pulseStaffStatsAsync, pulseStaffScope } from '@/lib/staffDeskPulse.server';

function deferRedemptionSideEffects(payload) {
  const { userId, userEmail, username, redeemAmount, requestedGame, res } = payload;
  publishFinanceWithdraw({
    action: 'created',
    status: 'pending_coin',
    redemptionId: res.insertedId.toString(),
    amount: redeemAmount,
    username,
    userEmail,
    userId,
  });
  pulseStaffScope('finance');
  notifyPlayer({
    userId,
    userEmail,
    username,
    title: 'Cashout request submitted',
    message: `Your $${redeemAmount.toFixed(2)} SC cashout was sent to Coin Operations for game verification.`,
    type: 'withdraw_pending_coin',
  });
  notifyStaff({
    title: 'New cashout (coin verification)',
    message: `@${username} — $${redeemAmount.toFixed(2)} SC from ${requestedGame}`,
    type: 'withdraw_request',
    data: { redemptionId: res.insertedId.toString() },
  });
  pulseStaffStatsAsync();
}

function pulseRedemptionDesk(redemption, patch = {}) {
  publishFinanceWithdraw({
    action: 'updated',
    redemptionId: String(redemption._id),
    amount: redemption.amount,
    username: redemption.username,
    userEmail: redemption.userEmail,
    userId: redemption.userId,
    ...patch,
  });
  pulseStaffStatsAsync();
  pulseStaffScope('finance');
}
import { resolveStaffOrPlayer } from '@/lib/staffOrPlayerApi';
import { requirePlayerDbUser, playerIdentity } from '@/lib/requirePlayerDbUser';
import { findUserGameAccount } from '@/lib/gameAccounts';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';

function mapRedemptionRow(r) {
  const id = r._id?.toString?.() || r._id;
  const hasScreenshot = Boolean(r.gameScreenshot);
  const hasQr = Boolean(r.qrCodeImage);
  let resolvedScreenshot = null;
  if (hasScreenshot) {
    resolvedScreenshot = r.gameScreenshot?.startsWith('data:')
      ? `/api/payments/withdraw/proof?id=${id}&type=gameScreenshot`
      : r.gameScreenshot;
  }
  let resolvedQrCode = null;
  if (hasQr) {
    resolvedQrCode = r.qrCodeImage?.startsWith('data:')
      ? `/api/payments/withdraw/proof?id=${id}&type=qrCodeImage`
      : r.qrCodeImage;
  }
  return {
    ...r,
    id,
    _id: id,
    amount: r.amount,
    gameTitle: r.gameTitle || 'Standard Platform',
    gameAccountUsername: r.gameAccountUsername || '',
    gameScreenshot: resolvedScreenshot,
    qrCodeImage: resolvedQrCode,
    hasScreenshot,
    hasQrCode: hasQr,
    payoutMethod: r.payoutMethod || r.method || 'Cash App',
    method: r.payoutMethod || r.method || 'Cash App',
    destinationTag: r.destinationTag || r.payoutAddress || '',
    payoutAddress: r.payoutAddress || r.destinationTag || '',
    destinationAddress: r.destinationAddress || r.destinationTag || r.payoutAddress || '',
    status: r.status,
    stage: r.stage || (r.status === 'pending_coin' ? 'coin_verification' : 'finance_payout'),
    rejectReason: r.rejectReason || r.coinRejectReason || r.financeRejectReason || r.rejectionReason || null,
    coinRejectReason: r.coinRejectReason || null,
    financeRejectReason: r.financeRejectReason || null,
    createdAt: r.createdAt,
  };
}

export async function GET(req) {
  try {
    await ensureDbReady();
    const { user, isStaff, dbUser } = await resolveStaffOrPlayer(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const lightweight = searchParams.get('lightweight') === 'true';

    const noBlobProjection = {
      proofImage: 0,
      gameScreenshot: lightweight ? 0 : undefined,
      qrCodeImage: lightweight ? 0 : undefined,
    };

    let redemptions;
    if (isStaff) {
      const filter = statusParam && statusParam !== 'all' ? { status: statusParam } : {};
      const staffLimit = ADMIN_BOOTSTRAP_HEAVY_LIMIT;
      const projection = lightweight
        ? { gameScreenshot: 0, qrCodeImage: 0, proofImage: 0 }
        : noBlobProjection;
      redemptions = await db
        .collection('redemptions')
        .find(filter, { projection })
        .sort({ createdAt: -1 })
        .limit(staffLimit)
        .toArray();
    } else {
      const uid = dbUser?._id?.toString() || user.userId || user.id || user._id?.toString?.();
      const email = (dbUser?.email || user.email || '').toLowerCase().trim();
      const filter = email ? { $or: [{ userId: uid }, { userEmail: email }] } : { userId: uid };
      redemptions = await db
        .collection('redemptions')
        .find(filter, { projection: { gameScreenshot: 0, qrCodeImage: 0, proofImage: 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
    }

    return NextResponse.json({
      success: true,
      redemptions: redemptions.map(mapRedemptionRow),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbReady();
    const { session, dbUser, error, status } = await requirePlayerDbUser(req);
    if (!dbUser) {
      return NextResponse.json({ success: false, error }, { status: status || 401 });
    }
    if (isStaffRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Use a player login in another tab to redeem (admin session is separate).' },
        { status: 403 }
      );
    }
    const { userId, username, userEmail } = playerIdentity(dbUser, session);

    const body = await req.json();
    const {
      amount,
      payoutMethod,
      method,
      destinationTag,
      destinationAddress,
      payoutAddress,
      gameTitle,
      gameScreenshot,
      qrCodeImage,
    } = body;

    const redeemAmount = Number(amount);
    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const minRedeem = Number(settings?.minRedemptionSC ?? 50.0);

    if (!redeemAmount || redeemAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Please enter a valid withdrawal amount.' }, { status: 400 });
    }
    if (redeemAmount < minRedeem) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal is $${minRedeem.toFixed(2)} SC` },
        { status: 400 }
      );
    }

    const finalTag = (destinationTag || payoutAddress || destinationAddress || '').trim();
    if (!finalTag) {
      return NextResponse.json({ success: false, error: 'Your Payout Tag Name / Cashtag is required.' }, { status: 400 });
    }

    const payMethod = payoutMethod || method || 'Cash App';
    if (!gameScreenshot) {
      return NextResponse.json(
        { success: false, error: 'Game winning screenshot is required to verify your winnings.' },
        { status: 400 }
      );
    }
    if (!qrCodeImage) {
      return NextResponse.json(
        { success: false, error: 'Your Payout QR Code screenshot is required.' },
        { status: 400 }
      );
    }

    const requestedGame = String(gameTitle || '').trim();
    if (!requestedGame) {
      return NextResponse.json(
        { success: false, error: 'Please select the game platform you won from.' },
        { status: 400 }
      );
    }

    const accountCheck = await findUserGameAccount(
      db,
      { userId: dbUser._id, userEmail, username },
      requestedGame
    );
    if (!accountCheck.exists) {
      return NextResponse.json(
        {
          success: false,
          noAccount: true,
          error: `Withdrawal blocked: no active game account for "${requestedGame}". Request a game ID first.`,
        },
        { status: 400 }
      );
    }

    const currentSC = Number(dbUser.balanceSC || 0);
    const frozen = Math.max(0, Number(dbUser?.frozenBalance || 0));
    const availableSC = Math.max(0, Number((currentSC - frozen).toFixed(2)));

    if (availableSC < redeemAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient available balance. You have $${availableSC.toFixed(2)} SC available (${frozen.toFixed(2)} SC in escrow).`,
        },
        { status: 400 }
      );
    }

    const escrowFrozen = Math.min(redeemAmount, availableSC);
    if (escrowFrozen > 0) {
      await db.collection('users').updateOne(toIdQuery(dbUser._id), {
        $inc: { frozenBalance: escrowFrozen },
        $set: { updatedAt: new Date() },
      });
    }

    const compressOpts = { maxChars: 120_000, maxSize: 1024, quality: 68 };
    const [compressedGameShot, compressedQr] = await Promise.all([
      compressDataUrlIfNeeded(gameScreenshot, compressOpts),
      compressDataUrlIfNeeded(qrCodeImage, compressOpts),
    ]);
    if (
      !compressedGameShot ||
      !compressedQr ||
      compressedGameShot.length > 200_000 ||
      compressedQr.length > 200_000
    ) {
      return NextResponse.json(
        { success: false, error: 'Screenshots are too large after compression. Try smaller photos.' },
        { status: 400 }
      );
    }

    const redemptionDoc = {
      userId,
      username,
      userEmail,
      amount: redeemAmount,
      escrowFrozen,
      gameTitle: requestedGame,
      gameAccountUsername: accountCheck.username,
      gameScreenshot: compressedGameShot,
      qrCodeImage: compressedQr,
      destinationTag: finalTag,
      destinationAddress: finalTag,
      payoutAddress: finalTag,
      payoutMethod: payMethod,
      method: payMethod,
      status: 'pending_coin',
      stage: 'coin_verification',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('redemptions').insertOne(redemptionDoc);

    await db.collection('ledger').insertOne({
      userId,
      username,
      type: 'redemption_request',
      currency: 'SC',
      amount: redeemAmount,
      balanceBefore: currentSC,
      balanceAfter: currentSC,
      frozenAmount: escrowFrozen,
      referenceId: res.insertedId.toString(),
      notes: `Cashout requested: $${redeemAmount.toFixed(2)} SC from ${requestedGame} (@${accountCheck.username}) via ${payMethod} → ${finalTag}`,
      createdAt: new Date(),
    });

    const responseBody = {
      success: true,
      redemption: { ...redemptionDoc, _id: res.insertedId },
      message: `Cashout for $${redeemAmount.toFixed(2)} submitted! Routed to Coin Operations for screenshot verification.`,
    };

    const sidePayload = {
      dbUser,
      userId,
      userEmail,
      username,
      redeemAmount,
      requestedGame,
      payMethod,
      res,
      escrowFrozen,
    };
    if (typeof setImmediate === 'function') {
      setImmediate(() => deferRedemptionSideEffects(sidePayload));
    } else {
      void Promise.resolve().then(() => deferRedemptionSideEffects(sidePayload));
    }

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error('Withdraw POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const staff = await getSessionUser(req, 'admin');
    if (!staff || !isStaffRole(staff.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const body = await req.json();
    const { redemptionId, action, proofImage, payoutReference } = body;
    const rejectReason = body.rejectReason || body.rejectionReason || '';

    if (!redemptionId || !action) {
      return NextResponse.json({ success: false, error: 'Redemption ID and action required' }, { status: 400 });
    }

    const db = await getDb();
    const redemption = await db.collection('redemptions').findOne(toIdQuery(redemptionId));
    if (!redemption) {
      return NextResponse.json({ success: false, error: 'Redemption request not found' }, { status: 404 });
    }

    const player = await db.collection('users').findOne(toIdQuery(redemption.userId));

    if (action === 'coin_approve') {
      if (redemption.status !== 'pending_coin') {
        return NextResponse.json({ success: false, error: 'Cashout is not awaiting coin verification.' }, { status: 400 });
      }
      await db.collection('redemptions').updateOne(toIdQuery(redemptionId), {
        $set: {
          status: 'pending',
          stage: 'finance_payout',
          coinApprovedBy: staff.username,
          coinApprovedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await db.collection('ledger').insertOne({
        userId: redemption.userId,
        username: redemption.username,
        type: 'coin_verification_passed',
        currency: 'SC',
        amount: redemption.amount,
        balanceBefore: Number(player?.balanceSC || 0),
        balanceAfter: Number(player?.balanceSC || 0),
        performedBy: staff.username,
        referenceId: String(redemptionId),
        notes: `Game screenshot verified for ${redemption.gameTitle}. Forwarded to finance.`,
        createdAt: new Date(),
      });
      notifyPlayer({
        userId: redemption.userId,
        title: 'Cashout verified by coin desk',
        message: `Your $${redemption.amount} SC cashout from ${redemption.gameTitle} was verified and sent to finance for payout.`,
        type: 'withdraw_coin_approved',
      });
      pulseRedemptionDesk(redemption, { status: 'pending', stage: 'finance_payout' });
      return NextResponse.json({
        success: true,
        message: 'Game score verified! Passed to finance for payout.',
      });
    }

    if (action === 'coin_reject') {
      const reason = rejectReason || 'Game winning screenshot could not be verified.';
      const escrow = Number(redemption.escrowFrozen ?? redemption.amount ?? 0);
      if (player && escrow > 0) {
        const newFrozen = Math.max(0, Number((Number(player.frozenBalance || 0) - escrow).toFixed(2)));
        await db.collection('users').updateOne(toIdQuery(redemption.userId), {
          $set: { frozenBalance: newFrozen, updatedAt: new Date() },
        });
      }
      await db.collection('redemptions').updateOne(toIdQuery(redemptionId), {
        $set: {
          status: 'rejected_by_coin',
          stage: 'rejected_coin',
          rejectReason: reason,
          coinRejectReason: reason,
          rejectionReason: reason,
          rejectedBy: staff.username,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      notifyPlayer({
        userId: redemption.userId,
        title: 'Cashout rejected (coin desk)',
        message: `${reason} Your balance escrow was released.`,
        type: 'withdraw_rejected_by_coin',
      });
      pulseRedemptionDesk(redemption, { status: 'rejected_by_coin' });
      return NextResponse.json({ success: true, message: 'Cashout rejected; escrow released.' });
    }

    if (action === 'approve' || action === 'finance_dispatch') {
      if (redemption.status === 'approved') {
        return NextResponse.json({ success: false, error: 'Redemption is already approved.' }, { status: 400 });
      }
      if (redemption.status === 'pending_coin') {
        return NextResponse.json(
          { success: false, error: 'Awaiting coin desk verification first.' },
          { status: 400 }
        );
      }
      if (redemption.status !== 'pending') {
        return NextResponse.json({ success: false, error: `Redemption is already ${redemption.status}` }, { status: 400 });
      }

      const payAmount = Number(redemption.amount || 0);
      const escrow = Number(redemption.escrowFrozen ?? redemption.amount ?? 0);
      if (player) {
        const oldSC = Number(player.balanceSC || 0);
        const newSC = Math.max(0, Number((oldSC - payAmount).toFixed(2)));
        const oldFrozen = Math.max(0, Number(player.frozenBalance || 0));
        const newFrozen = Math.max(0, Number((oldFrozen - escrow).toFixed(2)));
        await db.collection('users').updateOne(toIdQuery(redemption.userId), {
          $set: { balanceSC: newSC, frozenBalance: newFrozen, updatedAt: new Date() },
        });
        await db.collection('ledger').insertOne({
          userId: redemption.userId,
          username: redemption.username,
          type: 'redemption_payout',
          currency: 'SC',
          amount: -payAmount,
          balanceBefore: oldSC,
          balanceAfter: newSC,
          referenceId: String(redemptionId),
          notes: `Cashout paid via ${redemption.payoutMethod || redemption.method} to ${redemption.destinationTag || redemption.payoutAddress}`,
          createdAt: new Date(),
        });
      }

      await db.collection('redemptions').updateOne(toIdQuery(redemptionId), {
        $set: {
          status: 'approved',
          stage: 'completed',
          payoutProof: proofImage || null,
          payoutReference: payoutReference || 'PAID',
          approvedBy: staff.username,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      notifyPlayer({
        userId: redemption.userId,
        title: 'Cashout sent',
        message: `Your $${redemption.amount} redemption was paid to ${redemption.payoutMethod || redemption.method} (${redemption.destinationTag || redemption.payoutAddress}).`,
        type: 'redemption_approved',
      });

      const updatedPlayer = await db.collection('users').findOne(toIdQuery(redemption.userId), {
        projection: { balanceSC: 1, balanceGC: 1, frozenBalance: 1, email: 1 },
      });
      if (updatedPlayer) {
        publishWalletSync({
          userId: String(redemption.userId),
          userEmail: redemption.userEmail || updatedPlayer.email,
          balanceSC: Number(updatedPlayer.balanceSC || 0),
          balanceGC: Number(updatedPlayer.balanceGC || 0),
          frozenBalance: Number(updatedPlayer.frozenBalance || 0),
        });
      }
      pulseRedemptionDesk(redemption, { status: 'approved' });

      return NextResponse.json({ success: true, message: 'Redemption marked as paid!' });
    }

    if (action === 'reject' || action === 'finance_reject') {
      if (redemption.status === 'pending_coin') {
        return NextResponse.json(
          { success: false, error: 'Reject from Coin Operations desk while pending coin verification.' },
          { status: 400 }
        );
      }
      const reason = rejectReason || 'Cashout request could not be processed.';
      const escrow = Number(redemption.escrowFrozen ?? redemption.amount ?? 0);
      if (player && escrow > 0) {
        const newFrozen = Math.max(0, Number((Number(player.frozenBalance || 0) - escrow).toFixed(2)));
        await db.collection('users').updateOne(toIdQuery(redemption.userId), {
          $set: { frozenBalance: newFrozen, updatedAt: new Date() },
        });
      }
      await db.collection('redemptions').updateOne(toIdQuery(redemptionId), {
        $set: {
          status: 'rejected',
          stage: 'rejected',
          rejectionReason: reason,
          financeRejectReason: reason,
          rejectReason: reason,
          rejectedBy: staff.username,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      notifyPlayer({
        userId: redemption.userId,
        title: 'Cashout returned',
        message: `Your $${redemption.amount} cashout was not approved. Escrow released. ${reason}`,
        type: 'redemption_rejected',
      });
      pulseRedemptionDesk(redemption, { status: 'rejected' });
      return NextResponse.json({ success: true, message: 'Redemption rejected and escrow released.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Withdraw PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
