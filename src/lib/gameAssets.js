/** Admin-uploaded image only — no static game catalog paths. */
export function getGameThumbnail(_titleOrName, fallback) {
  if (fallback && typeof fallback === 'string') {
    const trimmed = fallback.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

export const HOOD_GAMES_CACHE_KEY = 'hood_games_cache';

export function readGamesCache() {
  try {
    const raw = localStorage.getItem(HOOD_GAMES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeGamesCache(games) {
  try {
    if (Array.isArray(games) && games.length > 0) {
      localStorage.setItem(HOOD_GAMES_CACHE_KEY, JSON.stringify(games));
    }
  } catch {
    /* ignore */
  }
}
