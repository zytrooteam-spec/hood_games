import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb, toObjectId } from '@/lib/mongodb';
import { signToken, ROLES } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const { identifier, password, isAdminLogin } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Username/Email and password required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const db = await getDb();

    // 1. Check against process.env admin credentials dynamically
    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD || 'HoodGamesAdmin@2026!';
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@hoodgames.com').toLowerCase();

    const envStaffUser = (process.env.STAFF_USERNAME || 'staff').toLowerCase();
    const envStaffPass = process.env.STAFF_PASSWORD || 'HoodStaff@2026!';
    const envStaffEmail = (process.env.STAFF_EMAIL || 'staff@hoodgames.com').toLowerCase();

    const isEnvAdmin = (cleanId === envAdminUser || cleanId === envAdminEmail) && password === envAdminPass;
    const isEnvStaff = (cleanId === envStaffUser || cleanId === envStaffEmail) && password === envStaffPass;

    if (isEnvAdmin || isEnvStaff) {
      const activeRole = isEnvAdmin ? ROLES.ADMIN : ROLES.STAFF;
      const activeUser = isEnvAdmin ? envAdminUser : envStaffUser;
      const activeEmail = isEnvAdmin ? envAdminEmail : envStaffEmail;

      let staffUser = await db.collection('users').findOne({
        $or: [{ username: new RegExp(`^${activeUser}$`, 'i') }, { email: activeEmail }],
      });

      const token = signToken({
        userId: staffUser?._id?.toString() || `${activeUser}_id`,
        username: activeUser,
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

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // 2. Query DB user
    const user = await db.collection('users').findOne({
      $or: [
        { email: cleanId },
        { username: new RegExp(`^${cleanId}$`, 'i') },
      ],
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return NextResponse.json({ success: false, error: 'Your account has been suspended. Please contact support.' }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    const roleLower = (user.role || 'player').toLowerCase();
    const isStaffRole = ['admin', 'superadmin', 'staff', 'coin_manager', 'financial_manager', 'support_admin'].includes(roleLower);

    if (isAdminLogin && !isStaffRole) {
      return NextResponse.json({
        success: false,
        error: 'Access Denied: Only authorized administrative personnel are permitted.',
      }, { status: 403 });
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
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

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
