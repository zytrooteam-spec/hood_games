'use client';

import React from 'react';
import { Gamepad2, CheckCircle2, Sparkles } from 'lucide-react';
import { getAvailableGamePlatforms } from '@/lib/gamePlatforms';

export default function HoodCashierGameSelect({
  adminGames,
  userGameAccounts,
  selectedGame,
  onSelectGame,
  label = 'Select target game platform',
}) {
  const displayGames = getAvailableGamePlatforms(adminGames, userGameAccounts);
  const current = selectedGame || displayGames[0] || '';
  const linkedAcc = userGameAccounts?.find(
    (a) => (a.gameTitle || '').toLowerCase().trim() === current.toLowerCase().trim()
  );

  if (displayGames.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1.5">
          <Gamepad2 size={13} className="text-[#2cb64e]" />
          {label} *
        </label>
        {linkedAcc ? (
          <span className="text-[10px] text-[#2cb64e] font-bold flex items-center gap-1 bg-[#2cb64e]/10 border border-[#2cb64e]/35 px-2 py-0.5 rounded-full font-mono">
            <CheckCircle2 size={10} />
            Linked ID: @{linkedAcc.username}
          </span>
        ) : (
          <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 bg-amber-950/50 border border-amber-500/35 px-2 py-0.5 rounded-full">
            <Sparkles size={10} className="text-amber-400" />
            No account yet (auto-queued)
          </span>
        )}
      </div>

      <select
        value={selectedGame || displayGames[0]}
        onChange={(e) => onSelectGame(e.target.value)}
        className="hood-input w-full px-3.5 py-3 rounded-xl font-heading font-bold text-sm"
        required
      >
        {displayGames.map((g) => {
          const match = userGameAccounts?.find(
            (a) => (a.gameTitle || '').toLowerCase().trim() === g.toLowerCase().trim()
          );
          return (
            <option key={g} value={g} className="bg-[#070d1e] text-white">
              {g}
              {match ? ` — (@${match.username})` : ' — (request ID after deposit)'}
            </option>
          );
        })}
      </select>

      {linkedAcc ? (
        <p className="text-[11px] text-[#2cb64e]/90 mt-1.5 flex items-start gap-1.5">
          <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
          <span>
            Credits load to your <strong>{current}</strong> account{' '}
            <code className="text-emerald-300 bg-[#070d1e] px-1 py-0.5 rounded">@{linkedAcc.username}</code>
          </span>
        </p>
      ) : (
        <p className="text-[11px] text-amber-300/90 mt-1.5 bg-amber-950/25 border border-amber-500/20 p-2 rounded-xl leading-relaxed">
          No ID for <strong>{current}</strong> yet — deposit anyway. After finance verifies payment, staff can issue
          credentials for this platform.
        </p>
      )}
    </div>
  );
}
