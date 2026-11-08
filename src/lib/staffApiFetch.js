/** Admin desk fetches — always send cookies; avoid player+admin dual-session listing wrong data. */
export function staffApiFetch(url, init = {}) {
  return fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
}
