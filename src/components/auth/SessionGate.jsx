'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAppShell } from '@/components/layout/AppShell';

/** Avoid flashing guest login UI while /api/auth/me is still loading. */
export function SessionLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 className="animate-spin text-[#2cb64e]" size={32} />
      <p className="text-xs font-bold uppercase tracking-wider">Loading your session…</p>
    </div>
  );
}

export function RequireGuestOrUser({ guest, children }) {
  const { user, sessionReady } = useAppShell();
  if (!sessionReady && !user) return <SessionLoading />;
  if (!user) return guest;
  return children;
}
