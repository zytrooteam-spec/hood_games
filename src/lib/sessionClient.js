/** Cross-tab player session sync (does not touch admin desk tabs). */
const PLAYER_CHANNEL = 'hood_player_session';
const ADMIN_CHANNEL = 'hood_admin_session';

export function broadcastPlayerSession(user) {
  if (typeof window === 'undefined') return;
  try {
    const ch = new BroadcastChannel(PLAYER_CHANNEL);
    ch.postMessage({ type: 'sync', user: user || null });
    ch.close();
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem('hood_player_session_ping', String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function broadcastAdminSession(user) {
  if (typeof window === 'undefined') return;
  try {
    const ch = new BroadcastChannel(ADMIN_CHANNEL);
    ch.postMessage({ type: 'sync', user: user || null });
    ch.close();
  } catch {
    /* ignore */
  }
}

export function subscribePlayerSession(onSync) {
  if (typeof window === 'undefined') return () => {};
  let ch;
  try {
    ch = new BroadcastChannel(PLAYER_CHANNEL);
    ch.onmessage = (e) => {
      if (e?.data?.type === 'sync') onSync(e.data.user);
    };
  } catch {
    ch = null;
  }
  const onStorage = (e) => {
    if (e.key === 'hood_player_session_ping') onSync(undefined);
  };
  window.addEventListener('storage', onStorage);
  return () => {
    if (ch) ch.close();
    window.removeEventListener('storage', onStorage);
  };
}
