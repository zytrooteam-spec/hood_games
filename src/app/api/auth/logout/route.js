import { NextResponse } from 'next/server';
import { getSessionCookieOptions } from '@/lib/sessionCookies.server';

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
