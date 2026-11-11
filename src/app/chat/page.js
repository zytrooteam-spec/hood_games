'use client';

import { useAppShell } from '@/components/layout/AppShell';
import HoodChatPageContent from '@/components/chat/HoodChatPageContent';
import { SessionLoading } from '@/components/auth/SessionGate';

export default function ChatPage() {
  const { user, openAuth, sessionReady } = useAppShell();
  if (!sessionReady && !user) return <SessionLoading />;
  return <HoodChatPageContent user={user} onOpenAuth={openAuth} />;
}
