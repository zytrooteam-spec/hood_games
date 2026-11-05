import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const db = await getDb();

    const [
      totalUsers,
      pendingDeposits,
      pendingRedemptions,
      pendingAccountRequests,
      approvedDeposits,
      approvedRedemptions,
    ] = await Promise.all([
      db.collection('users').countDocuments({ role: 'player' }),
      db.collection('deposits').countDocuments({ status: 'pending' }),
      db.collection('redemptions').countDocuments({ status: 'pending' }),
      db.collection('accountRequests').countDocuments({ status: 'pending' }),
      db.collection('deposits').find({ status: 'approved' }).toArray(),
      db.collection('redemptions').find({ status: 'approved' }).toArray(),
    ]);

    const totalDepositVol = approvedDeposits.reduce((s, d) => s + Number(d.amount || 0), 0);
    const totalRedeemVol = approvedRedemptions.reduce((s, r) => s + Number(r.amount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        pendingDeposits,
        pendingRedemptions,
        pendingAccountRequests,
        totalDepositVol,
        totalRedeemVol,
        netRevenue: totalDepositVol - totalRedeemVol,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
