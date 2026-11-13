import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { cache } from '@/lib/cache';
import {
  mapDepositRow,
  mapRedemptionRow,
  mapLedgerDoc,
  mapCashbackRow,
  mapSpinRow,
  mapTransferRow,
  rowMatchesQuery,
  sortRowsNewest,
  BONUS_LEDGER_TYPES,
} from '@/lib/adminLedger.server';

const SLIM_PROJECTION = {
  username: 1,
  userName: 1,
  amount: 1,
  method: 1,
  status: 1,
  senderTag: 1,
  payoutAddress: 1,
  cashtag: 1,
  transactionId: 1,
  createdAt: 1,
  claimedAt: 1,
  cashbackAmount: 1,
  percentage: 1,
  weekKey: 1,
  amountSC: 1,
  prizeSC: 1,
  prizeLabel: 1,
  label: 1,
  gameTitle: 1,
  type: 1,
  description: 1,
  referenceId: 1,
  notes: 1,
};

async function computeTotals(db) {
  const cacheKey = 'hood_admin_ledger_totals';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [depAgg, redAgg, bonusAgg] = await Promise.all([
    db
      .collection('deposits')
      .aggregate([
        { $match: { status: { $in: ['approved', 'APPROVED', 'completed'] } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
      ])
      .toArray(),
    db
      .collection('redemptions')
      .aggregate([
        { $match: { status: { $in: ['approved', 'APPROVED', 'paid', 'completed'] } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
      ])
      .toArray(),
    db
      .collection('ledger')
      .aggregate([
        {
          $match: {
            type: { $in: [...BONUS_LEDGER_TYPES] },
          },
        },
        { $group: { _id: null, total: { $sum: { $abs: { $toDouble: '$amount' } } } } },
      ])
      .toArray(),
  ]);

  const totals = {
    deposits: Number(depAgg[0]?.total || 0),
    redemptions: Number(redAgg[0]?.total || 0),
    bonuses: Number(bonusAgg[0]?.total || 0),
  };
  cache.set(cacheKey, totals, 90);
  return totals;
}

async function fetchTypeRows(db, type, cap) {
  if (type === 'deposit') {
    const rows = await db
      .collection('deposits')
      .find({})
      .project(SLIM_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(cap)
      .toArray();
    return rows.map(mapDepositRow);
  }
  if (type === 'redemption') {
    const rows = await db
      .collection('redemptions')
      .find({})
      .project(SLIM_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(cap)
      .toArray();
    return rows.map(mapRedemptionRow);
  }
  if (type === 'cashback') {
    const rows = await db
      .collection('cashback_claims')
      .find({})
      .project(SLIM_PROJECTION)
      .sort({ claimedAt: -1 })
      .limit(cap)
      .toArray();
    return rows.map(mapCashbackRow);
  }
  if (type === 'free_spin') {
    const rows = await db
      .collection('daily_spins')
      .find({})
      .project(SLIM_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(cap)
      .toArray();
    return rows.map(mapSpinRow);
  }
  if (type === 'game_load') {
    const rows = await db
      .collection('coin_transfers')
      .find({})
      .project(SLIM_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(cap)
      .toArray();
    return rows.map(mapTransferRow);
  }
  return [];
}

async function fetchAllRows(db, cap) {
  const per = Math.max(12, Math.ceil(cap / 4));
  const [deposits, redemptions, ledgerDocs, extras] = await Promise.all([
    db.collection('deposits').find({}).project(SLIM_PROJECTION).sort({ createdAt: -1 }).limit(per).toArray(),
    db.collection('redemptions').find({}).project(SLIM_PROJECTION).sort({ createdAt: -1 }).limit(per).toArray(),
    db.collection('ledger').find({}).project(SLIM_PROJECTION).sort({ createdAt: -1 }).limit(per).toArray(),
    Promise.all([
      db.collection('cashback_claims').find({}).project(SLIM_PROJECTION).sort({ claimedAt: -1 }).limit(8).toArray(),
      db.collection('daily_spins').find({}).project(SLIM_PROJECTION).sort({ createdAt: -1 }).limit(8).toArray(),
      db.collection('coin_transfers').find({}).project(SLIM_PROJECTION).sort({ createdAt: -1 }).limit(8).toArray(),
    ]),
  ]);
  const [cashbacks, spins, transfers] = extras;
  const merged = [
    ...deposits.map(mapDepositRow),
    ...redemptions.map(mapRedemptionRow),
    ...ledgerDocs.map(mapLedgerDoc),
    ...cashbacks.map(mapCashbackRow),
    ...spins.map(mapSpinRow),
    ...transfers.map(mapTransferRow),
  ];
  const byKey = new Map();
  merged.forEach((r) => {
    const key = `${r.type}-${r.id}`;
    if (!byKey.has(key)) byKey.set(key, r);
  });
  return sortRowsNewest([...byKey.values()]).slice(0, cap);
}

// GET /api/admin/ledger?q=&type=&page=&limit=
export async function GET(req) {
  try {
    await ensureDbReady();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const type = searchParams.get('type') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(120, Math.max(10, parseInt(searchParams.get('limit') || '40', 10) || 40));
    const totalsOnly = searchParams.get('totalsOnly') === '1';

    const db = await getDb();
    const totals = await computeTotals(db);

    if (totalsOnly) {
      return NextResponse.json({ success: true, totals });
    }

    const fetchCap = q ? Math.min(200, limit * 3) : limit * page;
    const listCacheKey = `hood_ledger_${type}_${page}_${limit}_${q.slice(0, 32)}`;
    const cachedList = !q ? cache.get(listCacheKey) : null;

    let rows;
    if (cachedList) {
      rows = cachedList;
    } else if (type === 'all') {
      rows = await fetchAllRows(db, fetchCap);
    } else {
      rows = await fetchTypeRows(db, type, fetchCap);
    }

    if (q) rows = rows.filter((r) => rowMatchesQuery(r, q));
    rows = sortRowsNewest(rows);

    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);
    const hasMore = rows.length > start + limit;

    if (!q) cache.set(listCacheKey, rows, 45);

    return NextResponse.json({
      success: true,
      rows: pageRows,
      totals,
      page,
      limit,
      hasMore,
      totalFetched: rows.length,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
