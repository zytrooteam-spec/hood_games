import { NextResponse } from 'next/server';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    if (mode === 'admin') {
      if (!session || !isStaffRole(session.role)) {
        return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
      }
      const db = await getDb();
      const settings = await db.collection('system_settings').findOne({ key: 'general' });
      const defaultPct = Number(settings?.referralBonusPercent ?? 20);

      const candidates = await db
        .collection('users')
        .find({
          $or: [
            { referralCode: { $exists: true, $ne: '' } },
            { affiliateCommissionsEarned: { $gt: 0 } },
            { affiliateCommissionsUnpaid: { $gt: 0 } },
          ],
        })
        .sort({ affiliateCommissionsEarned: -1, createdAt: -1 })
        .limit(150)
        .toArray();

      const affiliates = [];
      for (const u of candidates) {
        const keys = [u.username, u.referralCode, u._id?.toString()].filter(Boolean);
        const refs = await db
          .collection('users')
          .find({
            $or: [
              { referredBy: { $in: keys } },
              { referredByCode: { $in: keys } },
              { referrerId: u._id?.toString() },
            ],
          })
          .project({ username: 1, email: 1, totalDeposited: 1, createdAt: 1 })
          .limit(50)
          .toArray();

        affiliates.push({
          userId: u._id.toString(),
          username: u.username,
          email: u.email,
          referralCode: u.referralCode || `HG-${u.username}`,
          commissionRate: u.affiliateRate || defaultPct,
          commissionsEarned: Number(u.affiliateCommissionsEarned || 0),
          commissionsUnpaid: Number(u.affiliateCommissionsUnpaid || 0),
          totalReferrals: refs.length,
          totalDepositsGenerated: refs.reduce((s, r) => s + Number(r.totalDeposited || 0), 0),
          referees: refs,
        });
      }

      const totals = {
        partners: affiliates.length,
        unpaid: affiliates.reduce((s, a) => s + a.commissionsUnpaid, 0),
        earned: affiliates.reduce((s, a) => s + a.commissionsEarned, 0),
      };

      return NextResponse.json({ success: true, affiliates, totals });
    }

    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const db = await getDb();
    const me = await db.collection('users').findOne(toIdQuery(session.userId));
    const refs = await db
      .collection('users')
      .find({
        $or: [
          { referredBy: me?.username },
          { referredByCode: me?.referralCode },
          { referrerId: me?._id?.toString() },
        ],
      })
      .project({ username: 1, createdAt: 1, totalDeposited: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      referralCode: me?.referralCode,
      commissionsUnpaid: Number(me?.affiliateCommissionsUnpaid || 0),
      commissionsEarned: Number(me?.affiliateCommissionsEarned || 0),
      referees: refs,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    if (!session || !isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { action, userId } = body;
    const db = await getDb();

    if (action === 'admin_payout') {
      if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
      const user = await db.collection('users').findOne(toIdQuery(userId));
      if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      const unpaid = Number(user.affiliateCommissionsUnpaid || 0);
      if (unpaid <= 0) return NextResponse.json({ success: false, error: 'No unpaid commission' }, { status: 400 });
      await db.collection('users').updateOne(toIdQuery(userId), {
        $inc: { balanceSC: unpaid },
        $set: { affiliateCommissionsUnpaid: 0, updatedAt: new Date() },
      });
      await db.collection('ledger').insertOne({
        userId: user._id.toString(),
        username: user.username,
        type: 'affiliate_payout',
        amount: unpaid,
        performedBy: session.username,
        createdAt: new Date(),
      });
      return NextResponse.json({ success: true, message: `Settled $${unpaid.toFixed(2)} SC to ${user.username}` });
    }

    if (action === 'admin_payout_all') {
      const partners = await db.collection('users').find({ affiliateCommissionsUnpaid: { $gt: 0 } }).toArray();
      let total = 0;
      for (const u of partners) {
        const unpaid = Number(u.affiliateCommissionsUnpaid || 0);
        if (unpaid <= 0) continue;
        total += unpaid;
        await db.collection('users').updateOne(
          { _id: u._id },
          { $inc: { balanceSC: unpaid }, $set: { affiliateCommissionsUnpaid: 0, updatedAt: new Date() } }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Batch settled $${total.toFixed(2)} SC across ${partners.length} partners`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    if (!session || !['admin', 'superadmin', 'financial_manager'].includes(String(session.role || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const { userId, action } = await req.json();
    if (action !== 'payout' || !userId) {
      return NextResponse.json({ success: false, error: 'Invalid payout request' }, { status: 400 });
    }
    const db = await getDb();
    const user = await db.collection('users').findOne(toIdQuery(userId));
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    const unpaid = Number(user.affiliateCommissionsUnpaid || 0);
    if (unpaid <= 0) return NextResponse.json({ success: false, error: 'No unpaid commission' }, { status: 400 });

    await db.collection('users').updateOne(toIdQuery(userId), {
      $inc: { balanceSC: unpaid },
      $set: { affiliateCommissionsUnpaid: 0, updatedAt: new Date() },
    });

    await db.collection('ledger').insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: 'affiliate_payout',
      amount: unpaid,
      performedBy: session.username,
      notes: 'Affiliate commission paid to wallet',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: `Paid $${unpaid.toFixed(2)} SC to ${user.username}` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
