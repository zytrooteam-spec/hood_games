'use client';

import { useEffect } from 'react';

/**
 * Paradise pattern: SSE = primary sync; HTTP poll = backup only when EventSource is down.
 */

const DEFAULT_DISCONNECTED_MS = 20_000;
const DEFAULT_CONNECTED_MS = 180_000;

function initSseFlag() {
  if (typeof window === 'undefined') return;
  if (window.__hoodSseLiveInit) return;
  window.__hoodSseLiveInit = true;
  window.__hoodSseLive = false;
  window.addEventListener('hood-sse-status', (e) => {
    window.__hoodSseLive = Boolean(e.detail?.connected);
  });
}

export function isSseLive() {
  if (typeof window === 'undefined') return false;
  initSseFlag();
  return Boolean(window.__hoodSseLive);
}

/** Returns cleanup. Interval auto-slows when SSE is connected. */
export function startSseBackedPoll(fn, opts = {}) {
  if (typeof window === 'undefined') return () => {};
  initSseFlag();
  const whenDisconnected = opts.whenDisconnected ?? DEFAULT_DISCONNECTED_MS;
  const whenConnected = opts.whenConnected ?? DEFAULT_CONNECTED_MS;
  const runOnStart = opts.runOnStart !== false;

  let timer = null;
  const run = () => {
    if (document.hidden) return;
    try {
      fn();
    } catch {
      /* ignore */
    }
  };

  const arm = () => {
    if (timer) clearInterval(timer);
    const ms = isSseLive() ? whenConnected : whenDisconnected;
    timer = setInterval(run, ms);
  };

  if (runOnStart) run();
  arm();

  const onSse = () => arm();
  window.addEventListener('hood-sse-status', onSse);

  return () => {
    if (timer) clearInterval(timer);
    window.removeEventListener('hood-sse-status', onSse);
  };
}

export function useSseBackedPoll(fn, deps, opts) {
  useEffect(() => {
    return startSseBackedPoll(fn, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
