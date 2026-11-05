import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const db = await getDb();
    const games = await db.collection('games').find({}).sort({ priority: 1, title: 1 }).toArray();
    const sanitized = games.map((g) => ({
      ...g,
      title: sanitizeGameTitle(g.title),
    }));
    return NextResponse.json({ success: true, games: sanitized });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();

    if (body.title) {
      body.title = sanitizeGameTitle(body.title);
    }

    if (body._id) {
      const { _id, ...updateFields } = body;
      await db.collection('games').updateOne(
        toIdQuery(_id),
        { $set: { ...updateFields, updatedAt: new Date() } }
      );
    } else {
      await db.collection('games').insertOne({
        ...body,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date(),
      });
    }

    const updated = await db.collection('games').find({}).sort({ priority: 1 }).toArray();
    const sanitizedUpdated = updated.map((g) => ({
      ...g,
      title: sanitizeGameTitle(g.title),
    }));
    return NextResponse.json({ success: true, games: sanitizedUpdated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/games?id=  (admin only)
export async function DELETE(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const db = await getDb();
    await db.collection('games').deleteOne(toIdQuery(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
