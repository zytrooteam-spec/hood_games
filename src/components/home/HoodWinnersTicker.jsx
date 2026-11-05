'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Sparkles } from 'lucide-react';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';

export default function HoodWinnersTicker() {
  const [wins, setWins] = useState([]);

  const fetchActivity = () => {
    fetch('/api/games/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data?.activity)) {
          const sanitized = data.activity.map((item) => ({
            ...item,
            gameTitle: sanitizeGameTitle(item.gameTitle),
          }));
          diffSet(setWins, sanitized);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchActivity();
    // Silent background poll every 10s
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, []);

  if (wins.length === 0) return null;

  const loopList = [...wins, ...wins];

  return (
    <div className="w-full my-4 overflow-hidden rounded-2xl border border-[#1a3363] bg-gradient-to-r from-[#09142a] via-[#0c1e42] to-[#09142a] py-2.5 px-3 flex items-center gap-3 shadow-lg">
      {/* Lead Tag */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#2cb64e] to-emerald-600 text-white font-black text-xs shrink-0 shadow-[0_0_15px_rgba(44,182,78,0.4)]">
        <Trophy size={14} className="text-yellow-200" />
        <span className="uppercase tracking-wider">Recent Winners</span>
      </div>

      {/* Marquee Track */}
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-slide-track gap-4 items-center">
          {loopList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-[#070d1e]/90 border border-[#1a3363] shrink-0 text-xs shadow-sm hover:border-[#2cb64e] transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center font-bold text-[10px]">
                {item.username.charAt(0)}
              </div>
              <span className="font-bold text-gray-200">{item.username}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 font-medium">{item.gameTitle}</span>
              <span className="font-mono font-black text-[#2cb64e] bg-[#2cb64e]/10 px-2 py-0.5 rounded border border-[#2cb64e]/30">
                +${Number(item.amount).toFixed(2)} {item.currency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
