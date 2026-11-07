function hostName(hostHeader) {
  return String(hostHeader || '').split(':')[0].toLowerCase();
}

/** Optional shared domain — host-only cookies are more reliable on mobile browsers. */
function sharedCookieDomain() {
  const fromEnv = process.env.COOKIE_DOMAIN?.trim();
  if (fromEnv) return fromEnv;
  return undefined;
}

/** HttpOnly session cookie options (respects HTTPS behind nginx). */
export function getSessionCookieOptions(req) {
  const forwarded = (req?.headers?.get?.('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const host = req?.headers?.get?.('host') || '';
  const hostIsLocal = host.includes('localhost') || host.startsWith('127.0.0.1');

  let secure = false;
  if (process.env.COOKIE_SECURE === 'true') secure = true;
  else if (process.env.COOKIE_SECURE === 'false') secure = false;
  else if (forwarded === 'https') secure = true;
  else if (process.env.NODE_ENV === 'production' && !hostIsLocal) secure = forwarded !== 'http';

  const opts = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };

  const domain = sharedCookieDomain();
  if (domain) opts.domain = domain;

  return opts;
}
