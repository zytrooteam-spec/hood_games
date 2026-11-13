/** Instant UI — show last-known data while API revalidates (Player Paradise pattern). */

export const HOOD_SESSION_SNAPSHOT = 'hood_player_session_snapshot';
export const HOOD_SETTINGS_SNAPSHOT = 'hood_settings_snapshot';
export const HOOD_GAME_ACCOUNTS_SNAPSHOT = 'hood_game_accounts_snapshot';
export const HOOD_ADMIN_BOOTSTRAP = 'hood_admin_bootstrap_snapshot';
export const HOOD_ADMIN_SESSION = 'hood_admin_session_snapshot';

export function readJson(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function readSessionSnapshot() {
  const data = readJson(HOOD_SESSION_SNAPSHOT);
  if (!data?.user) return null;
  return data.user;
}

export function writeSessionSnapshot(user) {
  if (!user) {
    writeJson(HOOD_SESSION_SNAPSHOT, null);
    return;
  }
  writeJson(HOOD_SESSION_SNAPSHOT, { user, t: Date.now() });
}
