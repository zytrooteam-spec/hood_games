'use client';

import { lazyWithRetry } from '@/lib/lazyWithRetry';

export const GamesLibraryTab = lazyWithRetry(() =>
  import('./AdminExtraTabs').then((m) => ({ default: m.GamesLibraryTab }))
);
export const GatewaysTab = lazyWithRetry(() =>
  import('./AdminExtraTabs').then((m) => ({ default: m.GatewaysTab }))
);
export const LedgerTab = lazyWithRetry(() =>
  import('./AdminExtraTabs').then((m) => ({ default: m.LedgerTab }))
);
export const StaffTab = lazyWithRetry(() =>
  import('./AdminExtraTabs').then((m) => ({ default: m.StaffTab }))
);
export const PromosTab = lazyWithRetry(() =>
  import('./AdminExtraTabs').then((m) => ({ default: m.PromosTab }))
);
export const AccountRequestsDesk = lazyWithRetry(() =>
  import('./HoodAdminDesks').then((m) => ({ default: m.AccountRequestsDesk }))
);
export const CoinAllotmentDesk = lazyWithRetry(() =>
  import('./HoodAdminDesks').then((m) => ({ default: m.CoinAllotmentDesk }))
);
export const AffiliatesDesk = lazyWithRetry(() =>
  import('./HoodAdminDesks').then((m) => ({ default: m.AffiliatesDesk }))
);
export const AdminDailySpinTab = lazyWithRetry(() => import('./AdminDailySpinTab'));
export const AdminVipTab = lazyWithRetry(() => import('./AdminVipTab'));
export const Player360ProfileModal = lazyWithRetry(() => import('./Player360ProfileModal'));

export function AdminTabFallback({ label = 'Loading…' }) {
  return (
    <div className="rounded-2xl border border-[#1a3363] bg-[#09142a] p-8 flex items-center justify-center gap-3 text-sm font-bold text-gray-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      {label}
    </div>
  );
}
