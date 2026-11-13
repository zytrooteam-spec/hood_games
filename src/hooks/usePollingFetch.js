'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readJson, writeJson } from '@/lib/clientCache';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';
import { hoodSsePoll } from '@/lib/ssePollOptions';
import { playerApiFetch } from '@/lib/playerApiFetch';

/**
 * Player-side cache-first fetch + SSE-backed poll (Winning Heaven usePollingSWR analogue).
 * Cache is applied after mount only — avoids React hydration mismatch (#418).
 */
export default function usePollingFetch(
  url,
  { cacheKey, pollMs = 0, enabled = true, fetcher = playerApiFetch } = {}
) {
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
        const res = await fetcher(url, { cache: 'no-store' });
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
    [url, cacheKey, active, fetcher]
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
    if (!active) {
      setLoading(false);
      return;
    }
    const hadCache = Boolean(cacheKey && readJson(cacheKey));
    revalidate(hadCache);
  }, [active, revalidate, cacheKey]);

  useEffect(() => {
    if (!active || !pollMs) return;
    const onPulse = () => revalidate(true);
    window.addEventListener('hood-instant-sync', onPulse);
    window.addEventListener('balanceUpdate', onPulse);
    window.addEventListener('hood-game-accounts-refresh', onPulse);
    window.addEventListener('hood-wallet-sync', onPulse);
    window.addEventListener('hood-cashier-refresh', onPulse);
    const stop = startSseBackedPoll(() => revalidate(true), hoodSsePoll(pollMs));
    return () => {
      stop();
      window.removeEventListener('hood-instant-sync', onPulse);
      window.removeEventListener('balanceUpdate', onPulse);
      window.removeEventListener('hood-game-accounts-refresh', onPulse);
      window.removeEventListener('hood-wallet-sync', onPulse);
      window.removeEventListener('hood-cashier-refresh', onPulse);
    };
  }, [active, pollMs, revalidate]);

  return { data, loading, error, mutate: revalidate };
}
