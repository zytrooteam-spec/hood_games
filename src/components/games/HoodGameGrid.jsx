'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Gamepad2, Search, Sparkles, Key, Play, Star, Flame } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import HoodGameBadge from '@/components/games/HoodGameBadge';

export default function HoodGameGrid({
  games = [],
  userGameAccounts = [],
  onRequestGame,
  onOpenCashier,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const categories = [
    { id: 'all', label: 'All Platforms' },
    { id: 'fish', label: 'Fish Tables' },
    { id: 'sweeps', label: 'Sweeps & Slots' },
  ];

  const filtered = games.filter((g) => {
    const matchesCat = activeCategory === 'all' || g.category === activeCategory;
    const matchesSearch =
      g.title?.toLowerCase().includes(search.toLowerCase()) ||
      g.platform?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 pt-2">
      {/* Category Pills & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveCategory(c.id);
                playTune('click');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                activeCategory === c.id
                  ? 'btn-hood-green text-white shadow-md'
                  : 'bg-[#09142a] text-gray-300 border border-[#1a3363] hover:border-gray-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platform (e.g. Orion, Panda)..."
            className="hood-input w-full pl-9 pr-4 py-2 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Grid of Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((game) => {
          const userAccount = userGameAccounts.find(
            (acc) => acc.gameTitle?.toLowerCase() === game.title?.toLowerCase()
          );

          return (
            <div
              key={game.id || game._id}
              className="rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#070d1e] border border-[#1a3363] hover:border-[#2cb64e] p-4 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:shadow-[0_10px_35px_rgba(44,182,78,0.25)] relative overflow-hidden"
            >
              {/* Top Banner Tag */}
              <div className="flex items-center justify-between mb-3 z-10">
                <HoodGameBadge badge={game.badge || 'HOT'} />
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>{game.rating || '4.9'}</span>
                </div>
              </div>

              {/* Game Visual Icon */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-[#09142a] border border-[#1a3363] flex items-center justify-center p-3 mb-3 group-hover:scale-[1.02] transition-transform">
                {(game.image || '').startsWith('data:image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.image}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-contain p-2"
                  />
                ) : (
                  <Image
                    src={game.image || '/images/ultra-panda.svg'}
                    alt={game.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-contain p-2"
                  />
                )}
              </div>

              {/* Game Metadata */}
              <div className="space-y-1 mb-4 z-10">
                <h4 className="text-base font-black text-white group-hover:text-[#2cb64e] transition-colors">
                  {game.title}
                </h4>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                  {game.description || 'Premier sweeps arcade, reels and fish shooter platform.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400">RTP:</span>
                  <span className="text-[10px] font-mono font-bold text-[#2cb64e]">{game.rtp || 98.2}%</span>
                </div>
              </div>

              {/* If user already has credentials */}
              {userAccount ? (
                <div className="space-y-2 pt-2 border-t border-[#1a3363]">
                  <div className="p-2 rounded-xl bg-[#09142a] border border-[#2cb64e]/40 text-[10px] space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User:</span>
                      <span className="font-mono font-bold text-white select-all">{userAccount.gameUsername}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pass:</span>
                      <span className="font-mono font-bold text-white select-all">{userAccount.gamePassword}</span>
                    </div>
                  </div>

                  <a
                    href={game.playUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => playTune('win')}
                    className="w-full btn-hood-green py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Play size={13} className="fill-white" />
                    <span>Launch Game</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-[#1a3363]">
                  <button
                    type="button"
                    onClick={() => {
                      onRequestGame(game);
                      playTune('click');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#09142a] hover:bg-[#12244c] border border-[#1a3363] hover:border-[#2cb64e] text-gray-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Key size={13} className="text-[#2cb64e]" />
                    <span>Request Login ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCashier) onOpenCashier('deposit');
                      playTune('coin');
                    }}
                    className="w-full btn-hood-green py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <span>Deposit & Play</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
