// Daily spin wheel — same prize labels & values as Players Paradise (depositor spins).
// Colors tuned for Hood Games UI (#09142a / #2cb64e theme).
export const WHEEL_SLICES = [
  { label: '$1', value: 1, color: '#12244c', text: '#2cb64e' },
  { label: 'Bad Luck', value: 0, color: '#334155', text: '#94a3b8', isBadLuck: true },
  { label: '$2', value: 2, color: '#0c3d2e', text: '#34d399' },
  { label: '$3', value: 3, color: '#3b2f0a', text: '#fbbf24' },
  { label: '$1', value: 1, color: '#0e2042', text: '#2cb64e' },
  { label: 'Try Again', value: 0, color: '#1e293b', text: '#94a3b8', isBadLuck: true },
  { label: '$2', value: 2, color: '#134e4a', text: '#2dd4bf' },
  { label: '$1', value: 1, color: '#312e4a', text: '#a78bfa' },
];

/** @deprecated use WHEEL_SLICES — kept for older imports */
export const WHEEL_SEGMENTS = WHEEL_SLICES;
