import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import {
  buildPlayer360,
  listPlayerDirectory,
  applyStaffPlayerAction,
} from '@/lib/player360.server';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const search = (searchParams.get('search') || '').trim();
    const db = await getDb();

    if (userId) {
      const payload = await buildPlayer360(db, userId);
      if (!payload) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, ...payload });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const directory = await listPlayerDirectory(db, { search, limit, page });
    return NextResponse.json({
      success: true,
      users: directory.users,
      total: directory.total,
      page: directory.page,
      limit: directory.limit,
    });
  } catch (err) {
    console.error('Users GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();
    const result = await applyStaffPlayerAction(db, user, body);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
