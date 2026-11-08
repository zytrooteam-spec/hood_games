import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb, toIdQuery } from './mongodb';
import { getJwtSecret } from './jwtSecret.server';

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  PLAYER: 'player',
};

const STAFF_ROLES = new Set([
  'admin',
  'superadmin',
  'staff',
  'coin_manager',
  'financial_manager',
  'support_admin',
]);

export function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}

export async function hashPassword(plain) {
  return await bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hashed) {
  return await bcrypt.compare(plain, hashed);
}

function parseCookies(cookieHeader) {
  if (!cookieHeader || !String(cookieHeader).trim()) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      const k = c.slice(0, idx).trim();
      const v = c.slice(idx + 1).trim();
      return [k, v];
    })
  );
}

function readCookie(req, name) {
  try {
    const fromJar = req?.cookies?.get?.(name);
    if (fromJar?.value) return fromJar.value;
  } catch {
    /* ignore */
  }
  const header = req?.headers?.get?.('cookie') || '';
  const parsed = parseCookies(header);
  return parsed[name] || null;
}

export async function loadUserFromToken(decoded) {
  if (!decoded || !decoded.userId) return null;

  const db = await getDb();
  const user = await db.collection('users').findOne(toIdQuery(decoded.userId));
  if (!user) {
    return {
      _id: decoded.userId,
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'player',
      balanceSC: 0,
      balanceGC: 0,
      isVerified: true,
      status: 'active',
    };
  }

  return {
    _id: user._id,
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role || 'player',
    balanceSC: Number(user.balanceSC || 0),
    balanceGC: Number(user.balanceGC || 0),
    frozenBalance: Number(user.frozenBalance || 0),
    availableSpins: Number(user.availableSpins || 0),
    isVerified: Boolean(user.isVerified),
    status: user.status || 'active',
  };
}

/**
 * Resolve session from request cookies.
 * @param {Request} req
 * @param {'auto'|'admin'|'player'} [preferredType='auto']
 *   - admin: only admin_session (admin tab)
 *   - player: only players_session / legacy token (player tab)
 *   - auto: admin referer → admin cookie; else player first
 */
async function readSessionCookies(req) {
  try {
    const jar = await cookies();
    const fromJar = {
      admin_session: jar.get('admin_session')?.value || null,
      players_session: jar.get('players_session')?.value || null,
      vegas_session: jar.get('vegas_session')?.value || null,
      token: jar.get('token')?.value || null,
      hood_token: jar.get('hood_token')?.value || null,
      auth_token: jar.get('auth_token')?.value || null,
    };
    if (
      fromJar.admin_session ||
      fromJar.players_session ||
      fromJar.token ||
      fromJar.vegas_session
    ) {
      return fromJar;
    }
  } catch {
    /* fall back to Cookie header */
  }
  return {
    admin_session: readCookie(req, 'admin_session'),
    players_session: readCookie(req, 'players_session'),
    vegas_session: readCookie(req, 'vegas_session'),
    token: readCookie(req, 'token'),
    hood_token: readCookie(req, 'hood_token'),
    auth_token: readCookie(req, 'auth_token'),
  };
}

export async function getSessionUser(req, preferredType = 'auto') {
  try {
    const jar = await readSessionCookies(req);
    const adminToken = jar.admin_session;
    const playerToken =
      jar.players_session ||
      jar.vegas_session ||
      jar.token ||
      jar.hood_token ||
      jar.auth_token;

    const referer = req.headers.get('referer') || '';
    const url = req.url || '';
    let pathname = '';
    try {
      pathname = new URL(url).pathname || '';
    } catch {
      pathname = '';
    }
    const adminContext =
      preferredType === 'admin' ||
      referer.includes('/admin') ||
      pathname.startsWith('/admin') ||
      url.includes('admin=true');

    let token = null;

    if (preferredType === 'admin') {
      token = adminToken;
    } else if (preferredType === 'player') {
      token = playerToken;
    } else if (adminContext && adminToken) {
      token = adminToken;
    } else if (playerToken) {
      token = playerToken;
    }
    // Never fall back to admin_session on player routes — keeps admin + player tabs independent

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;
    const user = await loadUserFromToken(decoded);
    if (!user) return null;

    if (preferredType === 'player' && isStaffRole(user.role)) {
      return null;
    }
    if (preferredType === 'admin' && !isStaffRole(user.role)) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('getSessionUser error:', err);
    return null;
  }
}

export function isStaffRole(role) {
  return STAFF_ROLES.has(String(role || '').toLowerCase());
}
