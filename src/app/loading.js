'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 min-h-[40vh]"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Loader2 className="animate-spin text-[#2cb64e]" size={28} />
      <p className="text-[10px] font-bold uppercase tracking-wider">Opening…</p>
    </div>
  );
}
