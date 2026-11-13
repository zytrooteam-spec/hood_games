import { getDb } from '@/lib/mongodb';
import { computeAdminStats } from '@/lib/adminStats.server';
import { publishAdminStatsSnapshot, publishStaffDeskPulse } from '@/lib/realtimePublish';

/** Fire-and-forget: push fresh badge counts to all staff SSE clients. */
export function pulseStaffStatsAsync() {
  void (async () => {
    try {
      const db = await getDb();
      const stats = await computeAdminStats(db);
      publishAdminStatsSnapshot(stats);
    } catch {
      /* ignore */
    }
  })();
}

export function pulseStaffScope(scope = 'all') {
  publishStaffDeskPulse(scope);
}
