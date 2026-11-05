import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';

const STAFF_ROLES = ['admin', 'superadmin', 'staff'];

// GET: staff queue of game-credit load requests
export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
    }
    const db = await getDb();
    const transfers = await db.collection('coin_transfers').find({}).sort({ createdAt: -1 }).limit(200).toArray();
    return NextResponse.json({ success: true, transfers });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: staff completes (loaded) or rejects (refund to wallet) a load request
export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
    }
    const { id, action } = await req.json();
    const db = await getDb();
    const transfer = await db.collection('coin_transfers').findOne(toIdQuery(id));
    if (!transfer) return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    if (transfer.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Transfer already processed' }, { status: 400 });
    }

    const newStatus = action === 'complete' ? 'completed' : 'rejected';
    // Atomic status flip guards against double-processing
    const flip = await db.collection('coin_transfers').updateOne(
      { ...toIdQuery(id), status: 'pending' },
      { $set: { status: newStatus, processedBy: user.username, processedAt: new Date() } }
    );
    if (!flip.modifiedCount) {
      return NextResponse.json({ success: false, error: 'Transfer already processed' }, { status: 409 });
    }

    if (newStatus === 'rejected') {
      await db.collection('users').updateOne(toIdQuery(transfer.userId), { $inc: { balanceSC: Number(transfer.amount || 0) } });
    }

    notifyPlayer({
      userId: transfer.userId,
      title: newStatus === 'completed' ? `✅ ${transfer.gameTitle} credits loaded` : `↩️ ${transfer.gameTitle} load refunded`,
      message:
        newStatus === 'completed'
          ? `$${transfer.amount} SC has been loaded into your ${transfer.gameTitle} account.`
          : `Your $${transfer.amount} SC load request was declined and refunded to your wallet.`,
      type: 'coin_transfer',
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, gameTitle, amount } = await req.json();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const db = await getDb();
    const userId = user.id || user._id.toString();

    if (action === 'load') {
      // Transfer from Wallet balanceSC to Game Credits
      const dbUser = await db.collection('users').findOne(toIdQuery(userId));
      if (!dbUser || Number(dbUser.balanceSC || 0) < numAmount) {
        return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 });
      }

      await db.collection('users').updateOne(
        toIdQuery(userId),
        { $inc: { balanceSC: -numAmount } }
      );

      const loadDoc = {
        userId,
        username: user.username,
        gameTitle,
        amount: numAmount,
        type: 'load_credits',
        status: 'pending',
        createdAt: new Date(),
      };

      const res = await db.collection('coin_transfers').insertOne(loadDoc);

      notifyStaff({
        title: `⚡ Load Credits Request: $${numAmount} to ${gameTitle}`,
        message: `Player ${user.username} requested to transfer $${numAmount} SC to ${gameTitle}.`,
        type: 'coin_transfer',
        data: { transferId: res.insertedId.toString() },
      });

      return NextResponse.json({
        success: true,
        message: `Transfer of $${numAmount} SC to ${gameTitle} submitted! Staff will load your game credits shortly.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid transfer action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
