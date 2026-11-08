import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { resolveStaffOrPlayer } from '@/lib/staffOrPlayerApi';
import { requirePlayerDbUser, playerIdentity } from '@/lib/requirePlayerDbUser';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { user, isStaff, dbUser } = await resolveStaffOrPlayer(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    let redemptions;
    if (isStaff) {
      const filter = statusParam && statusParam !== 'all' ? { status: statusParam } : {};
      redemptions = await db.collection('redemptions').find(filter).sort({ createdAt: -1 }).limit(300).toArray();
    } else {
      const uid = dbUser?._id?.toString() || user.userId || user.id || user._id?.toString?.();
      const email = (dbUser?.email || user.email || '').toLowerCase().trim();
      const filter = email
        ? { $or: [{ userId: uid }, { userEmail: email }] }
        : { userId: uid };
      redemptions = await db.collection('redemptions').find(filter).sort({ createdAt: -1 }).toArray();
    }

    return NextResponse.json({ success: true, redemptions });
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
        { success: false, error: 'Use a player login in another tab to redeem (admin session is separate).' },
        { status: 403 }
      );
    }
    const { userId, username, userEmail } = playerIdentity(dbUser, session);

    const { amount, method, payoutAddress, notes, gameTitle } = await req.json();
    const numAmount = Number(amount);

    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const minRedeem = Number(settings?.minRedemptionSC ?? 50.0);

    if (isNaN(numAmount) || numAmount < minRedeem) {
      return NextResponse.json({
        success: false,
        error: `Minimum withdrawal is $${minRedeem.toFixed(2)} SC`,
      }, { status: 400 });
    }

    if (!payoutAddress || !payoutAddress.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide your Cash App tag, Zelle email, or Crypto address' }, { status: 400 });
    }

    const currentSC = Number(dbUser.balanceSC || 0);
    const frozen = Math.max(0, Number(dbUser?.frozenBalance || 0));
    const availableSC = Math.max(0, Number((currentSC - frozen).toFixed(2)));

    if (availableSC < numAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient available balance. You have $${availableSC.toFixed(2)} SC available (${frozen.toFixed(2)} SC in escrow).`,
      }, { status: 400 });
    }

    const escrowFrozen = Math.min(numAmount, availableSC);
    if (escrowFrozen > 0) {
      await db.collection('users').updateOne(toIdQuery(dbUser._id), {
        $inc: { frozenBalance: escrowFrozen },
        $set: { updatedAt: new Date() },
      });
    }

    const redemptionDoc = {
      userId,
      username,
      userEmail,
      amount: numAmount,
      escrowFrozen,
      method: method || 'Cash App',
      payoutAddress: payoutAddress.trim(),
      notes: notes || '',
      gameTitle: (gameTitle || '').trim() || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('redemptions').insertOne(redemptionDoc);

    // Ledger record
    await db.collection('ledger').insertOne({
      userId: user.id || user._id.toString(),
      username: user.username,
      type: 'redemption_escrow',
      amount: numAmount,
      currency: 'SC',
      balanceBefore: currentSC,
      balanceAfter: currentSC,
      frozenAmount: escrowFrozen,
      description: `Redeem escrow — ${method} (${payoutAddress})`,
      referenceId: res.insertedId.toString(),
      createdAt: new Date(),
    });

    // Notify staff desk
    notifyStaff({
      title: `⚡ New Cashout Request: $${numAmount} from ${user.username}`,
      message: `Method: ${method} | Game: ${gameTitle || 'General'} | Destination: ${payoutAddress}`,
      type: 'redemption_request',
      data: { redemptionId: res.insertedId.toString() },
    });

    return NextResponse.json({
      success: true,
      redemption: { ...redemptionDoc, _id: res.insertedId },
      message: 'Redemption request submitted! Payout processed in 15-30 minutes.',
    });
  } catch (err) {
    console.error('Withdraw POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const { redemptionId, action, proofImage, rejectionReason, payoutReference } = await req.json();
    if (!redemptionId || !action) {
      return NextResponse.json({ success: false, error: 'Redemption ID and action required' }, { status: 400 });
    }

    const db = await getDb();
    const redemption = await db.collection('redemptions').findOne(toIdQuery(redemptionId));
    if (!redemption) {
      return NextResponse.json({ success: false, error: 'Redemption request not found' }, { status: 404 });
    }

    if (redemption.status !== 'pending') {
      return NextResponse.json({ success: false, error: `Redemption is already ${redemption.status}` }, { status: 400 });
    }

    if (action === 'approve') {
      const player = await db.collection('users').findOne(toIdQuery(redemption.userId));
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
          type: 'redemption_paid',
          currency: 'SC',
          amount: -payAmount,
          balanceBefore: oldSC,
          balanceAfter: newSC,
          referenceId: String(redemptionId),
          notes: `Cashout paid via ${redemption.method}`,
          createdAt: new Date(),
        });
      }

      await db.collection('redemptions').updateOne(
        toIdQuery(redemptionId),
        {
          $set: {
            status: 'approved',
            payoutProof: proofImage || null,
            payoutReference: payoutReference || 'PAID',
            approvedBy: user.username,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      notifyPlayer({
        userId: redemption.userId,
        title: '🎉 Cashout Sent to Your Account!',
        message: `Your redemption of $${redemption.amount} has been paid to ${redemption.method} (${redemption.payoutAddress}).`,
        type: 'redemption_approved',
      });

      return NextResponse.json({ success: true, message: 'Redemption marked as paid!' });
    } else if (action === 'reject') {
      const player = await db.collection('users').findOne(toIdQuery(redemption.userId));
      const escrow = Number(redemption.escrowFrozen ?? redemption.amount ?? 0);
      if (player && escrow > 0) {
        const oldFrozen = Math.max(0, Number(player.frozenBalance || 0));
        const newFrozen = Math.max(0, Number((oldFrozen - escrow).toFixed(2)));
        await db.collection('users').updateOne(toIdQuery(redemption.userId), {
          $set: { frozenBalance: newFrozen, updatedAt: new Date() },
        });
        await db.collection('ledger').insertOne({
          userId: redemption.userId,
          username: redemption.username,
          type: 'redemption_released',
          currency: 'SC',
          amount: escrow,
          balanceBefore: Number(player.balanceSC || 0),
          balanceAfter: Number(player.balanceSC || 0),
          notes: `Escrow released — redeem rejected`,
          referenceId: String(redemptionId),
          createdAt: new Date(),
        });
      }

      await db.collection('redemptions').updateOne(
        toIdQuery(redemptionId),
        {
          $set: {
            status: 'rejected',
            rejectionReason: rejectionReason || 'Cashout request could not be processed. Balance has been refunded.',
            rejectedBy: user.username,
            rejectedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      notifyPlayer({
        userId: redemption.userId,
        title: '⚠️ Cashout Request Returned',
        message: `Your redemption request for $${redemption.amount} was not approved. $${redemption.amount} SC has been refunded to your wallet. Reason: ${rejectionReason || 'Contact support'}`,
        type: 'redemption_rejected',
      });

      return NextResponse.json({ success: true, message: 'Redemption rejected and balance refunded.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Withdraw PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
