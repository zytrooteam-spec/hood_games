'use client';

import HoodAlertProvider from '@/components/modals/HoodAlertProvider';
import PushNotificationManager from '@/components/common/PushNotificationManager';
import RealtimeBridge from '@/components/common/RealtimeBridge';

export default function ClientProviders({ children }) {
  return (
    <HoodAlertProvider>
      <RealtimeBridge />
      <PushNotificationManager />
      {children}
    </HoodAlertProvider>
  );
}
