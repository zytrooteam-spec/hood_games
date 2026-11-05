'use client';

import AppShell, { useAppShell } from '@/components/layout/AppShell';
import HoodChatPageContent from '@/components/chat/HoodChatPageContent';

function ChatInner() {
  const { user, openAuth } = useAppShell();
  return <HoodChatPageContent user={user} onOpenAuth={openAuth} />;
}

export default function ChatPage() {
  return (
    <AppShell>
      <ChatInner />
    </AppShell>
  );
}
