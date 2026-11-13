/**
 * Default SSE-backup poll options (Winning Heaven parity).
 */
export function hoodSsePoll(intervalMs, overrides = {}) {
  const ms = Number(intervalMs) || 0;
  if (ms <= 0) {
    return { runOnStart: false, runWhenHidden: false, ...overrides };
  }
  return {
    whenDisconnected: ms,
    whenConnected: Math.max(ms * 4, ms <= 500 ? 2000 : 3200),
    runOnStart: overrides.runOnStart ?? false,
    runWhenHidden: overrides.runWhenHidden ?? true,
    ...overrides,
  };
}
