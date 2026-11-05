import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { WHEEL_SEGMENTS } from '@/lib/wheelConstants';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) {
      return NextResponse.json({ success: true, canSpin: false, reason: 'Login required' });
    }

    const db = await getDb();
    const userId = user.id || user._id.toString();

    // Find latest spin
    const lastSpin = await db
      .collection('daily_spins')
      .findOne({ userId }, { sort: { createdAt: -1 } });

    if (!lastSpin) {
      return NextResponse.json({ success: true, canSpin: true, nextSpinAvailable: null });
    }

    const lastTime = new Date(lastSpin.createdAt).getTime();
    const now = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;
    const canSpin = now - lastTime >= cooldownMs;
    const nextSpinAvailable = canSpin ? null : new Date(lastTime + cooldownMs).toISOString();

    return NextResponse.json({
      success: true,
      canSpin,
      nextSpinAvailable,
      lastPrize: lastSpin.prize,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) {
      return NextResponse.json({ success: false, error: 'Please log in to spin the wheel' }, { status: 401 });
    }

    const db = await getDb();
    const userId = user.id || user._id.toString();

    // Check 24-hr cooldown
    const lastSpin = await db
      .collection('daily_spins')
      .findOne({ userId }, { sort: { createdAt: -1 } });

    if (lastSpin) {
      const lastTime = new Date(lastSpin.createdAt).getTime();
      const now = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000;
      if (now - lastTime < cooldownMs) {
        const remainingHours = Math.ceil((cooldownMs - (now - lastTime)) / (1000 * 60 * 60));
        return NextResponse.json({
          success: false,
          error: `You have already claimed your daily spin! Next spin in ${remainingHours} hours.`,
        }, { status: 429 });
      }
    }

    // Pick segment
    const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const wonPrize = WHEEL_SEGMENTS[segmentIndex];

    const incUpdate = {};
    if (wonPrize.type === 'SC') {
      incUpdate.balanceSC = Number(wonPrize.value);
    } else {
      incUpdate.balanceGC = Number(wonPrize.value);
    }

    await db.collection('users').updateOne(
      toIdQuery(userId),
      { $inc: incUpdate }
    );

    // Save spin record
    await db.collection('daily_spins').insertOne({
      userId,
      username: user.username,
      prize: wonPrize,
      createdAt: new Date(),
    });

    const updatedUser = await db.collection('users').findOne(toIdQuery(userId));

    return NextResponse.json({
      success: true,
      segmentIndex,
      prize: wonPrize,
      newBalanceSC: updatedUser?.balanceSC ?? user.balanceSC,
      newBalanceGC: updatedUser?.balanceGC ?? user.balanceGC,
    });
  } catch (err) {
    console.error('Daily spin error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
