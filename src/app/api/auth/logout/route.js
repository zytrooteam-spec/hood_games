import { NextResponse } from 'next/server';

const CLEAR = {
  path: '/',
  maxAge: 0,
  expires: new Date(0),
  httpOnly: true,
  sameSite: 'lax',
};

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const referer = req.headers.get('referer') || '';
  const isAdminLogout = Boolean(body.isAdminLogout || referer.includes('/admin'));

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  if (isAdminLogout) {
    response.cookies.set('admin_session', '', CLEAR);
    response.cookies.delete('admin_session');
  } else {
    response.cookies.set('players_session', '', CLEAR);
    response.cookies.set('token', '', CLEAR);
    response.cookies.delete('players_session');
    response.cookies.delete('token');
  }

  return response;
}
