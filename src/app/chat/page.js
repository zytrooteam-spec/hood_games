'use client';

import AppShell, { useAppShell } from '@/components/layout/AppShell';
import HoodChatPageContent from '@/components/chat/HoodChatPageContent';
import { SessionLoading } from '@/components/auth/SessionGate';

function ChatInner() {
  const { user, openAuth, sessionReady } = useAppShell();
  if (!sessionReady) return <SessionLoading />;
  return <HoodChatPageContent user={user} onOpenAuth={openAuth} />;
}

export default function ChatPage() {
  return (
    <AppShell>
      <ChatInner />
    </AppShell>
  );
}
