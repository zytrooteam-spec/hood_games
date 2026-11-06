import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, toIdQuery } from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'hood_games_ultra_secret_vip_key_2026';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

async function loadUserFromToken(decoded) {
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
export async function getSessionUser(req, preferredType = 'auto') {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const adminToken = cookies['admin_session'];
    const playerToken =
      cookies['players_session'] || cookies['vegas_session'] || cookies['token'] || cookies['hood_token'] || cookies['auth_token'];

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
    return await loadUserFromToken(decoded);
  } catch (err) {
    console.error('getSessionUser error:', err);
    return null;
  }
}

export function isStaffRole(role) {
  return STAFF_ROLES.has(String(role || '').toLowerCase());
}
