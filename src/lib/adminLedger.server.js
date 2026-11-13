const BONUS_LEDGER_TYPES = new Set([
  'cashback',
  'free_spin',
  'depositor_spin_bonus',
  'affiliate',
  'bonus',
  'freeplay',
  'coin_bonus',
]);

export function mapDepositRow(d) {
  return {
    id: String(d._id),
    type: 'deposit',
    username: d.username || d.userName || '',
    amount: Number(d.amount || 0),
    direction: 'in',
    method: d.method || '',
    status: d.status || 'pending',
    reference: d.senderTag || d.transactionId || '',
    createdAt: d.createdAt,
  };
}

export function mapRedemptionRow(r) {
  return {
    id: String(r._id),
    type: 'redemption',
    username: r.username || r.userName || '',
    amount: Number(r.amount || 0),
    direction: 'out',
    method: r.method || '',
    status: r.status || 'pending',
    reference: r.payoutAddress || r.cashtag || '',
    createdAt: r.createdAt,
  };
}

export function mapLedgerDoc(l) {
  const t = String(l.type || 'ledger').toLowerCase();
  let type = 'ledger';
  let direction = 'bonus';
  if (t.includes('deposit')) type = 'deposit';
  else if (t.includes('withdraw') || t.includes('redeem')) type = 'redemption';
  else if (t.includes('spin')) type = 'free_spin';
  else if (t.includes('cashback')) type = 'cashback';
  else if (t.includes('load') || t.includes('transfer')) type = 'game_load';

  if (type === 'deposit') direction = 'in';
  else if (type === 'redemption' || type === 'game_load') direction = 'out';

  return {
    id: String(l._id),
    type,
    username: l.username || '',
    amount: Math.abs(Number(l.amount || 0)),
    direction,
    method: l.description || l.method || type,
    status: l.status || 'credited',
    reference: l.referenceId || l.notes || '',
    createdAt: l.createdAt,
  };
}

export function mapCashbackRow(c) {
  return {
    id: String(c._id),
    type: 'cashback',
    username: c.username || '',
    amount: Number(c.cashbackAmount || 0),
    direction: 'bonus',
    method: `${c.percentage || 0}% Sunday`,
    status: 'credited',
    reference: c.weekKey || '',
    createdAt: c.claimedAt || c.createdAt,
  };
}

export function mapSpinRow(s) {
  return {
    id: String(s._id),
    type: 'free_spin',
    username: s.username || '',
    amount: Number(s.amountSC ?? s.prizeSC ?? s.amount ?? 0),
    direction: 'bonus',
    method: 'Daily Wheel',
    status: 'credited',
    reference: s.prizeLabel || s.label || '',
    createdAt: s.createdAt,
  };
}

export function mapTransferRow(t) {
  return {
    id: String(t._id),
    type: 'game_load',
    username: t.username || '',
    amount: Number(t.amount || 0),
    direction: 'out',
    method: t.gameTitle || 'Game load',
    status: t.status || 'pending',
    reference: t.gameTitle || '',
    createdAt: t.createdAt,
  };
}

export function rowMatchesQuery(row, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.id, row.username, row.method, row.reference, row.status, row.type].some((v) =>
    String(v || '').toLowerCase().includes(needle)
  );
}

export function sortRowsNewest(rows) {
  return [...rows].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export { BONUS_LEDGER_TYPES };
