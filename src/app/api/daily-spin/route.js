import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';
import { resolveWheelConfig, pickWheelOutcome } from '@/lib/wheelConfig';
import { requirePlayerDbUser } from '@/lib/requirePlayerDbUser';

export const runtime = 'nodejs';

// GET: depositor free-spin balance (2 spins per approved deposit — same as Players Paradise)
export async function GET(req) {
  try {
    await ensureDbInitialized();
    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const wheelConfig = resolveWheelConfig(settings);
    const { dbUser } = await requirePlayerDbUser(req);
    if (!dbUser) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        canSpin: false,
        availableSpins: 0,
        slices: wheelConfig.slices,
        message: 'Please log in to spin.',
      });
    }
    const user = dbUser;

    const availableSpins = Math.max(0, Number(user.availableSpins || 0));
    const canSpin = availableSpins > 0;

    return NextResponse.json({
      success: true,
      authenticated: true,
      canSpin,
      availableSpins,
      slices: wheelConfig.slices,
      lastDailySpin: user.lastDailySpin || null,
      balanceSC: Number(user.balanceSC ?? 0),
      message: canSpin
        ? `You have ${availableSpins} free ${availableSpins === 1 ? 'spin' : 'spins'} available!`
        : 'Free spins unlock after an approved deposit — 2 spins credited per deposit.',
    });
  } catch (err) {
    console.error('Daily spin GET error:', err);
    return NextResponse.json({
      success: true,
      canSpin: false,
      availableSpins: 0,
      slices: resolveWheelConfig(null).slices,
      error: err.message,
    });
  }
}

// POST: weighted spin (10% $3, 20% $2, 40% $1, 30% bad luck — Paradise spec)
export async function POST(req) {
  try {
    await ensureDbInitialized();
    const { dbUser, error, status } = await requirePlayerDbUser(req);
    if (!dbUser) {
      return NextResponse.json({ success: false, message: error || 'Please log in to spin.' }, { status: status || 401 });
    }

    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const wheelConfig = resolveWheelConfig(settings);
    const usersCol = db.collection('users');
    const user = dbUser;

    const availableSpins = Math.max(0, Number(user.availableSpins || 0));
    if (availableSpins <= 0) {
      return NextResponse.json(
        {
          success: false,
          canSpin: false,
          availableSpins: 0,
          message: 'No free spins available. Make a deposit — when staff approves it you get 2 free spins.',
        },
        { status: 400 }
      );
    }

    const { prizeAmount, sliceIndex, isBadLuck } = pickWheelOutcome(wheelConfig.odds);

    const remainingSpins = Math.max(0, availableSpins - 1);
    const oldBalance = Number(user.balanceSC ?? 0);
    const newBalance = Number((oldBalance + prizeAmount).toFixed(2));
    const now = new Date();

    const updateOps = {
      $inc: { availableSpins: -1 },
      $set: { lastDailySpin: now, updatedAt: now },
    };
    if (prizeAmount > 0) {
      updateOps.$inc.balanceSC = prizeAmount;
    }

    await usersCol.updateOne({ _id: user._id }, updateOps);

    if (prizeAmount > 0) {
      await db.collection('ledger').insertOne({
        userId: user._id.toString(),
        username: user.username,
        type: 'depositor_spin_bonus',
        currency: 'SC',
        amount: prizeAmount,
        balanceBefore: oldBalance,
        balanceAfter: newBalance,
        referenceId: `SPIN-${now.getTime()}`,
        notes: `Depositor Free Spin Reward: Won $${prizeAmount.toFixed(2)} SC on wheel spin`,
        createdAt: now,
      });
    }

    const slice = wheelConfig.slices[sliceIndex] || wheelConfig.slices[0];
    const prize = {
      label: isBadLuck ? slice.label : `$${prizeAmount.toFixed(2)} SC`,
      type: 'SC',
      value: prizeAmount,
    };

    return NextResponse.json({
      success: true,
      winAmount: prizeAmount,
      sliceIndex,
      slice,
      prize,
      isBadLuck,
      availableSpins: remainingSpins,
      canSpin: remainingSpins > 0,
      newBalanceSC: newBalance,
      message: isBadLuck
        ? 'Bad Luck! Better luck on your next spin.'
        : `Congratulations! You won $${prizeAmount.toFixed(2)} SC!`,
    });
  } catch (err) {
    console.error('Daily spin POST error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
