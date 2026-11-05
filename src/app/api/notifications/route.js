import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const db = await getDb();
    const userId = user.id || user._id.toString();
    const notifications = await db
      .collection('notifications')
      .find({
        $or: [
          { userId },
          { userEmail: user.email },
          { target: 'all' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { id } = await req.json();
    const db = await getDb();
    if (id) {
      await db.collection('notifications').updateOne(toIdQuery(id), { $set: { read: true } });
    } else {
      const userId = user.id || user._id.toString();
      await db.collection('notifications').updateMany(
        { $or: [{ userId }, { userEmail: user.email }] },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
