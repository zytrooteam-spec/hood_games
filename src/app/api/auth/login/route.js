import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, ROLES, isStaffRole } from '@/lib/auth';
import { connectDbFast } from '@/lib/initDb';
import { after } from 'next/server';
import { getSessionCookieOptions } from '@/lib/sessionCookies.server';
import { getDeviceIdFromRequest } from '@/lib/deviceServer';
import {
  findPlayerBoundToDevice,
  deviceBindingErrorPayload,
  deviceBindingUpdateFields,
} from '@/lib/deviceBinding';
import { toIdQuery } from '@/lib/mongodb';
import { invalidateAuthCache } from '@/lib/authCache';

export const runtime = 'nodejs';

const LOGIN_USER_PROJECTION = {
  password: 1,
  username: 1,
  email: 1,
  role: 1,
  status: 1,
  balanceSC: 1,
  balanceGC: 1,
  isVerified: 1,
};

async function findLoginUser(db, identifier) {
  const raw = String(identifier || '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('@')) {
    return db.collection('users').findOne({ email: lower }, { projection: LOGIN_USER_PROJECTION });
  }
  return (
    (await db.collection('users').findOne({ username: lower }, { projection: LOGIN_USER_PROJECTION })) ||
    (await db.collection('users').findOne({ username: raw }, { projection: LOGIN_USER_PROJECTION }))
  );
}

function attachSessionCookie(response, token, isAdminPortal, req) {
  const opts = getSessionCookieOptions(req);
  if (isAdminPortal) {
    response.cookies.set('admin_session', token, opts);
  } else {
    response.cookies.set('players_session', token, opts);
  }
}

export async function POST(req) {
  try {
    const { identifier, password, isAdminLogin, deviceId: rawDeviceId } = await req.json();
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
    const db = await connectDbFast();

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

      let staffUser = await db.collection('users').findOne(
        { $or: [{ username: activeUser }, { email: activeEmail }] },
        { projection: { balanceSC: 1, balanceGC: 1 } }
      );

      const staffId = staffUser?._id?.toString() || `${activeUser}_id`;
      invalidateAuthCache(staffId);
      const token = signToken({
        userId: staffId,
        username: activeUser,
        email: activeEmail,
        role: activeRole,
        balanceSC: staffUser?.balanceSC ?? 99999,
        balanceGC: staffUser?.balanceGC ?? 1000000,
        status: 'active',
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

      attachSessionCookie(response, token, true, req);
      return response;
    }

    const user = await findLoginUser(db, identifier);

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

    const deviceId = !isAdminPortal && !staff ? getDeviceIdFromRequest(req, rawDeviceId) : null;
    if (deviceId) {
      const boundUser = await findPlayerBoundToDevice(db.collection('users'), deviceId, user._id);
      if (boundUser) {
        return NextResponse.json(deviceBindingErrorPayload(boundUser), { status: 403 });
      }
      const bindFields = deviceBindingUpdateFields(deviceId);
      const uidForBind = user._id;
      after(async () => {
        try {
          await db.collection('users').updateOne(toIdQuery(uidForBind), {
            $set: bindFields,
            $addToSet: { boundDevices: deviceId },
          });
        } catch (err) {
          console.warn('Device bind after login:', err?.message || err);
        }
      });
    }

    const uid = user._id.toString();
    invalidateAuthCache(uid);
    const token = signToken({
      userId: uid,
      username: user.username,
      email: user.email,
      role: user.role || 'player',
      balanceSC: Number(user.balanceSC || 0),
      balanceGC: Number(user.balanceGC || 0),
      status: user.status || 'active',
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

    attachSessionCookie(response, token, isAdminPortal, req);

    if (deviceId) {
      response.cookies.set('v1_device_id', deviceId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 315360000,
      });
    }

    return response;
  } catch (err) {
    console.error('Login error:', err);
    const msg =
      err?.message?.includes('MongoDB') || err?.message?.includes('MONGODB')
        ? 'Cannot reach database. Admin: check MONGODB_URI in .env and restart PM2.'
        : 'Server error. Please try again.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
