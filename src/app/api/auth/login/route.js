import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signToken, ROLES, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

const BASE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,
};

const SESSION_COOKIE_OPTS = { ...BASE_COOKIE, path: '/' };

function attachSessionCookie(response, token, isAdminPortal) {
  if (isAdminPortal) {
    response.cookies.set('admin_session', token, SESSION_COOKIE_OPTS);
  } else {
    response.cookies.set('players_session', token, SESSION_COOKIE_OPTS);
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const { identifier, password, isAdminLogin } = await req.json();
    const referer = req.headers.get('referer') || '';
    let pathname = '';
    try {
      pathname = new URL(referer || 'http://local').pathname || '';
    } catch {
      pathname = '';
    }
    const isExplicitPlayer = isAdminLogin === false;
    const isAdminPortal =
      isAdminLogin === true ||
      (!isExplicitPlayer && (referer.includes('/admin') || pathname.startsWith('/admin')));

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Username/Email and password required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const db = await getDb();

    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD || 'HoodGamesAdmin@2026!';
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@hoodgames.com').toLowerCase();

    const envStaffUser = (process.env.STAFF_USERNAME || 'staff').toLowerCase();
    const envStaffPass = process.env.STAFF_PASSWORD || 'HoodStaff@2026!';
    const envStaffEmail = (process.env.STAFF_EMAIL || 'staff@hoodgames.com').toLowerCase();

    const isEnvAdmin = (cleanId === envAdminUser || cleanId === envAdminEmail) && password === envAdminPass;
    const isEnvStaff = (cleanId === envStaffUser || cleanId === envStaffEmail) && password === envStaffPass;

    if (isEnvAdmin || isEnvStaff) {
      if (!isAdminPortal) {
        return NextResponse.json(
          {
            success: false,
            error: 'Administrator & Staff credentials must be used at the Admin Portal (/admin).',
            isAdminOnly: true,
          },
          { status: 403 }
        );
      }

      const activeRole = isEnvAdmin ? ROLES.ADMIN : ROLES.STAFF;
      const activeUser = isEnvAdmin ? envAdminUser : envStaffUser;
      const activeEmail = isEnvAdmin ? envAdminEmail : envStaffEmail;

      let staffUser = await db.collection('users').findOne({
        $or: [{ username: new RegExp(`^${activeUser}$`, 'i') }, { email: activeEmail }],
      });

      const token = signToken({
        userId: staffUser?._id?.toString() || `${activeUser}_id`,
        username: activeUser,
        email: activeEmail,
        role: activeRole,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: staffUser?._id?.toString() || `${activeUser}_id`,
          username: activeUser,
          email: activeEmail,
          role: activeRole,
          balanceSC: staffUser?.balanceSC ?? 99999,
          balanceGC: staffUser?.balanceGC ?? 1000000,
        },
      });

      attachSessionCookie(response, token, true);
      return response;
    }

    const user = await db.collection('users').findOne({
      $or: [{ email: cleanId }, { username: new RegExp(`^${cleanId}$`, 'i') }],
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    const roleLower = (user.role || 'player').toLowerCase();
    const staff = isStaffRole(roleLower);

    if (staff && !isAdminPortal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff accounts must log in at /admin. Player login is for players only.',
          isAdminOnly: true,
        },
        { status: 403 }
      );
    }

    if (isAdminPortal && !staff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: Only authorized administrative personnel are permitted.',
        },
        { status: 403 }
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role || 'player',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || 'player',
        balanceSC: Number(user.balanceSC || 0),
        balanceGC: Number(user.balanceGC || 0),
        isVerified: Boolean(user.isVerified),
      },
    });

    attachSessionCookie(response, token, isAdminPortal);
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
