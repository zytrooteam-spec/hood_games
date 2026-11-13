'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

/** Shown when payment_methods collection has no active gateways for players. */
export default function HoodNoGatewaysSupportCard() {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-center space-y-3">
      <MessageSquare className="mx-auto text-amber-300" size={28} aria-hidden />
      <p className="text-sm font-black text-white">Payment gateways not listed online</p>
      <p className="text-xs text-gray-300 leading-relaxed max-w-md mx-auto">
        We only show payment methods that staff has added for your account. For deposit or cashout tags, please contact{' '}
        <strong className="text-[#2cb64e]">Live Chat Support</strong> — our team will guide you in chat.
      </p>
      <Link
        href="/chat"
        className="btn-hood-green inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase"
      >
        <MessageSquare size={15} />
        Open Chat Support
      </Link>
    </div>
  );
}
