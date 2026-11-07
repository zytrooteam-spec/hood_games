const STAFF_ROLES = new Set([
  'admin',
  'superadmin',
  'staff',
  'coin_manager',
  'financial_manager',
  'support_admin',
]);

/** Player shell must never treat staff JWT as a logged-in player (dual admin tab). */
export function normalizePlayerUser(user) {
  if (!user) return null;
  const role = String(user.role || 'player').toLowerCase();
  if (STAFF_ROLES.has(role)) return null;
  return user;
}

const PLAYER_ME_URL = '/api/auth/me?session=player';

/** Fetch player session; always sends cookies (WebView-safe). */
export async function fetchPlayerSession() {
  const res = await fetch(PLAYER_ME_URL, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (data?.success && data?.user) {
    return normalizePlayerUser(data.user);
  }
  return null;
}

/** After login/register API success — validate role & confirm session cookie. */
export async function confirmPlayerSession(apiUser) {
  const optimistic = normalizePlayerUser(apiUser);
  if (!optimistic) {
    return {
      ok: false,
      error: 'Staff accounts must sign in at /admin, not the player login.',
    };
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 75 * (attempt + 1)));
    const confirmed = await fetchPlayerSession();
    if (confirmed) return { ok: true, user: confirmed };
  }

  return { ok: true, user: optimistic };
}
