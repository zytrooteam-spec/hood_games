import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { computeAdminStats } from '@/lib/adminStats.server';

export async function GET(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const db = await getDb();
    const stats = await computeAdminStats(db);

    return NextResponse.json({ success: true, stats });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
