import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

const STAFF_ROLES = ['admin', 'superadmin', 'staff'];

// GET /api/admin/ledger?q=&type=&limit=
// Unified transaction ledger (Player Paradise "Ledger" + "TX Search" equivalent)
export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(500, Number(searchParams.get('limit') || 200));

    const db = await getDb();
    const [deposits, redemptions, cashbacks, spins, transfers] = await Promise.all([
      db.collection('deposits').find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      db.collection('redemptions').find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      db.collection('cashback_claims').find({}).sort({ claimedAt: -1 }).limit(limit).toArray(),
      db.collection('daily_spins').find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      db.collection('coin_transfers').find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    const rows = [
      ...deposits.map((d) => ({
        id: String(d._id), type: 'deposit', username: d.username, amount: Number(d.amount || 0),
        direction: 'in', method: d.method, status: d.status, reference: d.senderTag || '', createdAt: d.createdAt,
      })),
      ...redemptions.map((r) => ({
        id: String(r._id), type: 'redemption', username: r.username, amount: Number(r.amount || 0),
        direction: 'out', method: r.method, status: r.status, reference: r.payoutAddress || '', createdAt: r.createdAt,
      })),
      ...cashbacks.map((c) => ({
        id: String(c._id), type: 'cashback', username: c.username, amount: Number(c.cashbackAmount || 0),
        direction: 'bonus', method: `${c.percentage}% Sunday`, status: 'credited', reference: c.weekKey, createdAt: c.claimedAt,
      })),
      ...spins.map((s) => ({
        id: String(s._id), type: 'free_spin', username: s.username, amount: Number(s.amountSC ?? s.prizeSC ?? s.amount ?? 0),
        direction: 'bonus', method: 'Daily Wheel', status: 'credited', reference: s.prizeLabel || s.label || '', createdAt: s.createdAt,
      })),
      ...transfers.map((t) => ({
        id: String(t._id), type: 'game_load', username: t.username, amount: Number(t.amount || 0),
        direction: 'out', method: t.gameTitle, status: t.status, reference: t.gameTitle || '', createdAt: t.createdAt,
      })),
    ];

    let filtered = type === 'all' ? rows : rows.filter((r) => r.type === type);
    if (q) {
      filtered = filtered.filter((r) =>
        [r.id, r.username, r.method, r.reference, r.status].some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const totals = filtered.reduce(
      (acc, r) => {
        if (r.type === 'deposit' && r.status === 'approved') acc.deposits += r.amount;
        if (r.type === 'redemption' && r.status === 'approved') acc.redemptions += r.amount;
        if (r.direction === 'bonus') acc.bonuses += r.amount;
        return acc;
      },
      { deposits: 0, redemptions: 0, bonuses: 0 }
    );

    return NextResponse.json({ success: true, rows: filtered.slice(0, limit), totals });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
