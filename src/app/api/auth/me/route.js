import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(req.url);
    const referer = req.headers.get('referer') || '';
    const isAdminQuery = searchParams.get('admin') === 'true' || referer.includes('/admin');

    const sessionType = isAdminQuery ? 'admin' : 'player';
    const user = await getSessionUser(req, sessionType);
    if (!user) {
      return NextResponse.json({ success: false, user: null, sessionType }, { status: 401 });
    }
    return NextResponse.json({ success: true, user, sessionType });
  } catch (err) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
