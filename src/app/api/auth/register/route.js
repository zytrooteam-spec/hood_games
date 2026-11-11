import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signToken, ROLES } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { ensureDbReady } from '@/lib/initDb';
import { getSessionCookieOptions } from '@/lib/sessionCookies.server';
import { getDeviceIdFromRequest } from '@/lib/deviceServer';
import { findPlayerBoundToDevice, deviceBindingErrorPayload } from '@/lib/deviceBinding';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const dbReady = await ensureDbReady();
    if (!dbReady) {
      return NextResponse.json(
        { success: false, error: 'Database not ready. Verify MONGODB_URI on the server.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      username,
      email,
      password,
      phone,
      otp,
      referralCode: inputRef,
      state = 'US',
      ageVerified = true,
      deviceId: rawDeviceId,
    } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Email verification code (OTP) is required.' },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const cleanOtp = String(otp).trim();

    if (cleanUser.length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!ageVerified) {
      return NextResponse.json(
        { success: false, error: 'You must certify that you are 18+ and a US resident.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const otpsCol = db.collection('otps');
    const usersCol = db.collection('users');

    const otpRecord = await otpsCol.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'No verification code found for this email. Please request a new code.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await otpsCol.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (otpRecord.code !== cleanOtp) {
      await otpsCol.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. Please check your email and try again.' },
        { status: 400 }
      );
    }

    await otpsCol.deleteOne({ _id: otpRecord._id });

    const existing = await usersCol.findOne({
      $or: [{ email: cleanEmail }, { username: new RegExp(`^${cleanUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username or email is already registered. Please log in instead.' },
        { status: 409 }
      );
    }

    let referrer = null;
    if (inputRef && typeof inputRef === 'string' && inputRef.trim()) {
      const cleanRef = inputRef.trim();
      referrer = await usersCol.findOne({
        $or: [
          { referralCode: cleanRef.toUpperCase() },
          { username: cleanRef.toLowerCase() },
        ],
      });
    }

    const deviceId = getDeviceIdFromRequest(req, rawDeviceId);
    if (deviceId) {
      const boundUser = await findPlayerBoundToDevice(usersCol, deviceId);
      if (boundUser) {
        return NextResponse.json(deviceBindingErrorPayload(boundUser), { status: 403 });
      }
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const myReferralCode = `HG-${randomSuffix}`;
    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const sessionVersion = Date.now().toString();

    const newUser = {
      username: cleanUser,
      email: cleanEmail,
      phone: phone || '',
      password: passwordHash,
      passwordHash,
      role: ROLES.PLAYER,
      balanceSC: 0,
      balanceGC: 10000,
      availableSpins: 0,
      emailVerified: true,
      isVerified: true,
      referralCode: myReferralCode,
      referredBy: referrer ? referrer.username : null,
      referrerId: referrer?._id ? referrer._id.toString() : null,
      state: String(state || 'CA').toUpperCase(),
      deviceId: deviceId || '',
      boundDevices: deviceId ? [deviceId] : [],
      sessionVersion,
      freeplayClaimed: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId.toString();

    sendEmail({
      to: cleanEmail,
      subject: 'Welcome to Hood Gaming',
      html: getWelcomeEmailTemplate(cleanUser),
    }).catch(() => {});

    const token = signToken({
      userId,
      username: cleanUser,
      email: cleanEmail,
      role: ROLES.PLAYER,
      sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account verified! Complete Freeplay in the lobby to claim SC.',
      user: {
        id: userId,
        username: cleanUser,
        email: cleanEmail,
        role: ROLES.PLAYER,
        balanceSC: 0,
        balanceGC: 10000,
        referralCode: myReferralCode,
      },
    });

    response.cookies.set('players_session', token, getSessionCookieOptions(req));

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
    console.error('Registration error:', err);
    const msg =
      err?.message?.includes('MongoDB') || err?.message?.includes('MONGODB')
        ? 'Cannot reach database. Admin: check MONGODB_URI in .env and restart PM2.'
        : 'Registration failed. Please try again.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
