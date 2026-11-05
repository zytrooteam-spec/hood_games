/** Standard platform names (fallback when admin library is empty). */
export const ALL_PLATFORM_GAMES = [
  'Ultra Panda',
  'Fire Kirin',
  'Orion Stars',
  'Milky Way',
  'Game Vault',
  'Juwa City',
  'Panda Master',
  'Mega Spin',
  'River Sweeps',
  'Vblink',
];

/**
 * Merge admin library, player linked accounts, and defaults.
 * Linked accounts sort to the top (Player Paradise behavior).
 */
export function getAvailableGamePlatforms(adminGames = [], userAccounts = []) {
  const map = new Map();

  (adminGames || []).forEach((g) => {
    const title = (typeof g === 'string' ? g : g?.title || g?.name || '').trim();
    if (title) map.set(title.toLowerCase(), title);
  });

  (userAccounts || []).forEach((a) => {
    const title = (a?.gameTitle || a?.title || '').trim();
    if (title) map.set(title.toLowerCase(), title);
  });

  ALL_PLATFORM_GAMES.forEach((title) => {
    if (!map.has(title.toLowerCase())) map.set(title.toLowerCase(), title);
  });

  const list = Array.from(map.values());

  list.sort((a, b) => {
    const aHas = (userAccounts || []).some(
      (acc) => (acc.gameTitle || '').toLowerCase().trim() === a.toLowerCase().trim()
    );
    const bHas = (userAccounts || []).some(
      (acc) => (acc.gameTitle || '').toLowerCase().trim() === b.toLowerCase().trim()
    );
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.localeCompare(b);
  });

  return list;
}
