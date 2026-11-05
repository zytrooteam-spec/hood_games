import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const queryEmail = searchParams.get('email');

    const db = await getDb();
    let userId = user ? (user.id || user._id.toString()) : null;

    if (!userId && queryEmail) {
      const u = await db.collection('users').findOne({ email: queryEmail.toLowerCase() });
      if (u) userId = u._id.toString();
    }

    if (!userId) {
      return NextResponse.json({ success: true, gameAccounts: [], pendingRequests: [] });
    }

    const rawGameAccounts = await db
      .collection('game_accounts')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    const rawPendingRequests = await db
      .collection('accountRequests')
      .find({ userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .toArray();

    const gameAccounts = rawGameAccounts.map((a) => ({
      ...a,
      gameTitle: sanitizeGameTitle(a.gameTitle),
    }));

    const pendingRequests = rawPendingRequests.map((r) => ({
      ...r,
      gameTitle: sanitizeGameTitle(r.gameTitle),
    }));

    return NextResponse.json({ success: true, gameAccounts, pendingRequests });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
