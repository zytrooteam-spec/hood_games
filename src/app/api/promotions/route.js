import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';
import { cache } from '@/lib/cache';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(req.url);
    const isAdminQuery = searchParams.get('admin') === 'true';
    const cacheKey = `hood_promos_${isAdminQuery ? 'admin' : 'public'}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json({ success: true, promotions: cached });

    const db = await getDb();
    const filter = isAdminQuery ? {} : { active: { $ne: false } };
    const promotions = await db.collection('promotions').find(filter).sort({ priority: 1, createdAt: -1 }).toArray();
    const mapped = promotions.map((p) => ({ ...p, _id: p._id.toString() }));
    cache.set(cacheKey, mapped, 120);
    return NextResponse.json({ success: true, promotions: mapped });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    if (!session || !['admin', 'superadmin'].includes(String(session?.role || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    const body = await req.json();
    const { title, badge, description, matchPercent, category, active = true, priority = 10 } = body;
    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required.' }, { status: 400 });
    }
    const db = await getDb();
    const newPromo = {
      title: String(title).trim(),
      badge: String(badge || '').trim(),
      description: String(description).trim(),
      matchPercent: Number(matchPercent || 0),
      category: String(category || 'bonus').trim(),
      active: Boolean(active),
      priority: Number(priority || 10),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.username,
    };
    const result = await db.collection('promotions').insertOne(newPromo);
    cache.del('hood_promos_');
    return NextResponse.json({ success: true, promotion: { ...newPromo, _id: result.insertedId.toString() } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    if (!session || !['admin', 'superadmin'].includes(String(session.role || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Promotion id required' }, { status: 400 });
    const db = await getDb();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    await db.collection('promotions').updateOne(filter, { $set: { ...updates, updatedAt: new Date() } });
    cache.del('hood_promos_');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req);
    if (!session || !['admin', 'superadmin'].includes(String(session.role || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    const { id } = await req.json();
    const db = await getDb();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    await db.collection('promotions').deleteOne(filter);
    cache.del('hood_promos_');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
