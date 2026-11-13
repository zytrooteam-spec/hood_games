/** Winning Heaven–style intervals (ms). SSE primary; these are tight VPS backup polls. */
export const HOOD_POLL = {
  LIVE: 500,
  STATS: 800,
  QUEUES: 600,
  LISTS: 1200,
  SUPPORT: 800,
  CHAT: 500,
  PLAYER: 1500,
  STATIC: 0,
};

/** @deprecated use HOOD_POLL */
export const HOOD_ADMIN_POLL = HOOD_POLL;
