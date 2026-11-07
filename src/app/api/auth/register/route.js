import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signToken, ROLES } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { getSessionCookieOptions } from '@/lib/sessionCookies.server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const dbReady = await ensureDbInitialized();
    if (!dbReady) {
      return NextResponse.json(
        { success: false, error: 'Database not ready. Verify MONGODB_URI on the server.' },
        { status: 503 }
      );
    }
    const { username, email, password, phone, referralCode } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ success: false, error: 'Username, email, and password are required' }, { status: 400 });
    }

    const cleanUser = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUser.length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection('users').findOne({
      $or: [{ email: cleanEmail }, { username: new RegExp(`^${cleanUser}$`, 'i') }],
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return NextResponse.json({ success: false, error: 'Email is already registered' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Username is already taken' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      username: cleanUser,
      email: cleanEmail,
      phone: phone || '',
      password: passwordHash,
      role: ROLES.PLAYER,
      balanceSC: 5.0, // Welcome freeplay $5.00 SC
      balanceGC: 10000,
      referralCode: referralCode || '',
      isVerified: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    const userId = result.insertedId.toString();

    // Sign session token
    const token = signToken({
      userId,
      username: cleanUser,
      email: cleanEmail,
      role: ROLES.PLAYER,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: cleanUser,
        email: cleanEmail,
        role: ROLES.PLAYER,
        balanceSC: 5.0,
        balanceGC: 10000,
      },
    });

    response.cookies.set('players_session', token, getSessionCookieOptions(req));

    return response;
  } catch (err) {
    console.error('Registration error:', err);
    const msg =
      err?.message?.includes('MongoDB') || err?.message?.includes('MONGODB')
        ? 'Cannot reach database. Admin: check MONGODB_URI in .env and restart PM2.'
        : 'Registration failed. Please try again.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
