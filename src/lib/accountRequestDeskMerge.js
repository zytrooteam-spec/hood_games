import { applyStaffCloseToRow } from '@/lib/accountRequestStaffClose';

const CLOSED_STATUSES = new Set(['REJECTED', 'READY', 'DISMISSED', 'APPROVED', 'CANCELLED']);

export function isClosedAccountRequestStatus(status) {
  return CLOSED_STATUSES.has(String(status || '').toUpperCase());
}

/** Prevent poll/parent seed from resurrecting PENDING after staff closed a row. */
export function mergeAccountRequestRowFromServer(row, patchMap) {
  if (!row) return row;
  let base = applyStaffCloseToRow(row);
  if (!patchMap) return base;
  const key = String(base.id || base._id || '');
  if (!key) return base;
  const hold = patchMap.get(key);
  if (!hold) return base;
  row = base;

  const incoming = String(row.status || '').toUpperCase();
  const held = String(hold.status || '').toUpperCase();

  if (hold.until && Date.now() > hold.until) {
    if (!isClosedAccountRequestStatus(held) || !isClosedAccountRequestStatus(incoming)) {
      patchMap.delete(key);
    }
    return row;
  }

  if (incoming === 'PENDING' && isClosedAccountRequestStatus(held)) {
    return { ...row, ...hold.patch, status: hold.status };
  }
  if (isClosedAccountRequestStatus(held) && incoming !== held && incoming === 'PENDING') {
    return { ...row, ...hold.patch, status: hold.status };
  }
  if (isClosedAccountRequestStatus(incoming) && incoming === held) {
    patchMap.delete(key);
  }
  return row;
}

export function mergeAccountRequestListFromServer(rows, patchMap) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mergeAccountRequestRowFromServer(r, patchMap));
}

export function mergeAccountRequestListsPreferLocalClosed(parentRows, localRows) {
  if (!Array.isArray(parentRows)) return [];
  const localMap = new Map((localRows || []).map((r) => [String(r.id || r._id), r]));
  return parentRows.map((r) => {
    const key = String(r.id || r._id);
    const loc = localMap.get(key);
    if (!loc) return r;
    const pSt = String(r.status || '').toUpperCase();
    const lSt = String(loc.status || '').toUpperCase();
    if (pSt === 'PENDING' && isClosedAccountRequestStatus(lSt)) return { ...r, ...loc, status: loc.status };
    return r;
  });
}
