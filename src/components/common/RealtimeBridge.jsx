'use client';

import { useEffect, useRef } from 'react';
import { applyRealtimeEvent, buildRealtimeUrl } from '@/lib/realtimeClient';

const MAX_BACKOFF_MS = 8000;
const BASE_BACKOFF_MS = 400;

export default function RealtimeBridge() {
  const esRef = useRef(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        esRef.current?.close();
      } catch {}

      const es = new EventSource(buildRealtimeUrl(), { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        backoffRef.current = BASE_BACKOFF_MS;
      };

      es.onmessage = (ev) => {
        if (!ev.data) return;
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === 'CONNECTED') return;
          applyRealtimeEvent(payload);
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        window.dispatchEvent(new CustomEvent('hood-sse-status', { detail: { connected: false } }));
        try {
          es.close();
        } catch {}
        esRef.current = null;
        if (cancelled) return;
        const wait = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 1.6, MAX_BACKOFF_MS);
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connect, wait);
      };
    };

    const onReconnect = () => {
      backoffRef.current = BASE_BACKOFF_MS;
      connect();
    };

    connect();
    window.addEventListener('hood-guest-chat-ready', onReconnect);
    window.addEventListener('hood-player-session-ready', onReconnect);

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      window.removeEventListener('hood-guest-chat-ready', onReconnect);
      window.removeEventListener('hood-player-session-ready', onReconnect);
      try {
        esRef.current?.close();
      } catch {}
      esRef.current = null;
    };
  }, []);

  return null;
}
