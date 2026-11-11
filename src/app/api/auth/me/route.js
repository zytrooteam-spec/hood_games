import { NextResponse } from 'next/server';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { authMeCacheKey } from '@/lib/authCache';
import { cache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const referer = req.headers.get('referer') || '';
    const sessionHint = searchParams.get('session');
    const forcePlayer =
      sessionHint === 'player' ||
      sessionHint === 'players' ||
      (referer && !referer.includes('/admin') && referer.includes('session=player'));
    const isAdminQuery =
      !forcePlayer &&
      (searchParams.get('admin') === 'true' || referer.includes('/admin'));

    const sessionType = isAdminQuery ? 'admin' : 'player';
    const session = await getSessionUser(req, sessionType);
    if (!session) {
      return NextResponse.json({ success: false, user: null, sessionType }, { status: 401 });
    }

    const cacheKey = authMeCacheKey(session.userId);
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, user: cached, sessionType });
    }

    await ensureDbReady();
    const db = await getDb();
    const row = await db.collection('users').findOne(toIdQuery(session.userId), {
      projection: { password: 0, boundDevices: 0 },
    });

    if (!row) {
      return NextResponse.json({ success: true, user: session, sessionType });
    }

    if (row.status === 'banned' || row.status === 'suspended') {
      const resp = NextResponse.json(
        { success: false, user: null, error: 'Account suspended.', sessionType },
        { status: 403 }
      );
      resp.cookies.delete('players_session');
      return resp;
    }

    const uid = row._id.toString();
    const userData = {
      id: uid,
      _id: uid,
      userId: uid,
      username: row.username,
      email: row.email,
      role: row.role || 'player',
      balanceSC: Number(row.balanceSC || 0),
      balanceGC: Number(row.balanceGC || 0),
      frozenBalance: Number(row.frozenBalance || 0),
      availableSpins: Number(row.availableSpins || 0),
      isVerified: Boolean(row.isVerified),
      status: row.status || 'active',
      referralCode: row.referralCode || '',
      referredBy: row.referredBy || '',
    };

    cache.set(cacheKey, userData, 3);

    return NextResponse.json({ success: true, user: userData, sessionType });
  } catch (err) {
    return NextResponse.json({ success: false, user: null, error: err.message }, { status: 500 });
  }
}
