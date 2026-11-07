import { NextResponse } from 'next/server';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(req.url);
    const referer = req.headers.get('referer') || '';
    let pathname = '';
    try {
      pathname = new URL(req.url).pathname || '';
    } catch {
      pathname = '';
    }
    const sessionHint = searchParams.get('session');
    const forcePlayer =
      sessionHint === 'player' ||
      sessionHint === 'players' ||
      (referer && !referer.includes('/admin') && referer.includes('session=player'));
    const isAdminQuery =
      !forcePlayer &&
      (searchParams.get('admin') === 'true' || referer.includes('/admin') || pathname.startsWith('/admin'));

    const sessionType = isAdminQuery ? 'admin' : 'player';
    const user = await getSessionUser(req, sessionType);
    if (!user) {
      return NextResponse.json({ success: false, user: null, sessionType }, { status: 401 });
    }
    if (sessionType === 'player' && isStaffRole(user.role)) {
      return NextResponse.json({ success: false, user: null, sessionType }, { status: 401 });
    }
    return NextResponse.json({ success: true, user, sessionType });
  } catch (err) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
