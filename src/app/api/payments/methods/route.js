import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { cache } from '@/lib/cache';
import { invalidatePaymentMethodsCache } from '@/lib/authCache';

const CACHE_KEY = 'hood_payment_methods';
const CACHE_TTL = 60;

export async function GET(req) {
  try {
    await ensureDbReady();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const cacheKey = all ? `${CACHE_KEY}_all` : CACHE_KEY;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, methods: cached });
    }

    const db = await getDb();
    const query = all ? {} : { active: { $ne: false } };
    const methods = await db.collection('payment_methods').find(query).sort({ name: 1 }).toArray();
    cache.set(cacheKey, methods, CACHE_TTL);

    return NextResponse.json(
      { success: true, methods },
      { headers: { 'Cache-Control': all ? 'private, no-store' : 'private, max-age=30' } }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();
    const {
      _id,
      methodId,
      name,
      tag,
      instructions,
      minDeposit,
      maxDeposit,
      minWithdrawal,
      maxWithdrawal,
      active,
      badge,
      depositEnabled,
      redeemEnabled,
    } = body;

    const methodFields = {
      methodId,
      name,
      tag,
      instructions,
      minDeposit: Number(minDeposit || 10),
      maxDeposit: Number(maxDeposit || 5000),
      minWithdrawal: Number(minWithdrawal || 25),
      maxWithdrawal: Number(maxWithdrawal || 5000),
      active: Boolean(active),
      badge,
      depositEnabled: depositEnabled !== false,
      redeemEnabled: redeemEnabled !== false,
      updatedAt: new Date(),
    };

    if (_id) {
      await db.collection('payment_methods').updateOne(toIdQuery(_id), { $set: methodFields });
    } else {
      await db.collection('payment_methods').insertOne({
        ...methodFields,
        methodId: methodId || name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date(),
      });
    }

    invalidatePaymentMethodsCache();
    const methods = await db.collection('payment_methods').find({}).toArray();
    return NextResponse.json({ success: true, methods });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const db = await getDb();
    await db.collection('payment_methods').deleteOne(toIdQuery(id));
    invalidatePaymentMethodsCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
