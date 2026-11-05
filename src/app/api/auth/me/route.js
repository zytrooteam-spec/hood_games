import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
