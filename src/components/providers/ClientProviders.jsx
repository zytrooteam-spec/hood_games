'use client';

import HoodAlertProvider from '@/components/modals/HoodAlertProvider';
import PushNotificationManager from '@/components/common/PushNotificationManager';

export default function ClientProviders({ children }) {
  return (
    <HoodAlertProvider>
      <PushNotificationManager />
      {children}
    </HoodAlertProvider>
  );
}
