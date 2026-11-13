import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ensureDbReady } from '@/lib/initDb';

export const ONLINE_CAP = 1500;
const ONLINE_FLOOR = 280;

/** Live-feel online count (never above ONLINE_CAP). */
export async function GET() {
  try {
    await ensureDbReady();
    const db = await getDb();
    const settings = (await db.collection('system_settings').findOne({ key: 'general' })) || {};
    const base = Math.min(Number(settings.onlineDisplayBase ?? 1040), 1320);
    const perPlayer = Math.min(Number(settings.onlineDisplayPerReg ?? 3), 6);
    const registered = await db.collection('users').countDocuments({
      $or: [{ role: 'player' }, { role: 'Player' }, { role: { $exists: false } }],
    });
    const regBoost = Math.min(registered * perPlayer, 140);

    const t = Date.now();
    const slowWave = Math.sin(t / 165000) * 75;
    const fastWave = Math.sin(t / 19000) * 28;
    const sec = Math.floor(t / 1000);
    const tickJitter = ((sec * 17 + (sec % 7) * 13) % 31) - 15;

    let online = Math.round(base + regBoost + slowWave + fastWave + tickJitter);
    online = Math.min(ONLINE_CAP, Math.max(ONLINE_FLOOR, online));

    return NextResponse.json(
      { success: true, online, cap: ONLINE_CAP, registered },
      { headers: { 'Cache-Control': 'private, max-age=5' } }
    );
  } catch (err) {
    return NextResponse.json({
      success: false,
      online: 1185,
      cap: ONLINE_CAP,
      error: err.message,
    });
  }
}
