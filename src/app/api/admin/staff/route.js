import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

const STAFF_ROLES = ['admin', 'staff'];

async function requireAdmin(req) {
  const user = await getSessionUser(req, 'admin');
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return null;
  return user;
}

// GET: list all staff/admin accounts
export async function GET(req) {
  try {
    await ensureDbInitialized();
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    const db = await getDb();
    const rawStaff = await db
      .collection('users')
      .find({ role: { $in: [...STAFF_ROLES, 'superadmin'] } })
      .sort({ createdAt: -1 })
      .toArray();
    const staff = rawStaff.map(({ password, ...rest }) => rest);
    return NextResponse.json({ success: true, staff });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: create a new staff account (admin panel only, no public signup)
export async function POST(req) {
  try {
    await ensureDbInitialized();
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    const { username, email, password, role } = await req.json();
    const cleanUser = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanUser || !cleanEmail || !password || String(password).length < 6) {
      return NextResponse.json({ success: false, error: 'Username, email and a 6+ char password are required' }, { status: 400 });
    }
    const finalRole = STAFF_ROLES.includes(role) ? role : 'staff';

    const db = await getDb();
    const exists = await db.collection('users').findOne({
      $or: [{ email: cleanEmail }, { username: new RegExp(`^${cleanUser}$`, 'i') }],
    });
    if (exists) {
      return NextResponse.json({ success: false, error: 'Username or email already exists' }, { status: 409 });
    }

    await db.collection('users').insertOne({
      username: cleanUser,
      email: cleanEmail,
      password: await hashPassword(String(password)),
      role: finalRole,
      status: 'active',
      balanceSC: 0,
      balanceGC: 0,
      isVerified: true,
      createdBy: admin.username,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: `${finalRole} account "${cleanUser}" created` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: revoke a staff account (demotes to suspended player-less record)
export async function DELETE(req) {
  try {
    await ensureDbInitialized();
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    if (String(admin.id || admin._id) === id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
    }
    const db = await getDb();
    await db.collection('users').deleteOne({ ...toIdQuery(id), role: { $in: STAFF_ROLES } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
