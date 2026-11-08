export function normalizeGameKey(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findUserAccountForGame(accounts = [], game) {
  if (!game) return null;
  const gameKey = normalizeGameKey(game.title || game.name);
  const gameId = game.id || game._id || game.gameId;

  return (
    accounts.find((acc) => {
      if (gameId && (acc.gameId || acc.game_id)) {
        if (String(acc.gameId || acc.game_id) === String(gameId)) return true;
      }
      const accKey = normalizeGameKey(acc.gameTitle || acc.title);
      if (!gameKey || !accKey) return false;
      return gameKey === accKey || gameKey.includes(accKey) || accKey.includes(gameKey);
    }) || null
  );
}

export function findGameForAccount(games = [], account) {
  if (!account) return null;
  const accKey = normalizeGameKey(account.gameTitle || account.title);
  const accGameId = account.gameId || account.game_id;

  return (
    games.find((g) => {
      const gId = g.id || g._id || g.gameId;
      if (accGameId && gId && String(gId) === String(accGameId)) return true;
      const gKey = normalizeGameKey(g.title || g.name);
      if (!gKey || !accKey) return false;
      return gKey === accKey || gKey.includes(accKey) || accKey.includes(gKey);
    }) || null
  );
}

export function isPendingGameRequest(pendingRequests = [], game) {
  if (!game) return false;
  const gameKey = normalizeGameKey(game.title);
  return pendingRequests.some((p) => {
    const pKey = normalizeGameKey(p.gameTitle);
    const status = String(p.status || 'pending').toLowerCase();
    if (status !== 'pending') return false;
    if (p.requestType === 'COIN_LOAD' || Number(p.transferAmount || 0) > 0) return false;
    if (!gameKey || !pKey) return false;
    return gameKey === pKey || gameKey.includes(pKey) || pKey.includes(gameKey);
  });
}
