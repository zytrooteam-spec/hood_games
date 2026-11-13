'use client';

import { useAppShell } from '@/components/layout/AppShell';
import HoodChatPageContent from '@/components/chat/HoodChatPageContent';
export default function ChatPage() {
  const { user, openAuth } = useAppShell();
  return <HoodChatPageContent user={user} onOpenAuth={openAuth} />;
}
