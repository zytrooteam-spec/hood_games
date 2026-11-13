import { readJson, writeJson, HOOD_ACCOUNT_STAFF_CLOSES } from '@/lib/clientCache';
import { isClosedAccountRequestStatus } from '@/lib/accountRequestDeskMerge';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function pruneItems(items) {
  if (!items || typeof items !== 'object') return {};
  const now = Date.now();
  const next = {};
  Object.entries(items).forEach(([id, entry]) => {
    if (!entry?.status) return;
    if (entry.at && now - entry.at > MAX_AGE_MS) return;
    next[id] = entry;
  });
  return next;
}

export function readStaffAccountCloses() {
  const raw = readJson(HOOD_ACCOUNT_STAFF_CLOSES);
  const items = pruneItems(raw?.items);
  return items;
}

export function recordStaffAccountClose(id, status, patch = {}) {
  const key = String(id || '');
  if (!key || !status) return;
  const st = String(status).toUpperCase();
  if (!isClosedAccountRequestStatus(st)) return;
  const items = readStaffAccountCloses();
  items[key] = {
    status: st,
    patch: patch || {},
    at: Date.now(),
  };
  writeJson(HOOD_ACCOUNT_STAFF_CLOSES, { items });
}

export function clearStaffAccountClose(id) {
  const key = String(id || '');
  if (!key) return;
  const items = readStaffAccountCloses();
  if (!items[key]) return;
  delete items[key];
  writeJson(HOOD_ACCOUNT_STAFF_CLOSES, { items });
}

export function hydratePatchMapFromStaffCloses(patchMap) {
  if (!patchMap) return;
  const items = readStaffAccountCloses();
  const until = Date.now() + 86400000;
  Object.entries(items).forEach(([id, entry]) => {
    patchMap.set(id, {
      status: entry.status,
      patch: entry.patch || {},
      until,
    });
  });
}

export function applyStaffCloseToRow(row, items = readStaffAccountCloses()) {
  if (!row) return row;
  const key = String(row.id || row._id || '');
  if (!key) return row;
  const hold = items[key];
  if (!hold) return row;

  const incoming = String(row.status || '').toUpperCase();
  const held = String(hold.status || '').toUpperCase();

  if (incoming === 'PENDING' && isClosedAccountRequestStatus(held)) {
    return { ...row, ...hold.patch, status: hold.status };
  }
  if (isClosedAccountRequestStatus(incoming) && incoming === held) {
    clearStaffAccountClose(key);
    return row;
  }
  return row;
}

export function applyStaffClosesToList(rows) {
  if (!Array.isArray(rows)) return [];
  const items = readStaffAccountCloses();
  return rows.map((r) => applyStaffCloseToRow(r, items));
}
