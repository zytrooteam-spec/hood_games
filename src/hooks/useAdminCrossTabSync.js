'use client';

import { useEffect } from 'react';
import { subscribeAdminCrossTab } from '@/lib/adminCrossTab';

/** Same-browser admin tabs stay in sync (Winning Heaven BroadcastChannel pattern). */
export function useAdminCrossTabSync() {
  useEffect(() => {
    return subscribeAdminCrossTab(() => {
      window.dispatchEvent(new CustomEvent('hood-admin-desk-sync'));
      window.dispatchEvent(new CustomEvent('hood-admin-refresh'));
    });
  }, []);
}
