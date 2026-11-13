/** Same-browser admin tabs — works when SSE is on another PM2 worker. */

export function broadcastAdminDeskPulse() {
  try {
    const bc = new BroadcastChannel('hood-admin-events');
    bc.postMessage({ t: Date.now() });
    bc.close();
  } catch {
    /* ignore */
  }
}

export function subscribeAdminCrossTab(onPulse) {
  if (typeof window === 'undefined') return () => {};
  let bc;
  try {
    bc = new BroadcastChannel('hood-admin-events');
    bc.onmessage = () => onPulse?.();
  } catch {
    bc = null;
  }
  return () => {
    try {
      bc?.close?.();
    } catch {
      /* ignore */
    }
  };
}
