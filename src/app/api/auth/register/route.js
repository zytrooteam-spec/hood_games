import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signToken, ROLES } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function POST(req) {
  try {
    await ensureDbInitialized();
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

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };
    response.cookies.set('players_session', token, cookieOpts);
    response.cookies.set('token', token, cookieOpts);

    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
