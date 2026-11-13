const TTL_MS = 50_000;
const inflight = new Map();
const store = new Map();

export function peekPlayer360(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const row = store.get(id);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    store.delete(id);
    return null;
  }
  return row.data;
}

export function setPlayer360Cache(userId, data) {
  const id = String(userId || '').trim();
  if (!id || !data) return;
  store.set(id, { at: Date.now(), data });
}

export function invalidatePlayer360(userId) {
  const id = String(userId || '').trim();
  if (id) store.delete(id);
}

/** Prefetch full 360 payload for admin desk (deduped). */
export function prefetchPlayer360(userId) {
  const id = String(userId || '').trim();
  if (!id) return Promise.resolve(null);
  const hit = peekPlayer360(id);
  if (hit) return Promise.resolve(hit);
  if (inflight.has(id)) return inflight.get(id);

  const p = fetch(`/api/users?userId=${encodeURIComponent(id)}`, { cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => {
      if (d?.success) {
        const payload = { ...d };
        delete payload.success;
        setPlayer360Cache(id, payload);
        return payload;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}
