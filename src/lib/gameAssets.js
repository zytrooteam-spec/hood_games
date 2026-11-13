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

/** Admin list polls omit large base64 thumbs — keep prior images when syncing. */
export function mergeGamesPreserveImages(prev, incoming) {
  if (!Array.isArray(incoming)) return Array.isArray(prev) ? prev : [];
  if (!Array.isArray(prev) || prev.length === 0) return incoming;
  const prevById = new Map(prev.map((g) => [String(g._id), g]));
  return incoming.map((g) => {
    const id = String(g._id);
    const img = String(g.image || g.thumbnail || g.imageUrl || '').trim();
    if (img) return { ...g, _imageOmitted: false };
    const prior = prevById.get(id);
    if (!prior) return g;
    const keep = String(prior.image || prior.thumbnail || prior.imageUrl || '').trim();
    if (!keep) return g;
    return {
      ...g,
      image: prior.image || keep,
      thumbnail: prior.thumbnail || keep,
      imageUrl: prior.imageUrl || keep,
      _imageOmitted: false,
    };
  });
}

export function writeGamesCache(games) {
  try {
    if (Array.isArray(games) && games.length > 0) {
      const prior = readGamesCache();
      const toStore = prior?.length ? mergeGamesPreserveImages(prior, games) : games;
      localStorage.setItem(HOOD_GAMES_CACHE_KEY, JSON.stringify(toStore));
    }
  } catch {
    /* ignore */
  }
}
