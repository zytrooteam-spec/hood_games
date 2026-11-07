/** HttpOnly session cookie options (respects HTTPS behind nginx). */
export function getSessionCookieOptions(req) {
  const forwarded = req?.headers?.get?.('x-forwarded-proto') || '';
  const host = req?.headers?.get?.('host') || '';
  const hostIsLocal = host.includes('localhost') || host.startsWith('127.0.0.1');

  let secure = false;
  if (process.env.COOKIE_SECURE === 'true') secure = true;
  else if (process.env.COOKIE_SECURE === 'false') secure = false;
  else if (process.env.NODE_ENV === 'production' && !hostIsLocal) secure = true;
  else if (forwarded.includes('https')) secure = true;

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };
}
