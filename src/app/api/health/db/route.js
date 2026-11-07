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
    return NextResponse.json(
      { success: false, error: err?.message || 'Database unreachable' },
      { status: 503 }
    );
  }
}
