import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const player = await getSessionUser(req, 'player');
    const admin = await getSessionUser(req, 'admin');
    const user = player || (admin && isStaffRole(admin.role) ? admin : null);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const isStaff = isStaffRole(user.role) && !player;

    let redemptions;
    if (isStaff) {
      redemptions = await db.collection('redemptions').find({}).sort({ createdAt: -1 }).toArray();
    } else {
      redemptions = await db
        .collection('redemptions')
        .find({ userId: user.id || user._id.toString() })
        .sort({ createdAt: -1 })
        .toArray();
    }

    return NextResponse.json({ success: true, redemptions });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Please log in with your player account to redeem.' },
        { status: 401 }
      );
    }
    if (isStaffRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Use a player login in another tab to redeem (admin session is separate).' },
        { status: 403 }
      );
    }

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

    // Check player balance
    const dbUser = await db.collection('users').findOne(toIdQuery(user.id || user._id));
    if (!dbUser || Number(dbUser.balanceSC || 0) < numAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Your current balance is $${Number(dbUser?.balanceSC || 0).toFixed(2)} SC`,
      }, { status: 400 });
    }

    // Deduct balanceSC immediately to hold
    await db.collection('users').updateOne(
      toIdQuery(user.id || user._id),
      { $inc: { balanceSC: -numAmount } }
    );

    const redemptionDoc = {
      userId: user.id || user._id.toString(),
      username: user.username,
      userEmail: user.email,
      amount: numAmount,
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
      type: 'redemption_hold',
      amount: -numAmount,
      currency: 'SC',
      description: `Cashout request to ${method} (${payoutAddress})`,
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
      // Refund held balance back to user
      await db.collection('users').updateOne(
        toIdQuery(redemption.userId),
        { $inc: { balanceSC: Number(redemption.amount) } }
      );

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
