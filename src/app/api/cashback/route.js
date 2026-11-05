import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer } from '@/lib/notify';

// Helper: Calculate week boundaries (Sunday 00:00:00 to Sunday 23:59:59)
function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const nextSunday = new Date(startOfWeek);
  nextSunday.setDate(startOfWeek.getDate() + 7);
  nextSunday.setHours(23, 59, 59, 999);

  return { startOfWeek, nextSunday, now };
}

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const adminReport = searchParams.get('adminReport') === 'true';

    // 1. Get system settings for cashback
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const cashbackPercent = Math.min(20, Math.max(5, Number(settings?.cashbackPercent ?? 10)));
    const minDeposit = Number(settings?.cashbackMinDeposit ?? 20);

    const { startOfWeek, nextSunday, now } = getWeekRange();
    const weekKey = `${startOfWeek.toISOString().slice(0, 10)}`;

    // 2. Admin Report for all players
    if (adminReport && user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'staff')) {
      const allUsers = await db.collection('users').find({ role: 'player' }).toArray();

      const playerReports = await Promise.all(
        allUsers.map(async (u) => {
          const uId = u._id.toString();
          const [uDeposits, uRedemptions, uClaim] = await Promise.all([
            db.collection('deposits').find({ userId: uId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
            db.collection('redemptions').find({ userId: uId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
            db.collection('cashback_claims').findOne({ userId: uId, weekKey }),
          ]);

          const totalDep = uDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
          const totalOut = uRedemptions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
          const netLoss = Math.max(0, totalDep - totalOut);
          const estimated = Number(((netLoss * cashbackPercent) / 100).toFixed(2));

          return {
            userId: uId,
            username: u.username,
            email: u.email,
            balanceSC: Number(u.balanceSC || 0),
            totalDeposit: totalDep,
            totalCashout: totalOut,
            netLoss,
            cashbackPercent,
            cashbackAmount: estimated,
            isEligible: totalDep >= minDeposit && netLoss > 0,
            isClaimed: !!uClaim,
            claimedAt: uClaim?.claimedAt || null,
          };
        })
      );

      const totalPool = playerReports
        .filter((r) => r.isEligible && !r.isClaimed)
        .reduce((sum, r) => sum + r.cashbackAmount, 0);

      return NextResponse.json({
        success: true,
        cashbackPercent,
        minDeposit,
        weekKey,
        startOfWeek: startOfWeek.toISOString(),
        nextSunday: nextSunday.toISOString(),
        totalPool: Number(totalPool.toFixed(2)),
        playerReports,
      });
    }

    // 3. Guest / Not logged in
    if (!user) {
      return NextResponse.json({
        success: true,
        percentage: cashbackPercent,
        cashbackPercent,
        minDeposit,
        totalDeposit: 0,
        totalCashout: 0,
        netDifference: 0,
        estimatedCashback: 0,
        userStats: null,
        history: [],
        nextPayoutDate: nextSunday.toISOString(),
      });
    }

    const userId = user.id || user._id.toString();

    // 4. Single player stats for current week
    const [deposits, redemptions, currentClaim, history] = await Promise.all([
      db.collection('deposits').find({ userId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
      db.collection('redemptions').find({ userId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
      db.collection('cashback_claims').findOne({ userId, weekKey }),
      db.collection('cashback_claims').find({ userId }).sort({ claimedAt: -1 }).limit(15).toArray(),
    ]);

    const totalDeposit = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalCashout = redemptions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const netDifference = Math.max(0, totalDeposit - totalCashout);
    const estimatedCashback = Number(((netDifference * cashbackPercent) / 100).toFixed(2));
    const isEligible = totalDeposit >= minDeposit && netDifference > 0;
    const isClaimed = !!currentClaim;

    const userStats = {
      username: user.username,
      totalDeposit,
      totalCashout,
      netDifference,
      estimatedCashback,
      isEligible,
      isClaimed,
      claimedAt: currentClaim?.claimedAt || null,
      weekKey,
    };

    return NextResponse.json({
      success: true,
      percentage: cashbackPercent,
      cashbackPercent,
      minDeposit,
      totalDeposit,
      totalCashout,
      netDifference,
      estimatedCashback,
      isEligible,
      isClaimed,
      userStats,
      history,
      nextPayoutDate: nextSunday.toISOString(),
    });
  } catch (err) {
    console.error('Cashback calculation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in first' }, { status: 401 });
    }

    const body = await req.json();
    const { action, newPercentage } = body;
    const db = await getDb();
    const { startOfWeek, nextSunday } = getWeekRange();
    const weekKey = `${startOfWeek.toISOString().slice(0, 10)}`;

    // =========================================================================
    // ACTION A: Admin Updates Cashback Percentage (5% - 20%)
    // =========================================================================
    if (action === 'admin_set_percentage') {
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: 'Admin permissions required' }, { status: 403 });
      }

      const percent = Math.min(20, Math.max(5, Number(newPercentage || 10)));
      await db.collection('system_settings').updateOne(
        { key: 'general' },
        { $set: { cashbackPercent: percent, updatedAt: new Date() } },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `Sunday Cashback percentage updated to ${percent}% successfully!`,
        percentage: percent,
      });
    }

    // =========================================================================
    // ACTION B: Admin Disburses Cashback to All Eligible Players
    // =========================================================================
    if (action === 'admin_disburse_all') {
      if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'staff') {
        return NextResponse.json({ success: false, error: 'Admin/Staff permissions required' }, { status: 403 });
      }

      const settings = await db.collection('system_settings').findOne({ key: 'general' });
      const cashbackPercent = Math.min(20, Math.max(5, Number(settings?.cashbackPercent ?? 10)));
      const minDeposit = Number(settings?.cashbackMinDeposit ?? 20);

      const allPlayers = await db.collection('users').find({ role: 'player' }).toArray();
      let disbursedCount = 0;
      let totalDisbursedSC = 0;

      for (const p of allPlayers) {
        const pId = p._id.toString();
        // Check if already claimed this week
        const existingClaim = await db.collection('cashback_claims').findOne({ userId: pId, weekKey });
        if (existingClaim) continue;

        const [pDeps, pReds] = await Promise.all([
          db.collection('deposits').find({ userId: pId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
          db.collection('redemptions').find({ userId: pId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
        ]);

        const totalDep = pDeps.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        const totalOut = pReds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const netLoss = Math.max(0, totalDep - totalOut);

        if (totalDep >= minDeposit && netLoss > 0) {
          const reward = Number(((netLoss * cashbackPercent) / 100).toFixed(2));
          if (reward > 0) {
            // 1. Credit player wallet
            await db.collection('users').updateOne(
              toIdQuery(pId),
              { $inc: { balanceSC: reward } }
            );

            // 2. Record claim
            await db.collection('cashback_claims').insertOne({
              userId: pId,
              username: p.username,
              userEmail: p.email,
              weekKey,
              weekStart: startOfWeek,
              weekEnd: nextSunday,
              totalDeposit: totalDep,
              totalCashout: totalOut,
              netLoss,
              percentage: cashbackPercent,
              cashbackAmount: reward,
              disbursedBy: user.username,
              claimedAt: new Date(),
            });

            // 3. Notify player
            notifyPlayer({
              userId: pId,
              title: `🎉 Sunday Cashback Disbursed: +$${reward.toFixed(2)} SC!`,
              message: `Your ${cashbackPercent}% weekly Sunday cashback of $${reward.toFixed(2)} SC has been credited directly to your playable balance.`,
              type: 'cashback',
            });

            disbursedCount++;
            totalDisbursedSC += reward;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Disbursed $${totalDisbursedSC.toFixed(2)} SC in Sunday Cashback to ${disbursedCount} qualified players!`,
        disbursedCount,
        totalDisbursedSC: Number(totalDisbursedSC.toFixed(2)),
      });
    }

    // =========================================================================
    // ACTION C: Player Claims Their Own Weekly Sunday Cashback
    // =========================================================================
    const userId = user.id || user._id.toString();

    // Check if user already claimed this week
    const existing = await db.collection('cashback_claims').findOne({ userId, weekKey });
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `You have already claimed your Sunday cashback for this week ($${Number(existing.cashbackAmount || 0).toFixed(2)} SC on ${new Date(existing.claimedAt).toLocaleDateString()}). Next payout drops next Sunday!`,
      }, { status: 400 });
    }

    // Fetch user's approved deposits & redemptions for this week
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const cashbackPercent = Math.min(20, Math.max(5, Number(settings?.cashbackPercent ?? 10)));
    const minDeposit = Number(settings?.cashbackMinDeposit ?? 20);

    const [deposits, redemptions] = await Promise.all([
      db.collection('deposits').find({ userId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
      db.collection('redemptions').find({ userId, status: 'approved', createdAt: { $gte: startOfWeek } }).toArray(),
    ]);

    const totalDeposit = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalCashout = redemptions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const netLoss = Math.max(0, totalDeposit - totalCashout);

    if (totalDeposit < minDeposit) {
      return NextResponse.json({
        success: false,
        error: `Minimum weekly deposit of $${minDeposit} SC required to qualify for Sunday Cashback. Your deposits this week: $${totalDeposit.toFixed(2)} SC.`,
      }, { status: 400 });
    }

    if (netLoss <= 0) {
      return NextResponse.json({
        success: false,
        error: `Your weekly cashouts ($${totalCashout.toFixed(2)}) exceed your deposits ($${totalDeposit.toFixed(2)}). Cashback is only calculated on net losses!`,
      }, { status: 400 });
    }

    const reward = Number(((netLoss * cashbackPercent) / 100).toFixed(2));
    if (reward <= 0) {
      return NextResponse.json({ success: false, error: 'Calculated cashback reward is zero.' }, { status: 400 });
    }

    // 1. Atomically increment player's balance
    await db.collection('users').updateOne(
      toIdQuery(userId),
      { $inc: { balanceSC: reward } }
    );

    // 2. Insert claim record
    const claimDoc = {
      userId,
      username: user.username,
      userEmail: user.email,
      weekKey,
      weekStart: startOfWeek,
      weekEnd: nextSunday,
      totalDeposit,
      totalCashout,
      netLoss,
      percentage: cashbackPercent,
      cashbackAmount: reward,
      claimedAt: new Date(),
    };
    await db.collection('cashback_claims').insertOne(claimDoc);

    // 3. Dispatch in-app notification
    notifyPlayer({
      userId,
      title: `🎉 Sunday Cashback Claimed: +$${reward.toFixed(2)} SC!`,
      message: `Your ${cashbackPercent}% Sunday Cashback has been credited directly to your playable balance with 0x wagering requirements!`,
      type: 'cashback',
    });

    const updatedUser = await db.collection('users').findOne(toIdQuery(userId));

    return NextResponse.json({
      success: true,
      message: `Successfully claimed $${reward.toFixed(2)} SC Sunday Cashback! Added to your balance.`,
      reward,
      newBalance: Number(updatedUser?.balanceSC || 0),
    });
  } catch (err) {
    console.error('Error claiming cashback:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
