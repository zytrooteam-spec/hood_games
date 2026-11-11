import { NextResponse } from 'next/server';
import { getSessionCookieOptions } from '@/lib/sessionCookies.server';
import { verifyToken } from '@/lib/auth';
import { invalidateAuthCache } from '@/lib/authCache';

export const runtime = 'nodejs';

function clearCookieOpts(req) {
  const base = getSessionCookieOptions(req);
  return {
    ...base,
    maxAge: 0,
    expires: new Date(0),
  };
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const referer = req.headers.get('referer') || '';
  const isAdminLogout = Boolean(body.isAdminLogout || referer.includes('/admin'));

  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const pick =
      (isAdminLogout ? cookieHeader.match(/admin_session=([^;]+)/) : cookieHeader.match(/players_session=([^;]+)/)) ||
      cookieHeader.match(/token=([^;]+)/);
    const raw = pick?.[1];
    if (raw) {
      const decoded = verifyToken(decodeURIComponent(raw));
      if (decoded?.userId) invalidateAuthCache(decoded.userId);
    }
  } catch {}

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  const clear = clearCookieOpts(req);

  if (isAdminLogout) {
    response.cookies.set('admin_session', '', clear);
  } else {
    response.cookies.set('players_session', '', clear);
    response.cookies.set('token', '', clear);
  }

  return response;
}
