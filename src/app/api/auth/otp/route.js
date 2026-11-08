import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendEmail, getOtpEmailTemplate } from '@/lib/email';
import { ensureDbInitialized } from '@/lib/initDb';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const body = await req.json();
    const { action = 'send', email, username, code, purpose = 'Registration' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const db = await getDb();
    const otpsCol = db.collection('otps');
    const usersCol = db.collection('users');

    // 1. Action: SEND OTP
    if (action === 'send') {
      // Check if email or username is already taken when registering
      if (purpose === 'Registration' || purpose === 'Account Verification') {
        const safeEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingEmail = await usersCol.findOne({
          $or: [
            { email: cleanEmail },
            { email: { $regex: new RegExp(`^${safeEmail}$`, 'i') } },
          ],
        });
        if (existingEmail) {
          return NextResponse.json(
            { success: false, error: 'This email is already registered. Please log in instead.' },
            { status: 409 }
          );
        }

        if (username && typeof username === 'string') {
          const cleanUsername = username.trim().toLowerCase();
          if (cleanUsername.length < 3) {
            return NextResponse.json(
              { success: false, error: 'Username must be at least 3 characters.' },
              { status: 400 }
            );
          }
          const safeUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existingUser = await usersCol.findOne({
            $or: [
              { username: cleanUsername },
              { username: { $regex: new RegExp(`^${safeUsername}$`, 'i') } },
            ],
          });
          if (existingUser) {
            return NextResponse.json(
              { success: false, error: 'Username is already taken. Please choose another username.' },
              { status: 409 }
            );
          }
        }
      }

      // Check if user exists when requesting Password Reset
      if (purpose === 'Password Reset' || purpose === 'Forgot Password') {
        const safeEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingUser = await usersCol.findOne({
          $or: [
            { email: cleanEmail },
            { email: { $regex: new RegExp(`^${safeEmail}$`, 'i') } },
          ],
        });
        if (!existingUser) {
          return NextResponse.json(
            { success: false, error: 'No account registered with this email address. Please verify your email or sign up.' },
            { status: 404 }
          );
        }
      }

      // Check anti-spam cooldown: 40 seconds
      const existingOtp = await otpsCol.findOne({ email: cleanEmail });
      if (existingOtp && existingOtp.createdAt) {
        const elapsedSec = (Date.now() - new Date(existingOtp.createdAt).getTime()) / 1000;
        if (elapsedSec < 40) {
          const remaining = Math.ceil(40 - elapsedSec);
          return NextResponse.json(
            { success: false, error: `Please wait ${remaining} seconds before requesting a new code.`, cooldown: remaining },
            { status: 429 }
          );
        }
      }

      // Generate 6-digit numeric OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store in DB (upsert for this email)
      await otpsCol.updateOne(
        { email: cleanEmail },
        {
          $set: {
            email: cleanEmail,
            code: otpCode,
            purpose,
            expiresAt,
            attempts: 0,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Send email via Hostinger SMTP
      const isReset = purpose === 'Password Reset' || purpose === 'Forgot Password';
      const emailSubject = isReset
        ? `Your Hood Gaming Password Reset Code: ${otpCode}`
        : `Your Hood Gaming Security Code: ${otpCode}`;

      const sendResult = await sendEmail({
        to: cleanEmail,
        subject: emailSubject,
        html: getOtpEmailTemplate(otpCode, isReset ? 'Password Reset' : 'Registration Security'),
      });

      console.log(`[OTP GENERATED] To: ${cleanEmail} | Code: ${otpCode} | Sent: ${sendResult.success}`);

      if (!sendResult.success) {
        const raw = sendResult.error || '';
        const smtpAuthFailed = /535|authentication failed|invalid login/i.test(raw);
        console.error('[OTP SMTP]', raw);
        return NextResponse.json(
          {
            success: false,
            error: smtpAuthFailed
              ? 'Email service is temporarily unavailable. Our team is fixing mail settings — try again in a few minutes or contact live chat.'
              : 'Could not send your verification code. Check the email address and try again.',
            smtpMisconfigured: smtpAuthFailed,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit security code has been sent to ${cleanEmail}. Please check your inbox.`,
      });
    }

    // 2. Action: VERIFY OTP
    if (action === 'verify') {
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ success: false, error: 'Security code is required.' }, { status: 400 });
      }

      const cleanCode = code.trim();
      const record = await otpsCol.findOne({ email: cleanEmail });

      if (!record) {
        return NextResponse.json({ success: false, error: 'No verification code found. Please request a code first.' }, { status: 404 });
      }

      if (new Date() > new Date(record.expiresAt)) {
        await otpsCol.deleteOne({ _id: record._id });
        return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
      }

      if (record.code !== cleanCode) {
        await otpsCol.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
        return NextResponse.json({ success: false, error: 'Invalid verification code. Please check your email and try again.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Security code verified successfully.',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('OTP handler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
