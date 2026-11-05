import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });

    return NextResponse.json({
      success: true,
      settings: settings || {
        siteName: 'Hood Games',
        logoUrl: '/logo.png',
        heroBackgroundUrl: '/images/casino-hero-bg.jpg',
        jackpotBannerUrl: '/images/jackpot-banner.jpg',
        cashbackPercent: 10,
        welcomeBonusPercent: 300,
        regularBonusPercent: 50,
        quickActionCards: [],
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !['admin', 'superadmin', 'staff'].includes(String(user.role || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();

    // Clean and validate cashback percent if provided
    let updateFields = { ...body, updatedAt: new Date() };
    delete updateFields._id;
    delete updateFields.key;

    if (updateFields.cashbackPercent !== undefined) {
      updateFields.cashbackPercent = Math.min(20, Math.max(5, Number(updateFields.cashbackPercent)));
    }

    await db.collection('system_settings').updateOne(
      { key: 'general' },
      { $set: updateFields },
      { upsert: true }
    );

    const updated = await db.collection('system_settings').findOne({ key: 'general' });
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
