'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { staffApiFetch } from '@/lib/staffApiFetch';
import { readJson, writeJson } from '@/lib/clientCache';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';

/**
 * Winning Heaven pattern: show cached JSON instantly, revalidate in background, keep previous rows while loading.
 */
export default function useAdminCachedFetch(url, { cacheKey, pollMs = 0, enabled = true } = {}) {
  const active = enabled && Boolean(url);
  const initial = cacheKey ? readJson(cacheKey) : null;
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const inFlightRef = useRef(false);

  const revalidate = useCallback(
    async (silent = true) => {
      if (!active || !url || inFlightRef.current) return;
      inFlightRef.current = true;
      if (!silent && !dataRef.current) setLoading(true);
      try {
        const res = await staffApiFetch(url, { cache: 'no-store' });
        const json = await res.json();
        if (json?.success !== false) {
          setData(json);
          if (cacheKey) writeJson(cacheKey, { ...json, t: Date.now() });
          setError(null);
        }
      } catch (e) {
        setError(e);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [url, cacheKey, active]
  );

  useEffect(() => {
    if (!active) return;
    revalidate(Boolean(initial));
  }, [active, revalidate, initial]);

  useEffect(() => {
    if (!active || !pollMs) return;
    const onPulse = () => revalidate(true);
    window.addEventListener('hood-admin-desk-sync', onPulse);
    window.addEventListener('hood-admin-refresh', onPulse);
    const stop = startSseBackedPoll(() => revalidate(true), {
      whenDisconnected: pollMs,
      whenConnected: Math.max(pollMs * 4, 120_000),
      runOnStart: false,
      runWhenHidden: true,
    });
    return () => {
      stop();
      window.removeEventListener('hood-admin-desk-sync', onPulse);
      window.removeEventListener('hood-admin-refresh', onPulse);
    };
  }, [active, pollMs, revalidate]);

  return { data, loading, error, mutate: revalidate };
}
