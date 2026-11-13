'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { staffApiFetch } from '@/lib/staffApiFetch';
import { readJson, writeJson } from '@/lib/clientCache';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';
import { hoodSsePoll } from '@/lib/ssePollOptions';

/**
 * Winning Heaven pattern: show cached JSON instantly, revalidate in background.
 * Cache hydrates after mount to avoid hydration mismatch.
 */
export default function useAdminCachedFetch(url, { cacheKey, pollMs = 0, enabled = true } = {}) {
  const active = enabled && Boolean(url);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const inFlightRef = useRef(false);
  const cacheHydratedRef = useRef(false);

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
    if (!cacheKey || cacheHydratedRef.current) return;
    cacheHydratedRef.current = true;
    const cached = readJson(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!active) return;
    const hadCache = Boolean(cacheKey && readJson(cacheKey));
    revalidate(hadCache);
  }, [active, revalidate, cacheKey]);

  useEffect(() => {
    if (!active || !pollMs) return;
    const onPulse = () => revalidate(true);
    window.addEventListener('hood-admin-desk-sync', onPulse);
    window.addEventListener('hood-admin-refresh', onPulse);
    const stop = startSseBackedPoll(() => revalidate(true), hoodSsePoll(pollMs));
    return () => {
      stop();
      window.removeEventListener('hood-admin-desk-sync', onPulse);
      window.removeEventListener('hood-admin-refresh', onPulse);
    };
  }, [active, pollMs, revalidate]);

  return { data, loading, error, mutate: revalidate };
}
