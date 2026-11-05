'use client';

import React from 'react';
import { Flame, Sparkles, Star, Gem } from 'lucide-react';

const BADGE_STYLES = {
  HOT: {
    label: 'HOT',
    icon: Flame,
    className: 'bg-rose-500/25 text-rose-200 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.35)]',
  },
  NEW: {
    label: 'NEW',
    icon: Sparkles,
    className: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/45 shadow-[0_0_12px_rgba(34,211,238,0.3)]',
  },
  POPULAR: {
    label: 'POPULAR',
    icon: Star,
    className: 'bg-amber-500/25 text-amber-100 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
  },
  EXCLUSIVE: {
    label: 'VIP',
    icon: Gem,
    className: 'bg-purple-500/25 text-purple-200 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.35)]',
  },
};

export default function HoodGameBadge({ badge, className = '' }) {
  const key = String(badge || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!key) return null;

  const preset = BADGE_STYLES[key];
  if (preset) {
    const Icon = preset.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${preset.className} ${className}`}
      >
        <Icon size={10} className="shrink-0" />
        {preset.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40 ${className}`}
    >
      {String(badge).slice(0, 12)}
    </span>
  );
}
