import { NextResponse } from 'next/server';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';
import { sendPushNotification } from '@/lib/fcm';
import { memoryCache } from '@/lib/cache';

export const runtime = 'nodejs';

/** One-click push test: staff session, or x-push-test-key matching PUSH_TEST_SECRET (dev). */
export async function POST(req) {
  try {
    await ensureDbInitialized();
    const testKey = req.headers.get('x-push-test-key') || '';
    const secret = process.env.PUSH_TEST_SECRET || 'hood-push-test-local';
    const keyOk = testKey && testKey === secret;
    const session = await getSessionUser(req);
    const staffOk = session && isStaffRole(session.role);

    if (!keyOk && !staffOk) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || '🔔 Hood Games — Test Push').trim();
    const message = String(
      body.message || 'Chrome system notification + in-app banner test. Tap Allow if prompted.'
    ).trim();

    const db = await getDb();
    const res = await db.collection('notifications').insertOne({
      title,
      message,
      target: 'all',
      channel: 'push',
      type: 'broadcast',
      url: '/',
      sentBy: session?.username || 'test-endpoint',
      createdAt: new Date(),
    });

    memoryCache.invalidatePrefix('notifs:');

    const fcm = await sendPushNotification({
      broadcast: true,
      topic: 'hood_all_players',
      title,
      body: message,
      data: { url: '/' },
    });

    return NextResponse.json({
      success: true,
      id: res.insertedId.toString(),
      message: 'Test broadcast saved. Players see in-app + Chrome within ~6s if tab open and notifications allowed.',
      fcm,
      chromeTip:
        'On site console run: window.triggerTestPush("Test", "Chrome popup now") after allowing notifications.',
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
