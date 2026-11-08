import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';
import { resolvePlayerDbUser } from '@/lib/resolvePlayerDbUser';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    const { searchParams } = new URL(req.url);
    const queryEmail = searchParams.get('email');

    const db = await getDb();
  const usersCol = db.collection('users');
    let dbUser = user ? await resolvePlayerDbUser(user, usersCol) : null;

    if (!dbUser && queryEmail) {
      dbUser = await usersCol.findOne({ email: queryEmail.toLowerCase().trim() });
    }

    if (!dbUser) {
      return NextResponse.json({ success: true, gameAccounts: [], pendingRequests: [] });
    }

    const userId = dbUser._id.toString();
    const userEmail = (dbUser.email || '').toLowerCase().trim();
    const ownerFilter = userEmail
      ? { $or: [{ userId }, { userEmail }] }
      : { userId };

    const rawGameAccounts = await db
      .collection('game_accounts')
      .find(ownerFilter)
      .sort({ updatedAt: -1 })
      .toArray();

    const rawPendingRequests = await db
      .collection('accountRequests')
      .find({
        ...ownerFilter,
        status: { $in: ['pending', 'PENDING', 'Pending'] },
      })
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
