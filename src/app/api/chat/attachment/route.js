import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbReady();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Message id required' }, { status: 400 });
    }

    const staff = await getSessionUser(req, 'admin');
    const player = await getSessionUser(req, 'player');
    const isStaff = Boolean(staff && isStaffRole(staff.role));

    const db = await getDb();
    const msg = await db.collection('chat_messages').findOne(toIdQuery(id), {
      projection: { imageUrl: 1, userId: 1 },
    });
    if (!msg?.imageUrl) {
      return new NextResponse('Attachment not found', { status: 404 });
    }

    const ownerId = String(msg.userId || '');
    const playerId = player?.userId || player?.id || player?._id?.toString?.() || '';
    if (!isStaff && String(playerId) !== ownerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const imageUrl = String(msg.imageUrl);
    if (imageUrl.startsWith('data:')) {
      const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return new NextResponse('Invalid image', { status: 400 });
      const buf = Buffer.from(m[2], 'base64');
      return new NextResponse(buf, {
        headers: {
          'Content-Type': m[1],
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    return NextResponse.redirect(imageUrl);
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
