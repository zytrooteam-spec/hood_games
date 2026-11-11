import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';
import { resolvePlayerDbUser } from '@/lib/resolvePlayerDbUser';
import { cache } from '@/lib/cache';
import { invalidateGameAccountsCache } from '@/lib/authCache';

export async function GET(req) {
  try {
    await ensureDbReady();
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

    const userEmail = (dbUser.email || '').toLowerCase().trim();
    const cacheKey = `game_accounts_${userEmail}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, ...cached });
    }

    const userId = dbUser._id.toString();
    const ownerFilter = userEmail
      ? { $or: [{ userId }, { userEmail }] }
      : { userId };

    const [rawGameAccounts, rawPendingRequests] = await Promise.all([
      db.collection('game_accounts').find(ownerFilter).sort({ updatedAt: -1 }).toArray(),
      db
        .collection('accountRequests')
        .find({
          ...ownerFilter,
          status: { $in: ['pending', 'PENDING', 'Pending'] },
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    const payload = {
      gameAccounts: rawGameAccounts.map((a) => ({
        ...a,
        gameTitle: sanitizeGameTitle(a.gameTitle),
      })),
      pendingRequests: rawPendingRequests.map((r) => ({
        ...r,
        gameTitle: sanitizeGameTitle(r.gameTitle),
      })),
    };

    cache.set(cacheKey, payload, 5);

    return NextResponse.json({ success: true, ...payload });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
