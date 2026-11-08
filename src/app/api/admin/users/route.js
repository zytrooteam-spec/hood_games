import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const db = await getDb();
    const rawUsers = await db
      .collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const users = rawUsers.map(({ password, ...rest }) => rest);
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { userId, balanceSC, balanceGC, role, status, unbindDevice } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const db = await getDb();
    const update = {};
    if (balanceSC !== undefined) update.balanceSC = Number(balanceSC);
    if (balanceGC !== undefined) update.balanceGC = Number(balanceGC);
    if (role) update.role = role;
    if (status) update.status = status;
    if (unbindDevice === true) {
      update.deviceId = '';
      update.lastLoginDevice = '';
      update.boundDevices = [];
    }
    update.updatedAt = new Date();

    await db.collection('users').updateOne(toIdQuery(userId), { $set: update });

    const updatedUserRaw = await db.collection('users').findOne(toIdQuery(userId));
    let updatedUser = null;
    if (updatedUserRaw) {
      const { password, ...rest } = updatedUserRaw;
      updatedUser = rest;
    }
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
