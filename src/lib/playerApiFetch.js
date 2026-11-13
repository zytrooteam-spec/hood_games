/**
 * Player-facing API calls — always send session cookies (required for APK / Capacitor WebView).
 */
export function playerApiFetch(url, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (init.body != null && !headers['Content-Type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      'X-Hood-Player-Chat': '1',
      ...headers,
    },
  });
}
