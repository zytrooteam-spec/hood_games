import { readJson, writeJson } from '@/lib/clientCache';

const STORAGE_KEY = 'hood_admin_completed_request_ids';

export function readCompletedRequestIds() {
  const raw = readJson(STORAGE_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

export function markRequestCompletedHidden(id) {
  const key = String(id || '');
  if (!key) return;
  const prev = readCompletedRequestIds();
  prev[key] = Date.now();
  writeJson(STORAGE_KEY, prev);
}

export function clearRequestCompletedHidden(id) {
  const key = String(id || '');
  if (!key) return;
  const prev = readCompletedRequestIds();
  if (!prev[key]) return;
  delete prev[key];
  writeJson(STORAGE_KEY, prev);
}

export function filterOutCompletedRows(rows, extra = {}) {
  if (!Array.isArray(rows)) return [];
  const tomb = { ...readCompletedRequestIds(), ...extra };
  return rows.filter((r) => {
    const key = String(r.id || r._id || '');
    return key && !tomb[key];
  });
}
