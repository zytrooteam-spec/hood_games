import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, toIdQuery } from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'hood_games_ultra_secret_vip_key_2026';

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  PLAYER: 'player',
};

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

/**
 * Get the authenticated user from the Request cookie or Authorization header.
 */
export async function getSessionUser(req) {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Check cookies
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      token = cookies['token'] || cookies['hood_token'] || cookies['auth_token'];
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    const db = await getDb();
    const user = await db.collection('users').findOne(toIdQuery(decoded.userId));
    if (!user) return null;

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
  } catch (err) {
    console.error('getSessionUser error:', err);
    return null;
  }
}
