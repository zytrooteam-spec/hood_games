'use client';

import HoodAlertProvider from '@/components/modals/HoodAlertProvider';

export default function ClientProviders({ children }) {
  return <HoodAlertProvider>{children}</HoodAlertProvider>;
}
