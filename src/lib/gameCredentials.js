/**
 * Staff-side suggested game platform login / PIN for issuance modals.
 */

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function generateGameUsername(playerUsername = '') {
  const base =
    String(playerUsername || 'hood')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 10)
      .toLowerCase() || 'hood';
  const suffix = randomInt(100, 9999);
  return `${base}${suffix}`;
}

/** 6-digit PIN style password common on sweeps platforms */
export function generateGamePassword() {
  return String(randomInt(100000, 999999));
}

export function generateGameCredentialPair(playerUsername = '') {
  return {
    gameUsername: generateGameUsername(playerUsername),
    gamePassword: generateGamePassword(),
  };
}
