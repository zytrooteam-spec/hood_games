import { WHEEL_SLICES } from '@/lib/wheelConstants';

/** Default odds mirror current hard-coded daily-spin POST logic. */
export const DEFAULT_WHEEL_ODDS = [
  { id: 'p3', label: '$3 SC', value: 3, percent: 10, sliceIndexes: [3] },
  { id: 'p2', label: '$2 SC', value: 2, percent: 20, sliceIndexes: [2, 6] },
  { id: 'p1', label: '$1 SC', value: 1, percent: 40, sliceIndexes: [0, 4, 7] },
  { id: 'p0', label: 'Bad luck / Try again', value: 0, percent: 30, isBadLuck: true, sliceIndexes: [1, 5] },
];

export function getDefaultWheelConfig() {
  return {
    slices: WHEEL_SLICES.map((s) => ({ ...s })),
    odds: DEFAULT_WHEEL_ODDS.map((o) => ({ ...o })),
  };
}

export function resolveWheelConfig(settings) {
  const base = getDefaultWheelConfig();
  const fromDb = settings?.wheelConfig;
  if (!fromDb || typeof fromDb !== 'object') return base;

  const slices =
    Array.isArray(fromDb.slices) && fromDb.slices.length >= 4
      ? fromDb.slices
      : base.slices;
  const odds =
    Array.isArray(fromDb.odds) && fromDb.odds.length >= 1
      ? fromDb.odds
      : base.odds;

  return { slices, odds };
}

/** Pick prize using admin percentage weights (must sum ~100). */
export function pickWheelOutcome(odds) {
  const list = (odds || DEFAULT_WHEEL_ODDS).map((o) => ({
    ...o,
    percent: Math.max(0, Number(o.percent || 0)),
  }));
  const total = list.reduce((s, o) => s + o.percent, 0) || 100;
  let r = Math.random() * total;
  let chosen = list[list.length - 1];
  for (const o of list) {
    r -= o.percent;
    if (r <= 0) {
      chosen = o;
      break;
    }
  }
  const indexes = Array.isArray(chosen.sliceIndexes) ? chosen.sliceIndexes : [0];
  const sliceIndex = indexes[Math.floor(Math.random() * indexes.length)] ?? 0;
  const prizeAmount = Number(chosen.value || 0);
  const isBadLuck = Boolean(chosen.isBadLuck || prizeAmount <= 0);
  return { prizeAmount, sliceIndex, isBadLuck, tier: chosen };
}
