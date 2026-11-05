import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';

export async function GET() {
  try {
    await ensureDbInitialized();
    const db = await getDb();
    let activity = await db.collection('activity').find({}).sort({ createdAt: -1 }).limit(25).toArray();

    if (!activity || activity.length === 0) {
      // Dynamic fallback: generate recent activity strictly from active games in the database
      const activeGames = await db.collection('games').find({ active: { $ne: false } }).toArray();
      const demoUsers = ['HoodAce77', 'LuckyTrap99', 'KingVibe', 'DiamondBoss', 'ShadowSpin', 'MetroGamer', 'VegasRoller'];
      const demoAmounts = [485.5, 1350.0, 820.0, 560.75, 920.0, 375.0, 640.0];

      activity = activeGames.map((game, i) => ({
        username: demoUsers[i % demoUsers.length],
        gameTitle: sanitizeGameTitle(game.title),
        amount: demoAmounts[i % demoAmounts.length],
        currency: 'SC',
        createdAt: new Date(),
      }));
    } else {
      activity = activity.map((item) => ({
        ...item,
        gameTitle: sanitizeGameTitle(item.gameTitle),
      }));
    }

    return NextResponse.json({ success: true, activity });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
