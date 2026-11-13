import { mapAccountRequest } from '@/lib/mapAccountRequest';
import { buildStaffChatThreads } from '@/lib/chatThreads.server';
import { computeAdminStats, STAFF_LIST_LIMIT } from '@/lib/adminStats.server';
import { listStaffDeposits } from '@/lib/staffDeposits.server';

export const ADMIN_BOOTSTRAP_HEAVY_LIMIT = 120;
export const ADMIN_BOOTSTRAP_LITE_THREADS = 50;

/** Fast first paint: stats + settings + badges only. */
export async function buildAdminBootstrapLite(db) {
  const [stats, settings, methods, threads] = await Promise.all([
    computeAdminStats(db),
    db.collection('system_settings').findOne({ key: 'general' }),
    db.collection('payment_methods').find({}).sort({ name: 1 }).toArray(),
    buildStaffChatThreads(db, { limit: ADMIN_BOOTSTRAP_LITE_THREADS }),
  ]);

  return {
    success: true,
    lite: true,
    stats,
    settings: settings || null,
    methods,
    threads,
  };
}

/** Full desk queues — load when opening finance / overview or on manual refresh. */
export async function buildAdminBootstrapFull(db) {
  const limit = ADMIN_BOOTSTRAP_HEAVY_LIMIT;

  const [
    stats,
    deposits,
    redemptions,
    requests,
    settings,
    threads,
    methods,
  ] = await Promise.all([
    computeAdminStats(db),
    listStaffDeposits(db, { limit }),
    db
      .collection('redemptions')
      .find({}, { projection: { proofImage: 0, gameScreenshot: 0, qrCodeImage: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
    db
      .collection('accountRequests')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
    db.collection('system_settings').findOne({ key: 'general' }),
    buildStaffChatThreads(db, { limit: ADMIN_BOOTSTRAP_HEAVY_LIMIT }),
    db.collection('payment_methods').find({}).sort({ name: 1 }).toArray(),
  ]);

  const mappedRequests = requests.map((r) => mapAccountRequest(r));

  return {
    success: true,
    lite: false,
    stats,
    deposits,
    redemptions: redemptions.map((r) => ({
      ...r,
      _id: r._id?.toString?.() || r._id,
    })),
    requests: mappedRequests,
    accountRequests: mappedRequests,
    settings: settings || null,
    threads,
    methods,
  };
}

export { STAFF_LIST_LIMIT };
