import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET() {
  try {
    await ensureDbInitialized();
    const db = await getDb();
    const methods = await db.collection('payment_methods').find({}).toArray();
    return NextResponse.json({ success: true, methods });
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
    const { _id, methodId, name, tag, instructions, minDeposit, maxDeposit, minWithdrawal, maxWithdrawal, active, badge } = body;

    if (_id) {
      await db.collection('payment_methods').updateOne(
        toIdQuery(_id),
        {
          $set: {
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
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await db.collection('payment_methods').insertOne({
        methodId: methodId || name.toLowerCase().replace(/\s+/g, '-'),
        name,
        tag,
        instructions: instructions || 'Send payment with your player username in the memo.',
        minDeposit: Number(minDeposit || 10),
        maxDeposit: Number(maxDeposit || 5000),
        minWithdrawal: Number(minWithdrawal || 25),
        maxWithdrawal: Number(maxWithdrawal || 5000),
        active: active !== undefined ? Boolean(active) : true,
        badge: badge || 'INSTANT',
        createdAt: new Date(),
      });
    }

    const updated = await db.collection('payment_methods').find({}).toArray();
    return NextResponse.json({ success: true, methods: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/payments/methods?id=  (admin only)
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
    await db.collection('payment_methods').deleteOne(toIdQuery(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
