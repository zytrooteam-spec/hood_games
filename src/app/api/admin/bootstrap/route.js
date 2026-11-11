import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';
import { mapAccountRequest } from '@/lib/mapAccountRequest';
import { buildStaffChatThreads } from '@/lib/chatThreads.server';
import { computeAdminStats, STAFF_LIST_LIMIT } from '@/lib/adminStats.server';
import { listStaffDeposits } from '@/lib/staffDeposits.server';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDb();

    const [
      stats,
      deposits,
      redemptions,
      requests,
      settings,
      threads,
      users,
      methods,
    ] = await Promise.all([
      computeAdminStats(db),
      listStaffDeposits(db),
      db
        .collection('redemptions')
        .find({}, { projection: { proofImage: 0 } })
        .sort({ createdAt: -1 })
        .limit(STAFF_LIST_LIMIT)
        .toArray(),
      db
        .collection('accountRequests')
        .find({})
        .sort({ createdAt: -1 })
        .limit(250)
        .toArray(),
      db.collection('system_settings').findOne({ key: 'general' }),
      buildStaffChatThreads(db),
      db
        .collection('users')
        .find(
          {},
          {
            projection: {
              password: 0,
              boundDevices: 0,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),
      db.collection('payment_methods').find({}).sort({ name: 1 }).toArray(),
    ]);

    const mappedRequests = requests.map((r) => mapAccountRequest(r));

    return NextResponse.json(
      {
        success: true,
        stats,
        deposits,
        redemptions: redemptions.map((r) => ({
          ...r,
          _id: r._id?.toString?.() || r._id,
        })),
        requests: mappedRequests,
        accountRequests: mappedRequests,
        settings: settings || null,
        threads,
        users: users.map((u) => ({
          ...u,
          _id: u._id?.toString?.() || u._id,
          id: u._id?.toString?.() || u._id,
        })),
        methods,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
