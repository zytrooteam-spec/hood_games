import { NextResponse } from 'next/server';
import { pingMongo } from '@/lib/db';

export async function GET() {
  try {
    const result = await pingMongo();
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          mode: result.mode,
          error: 'Using JSON fallback — set MONGODB_URI in production.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: true, mode: result.mode });
  } catch (err) {
    const msg = err?.message || 'Database unreachable';
    const hint = /bad auth/i.test(msg)
      ? 'MongoDB rejected username/password. Atlas → Database Access: reset password, copy connection string into server .env.local (one line), pm2 restart.'
      : /whitelist|IP address/i.test(msg)
        ? 'MongoDB Atlas blocked this server IP. Atlas → Network Access → add VPS public IP.'
        : undefined;
    return NextResponse.json(
      { success: false, error: msg, hint, nodeEnv: process.env.NODE_ENV },
      { status: 503 }
    );
  }
}
