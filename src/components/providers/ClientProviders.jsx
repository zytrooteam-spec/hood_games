'use client';

import { usePathname } from 'next/navigation';
import HoodAlertProvider from '@/components/modals/HoodAlertProvider';
import PushNotificationManager from '@/components/common/PushNotificationManager';
import RealtimeBridge from '@/components/common/RealtimeBridge';
import AppShell from '@/components/layout/AppShell';

export default function ClientProviders({ children }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');
  const usePlayerShell = !isAdmin;

  const body = (
    <HoodAlertProvider>
      <RealtimeBridge />
      <PushNotificationManager />
      {children}
    </HoodAlertProvider>
  );

  if (!usePlayerShell) return body;

  return <AppShell>{body}</AppShell>;
}
