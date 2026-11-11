import { ObjectId } from 'mongodb';

function makeCaseInsensitiveRegex(str) {
  if (!str) return null;
  return new RegExp(`^${str.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

/** Player must have a READY game account before cashout (Player Paradise rule). */
export async function findUserGameAccount(db, { userId, userEmail, username }, gameTitle) {
  if (!db || !gameTitle) return { exists: false, username: '' };

  const cleanGame = String(gameTitle).trim();
  const gameRegex = makeCaseInsensitiveRegex(cleanGame);

  const userConditions = [];
  if (userEmail) {
    userConditions.push({ userEmail: makeCaseInsensitiveRegex(userEmail) });
    userConditions.push({ email: makeCaseInsensitiveRegex(userEmail) });
  }
  if (username) {
    userConditions.push({ username: makeCaseInsensitiveRegex(username) });
    userConditions.push({ userName: makeCaseInsensitiveRegex(username) });
  }
  if (userId) {
    userConditions.push({ userId: String(userId) });
    if (ObjectId.isValid(userId)) {
      userConditions.push({ userId: new ObjectId(userId) });
    }
  }

  if (userConditions.length === 0) {
    return { exists: false, username: '' };
  }

  const gameMatch = {
    $or: [
      { gameTitle: gameRegex },
      { gameTitle: cleanGame },
      { gameId: cleanGame.toLowerCase().replace(/\s+/g, '-') },
    ],
  };

  const gameAccount = await db.collection('game_accounts').findOne({
    $and: [{ $or: userConditions }, gameMatch],
  });
  if (gameAccount && (gameAccount.username || gameAccount.gameAccountUsername || gameAccount.gameUsername)) {
    return {
      exists: true,
      username:
        gameAccount.gameUsername ||
        gameAccount.username ||
        gameAccount.gameAccountUsername ||
        '',
      gameTitle: gameAccount.gameTitle || cleanGame,
      account: gameAccount,
    };
  }

  const readyRequest = await db.collection('accountRequests').findOne({
    $and: [
      { $or: userConditions },
      gameMatch,
      { status: { $in: ['approved', 'READY', 'ready'] } },
      { gameUsername: { $exists: true, $ne: '' } },
    ],
  });
  if (readyRequest && (readyRequest.gameAccountUsername || readyRequest.username || readyRequest.gameUsername)) {
    return {
      exists: true,
      username:
        readyRequest.gameUsername ||
        readyRequest.gameAccountUsername ||
        readyRequest.username ||
        '',
      gameTitle: readyRequest.gameTitle || cleanGame,
      account: readyRequest,
    };
  }

  return { exists: false, username: '' };
}
