import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { buildAdminBootstrapLite, buildAdminBootstrapFull } from '@/lib/adminBootstrap.server';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const lite =
      searchParams.get('lite') === '1' ||
      searchParams.get('lite') === 'true' ||
      searchParams.get('mode') === 'lite';

    const db = await getDb();
    const payload = lite ? await buildAdminBootstrapLite(db) : await buildAdminBootstrapFull(db);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
