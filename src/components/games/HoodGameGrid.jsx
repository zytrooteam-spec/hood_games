'use client';

import React, { useState } from 'react';
import { Gamepad2, Search, KeyRound, Play, Star, Coins, Clock } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import HoodGameBadge from '@/components/games/HoodGameBadge';
import { getGameThumbnail } from '@/lib/gameAssets';
import { findUserAccountForGame, isPendingGameRequest } from '@/lib/matchGameAccount';

function GameCardSkeleton() {
  return (
    <div className="rounded-3xl bg-[#09142a] border border-[#1a3363] p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-16 bg-[#1a3363]/80 rounded-lg" />
        <div className="h-5 w-10 bg-[#1a3363]/60 rounded-lg" />
      </div>
      <div className="h-36 rounded-2xl bg-[#0e2042]/80" />
      <div className="h-4 w-3/4 bg-[#1a3363]/70 rounded" />
      <div className="h-3 w-full bg-[#1a3363]/50 rounded" />
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="h-10 rounded-xl bg-[#1a3363]/60" />
        <div className="h-10 rounded-xl bg-[#2cb64e]/20" />
      </div>
    </div>
  );
}

function GameCardImage({ game }) {
  const src = getGameThumbnail(game.title, game.image || game.thumbnail || game.imageUrl);

  return (
    <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-[#09142a] border border-[#1a3363] mb-3 group-hover:scale-[1.02] transition-transform flex items-center justify-center">
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={game.title}
          loading="lazy"
          className={`absolute inset-0 w-full h-full ${
            src.startsWith('data:image') ? 'object-contain p-3' : 'object-cover'
          }`}
        />
      ) : (
        <div className="text-center px-3">
          <Gamepad2 size={32} className="mx-auto text-[#2cb64e]/60 mb-1" />
          <p className="text-[10px] font-black text-gray-500 uppercase">Upload logo in admin</p>
        </div>
      )}
    </div>
  );
}

export default function HoodGameGrid({
  games = [],
  userGameAccounts = [],
  pendingAccountRequests = [],
  loadingGames = false,
  onRequestGame,
  onLoadCoins,
  onLaunchGame,
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

  const handleLaunch = (game, userAccount) => {
    playTune('win');
    const url = game.playUrl || userAccount?.loginUrl;
    if (onLaunchGame) {
      onLaunchGame(game, userAccount);
      return;
    }
    if (url && url !== '#') window.open(url, '_blank', 'noreferrer');
  };

  return (
    <div className="w-full space-y-6 pt-2">
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

      {loadingGames && games.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center space-y-2 rounded-3xl border border-[#1a3363] bg-[#09142a]">
          <Gamepad2 size={36} className="mx-auto text-gray-600" />
          <p className="text-sm font-bold text-white">No platforms match your filters.</p>
          <p className="text-xs text-gray-500">Try another category or clear search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((game) => {
            const userAccount = findUserAccountForGame(userGameAccounts, game);
            const hasAccount = Boolean(userAccount);
            const isPending = !hasAccount && isPendingGameRequest(pendingAccountRequests, game);

            return (
              <div
                key={game.id || game._id}
                className="rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#070d1e] border border-[#1a3363] hover:border-[#2cb64e] p-4 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:shadow-[0_10px_35px_rgba(44,182,78,0.25)] relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 z-10">
                    <HoodGameBadge badge={game.badge || 'HOT'} />
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span>{game.rating || '4.9'}</span>
                    </div>
                  </div>

                  <GameCardImage game={game} />

                  <div className="space-y-1 mb-3">
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
                </div>

                {hasAccount ? (
                  <div className="space-y-2 pt-2 border-t border-[#1a3363]">
                    <div className="p-2 rounded-xl bg-[#09142a] border border-[#2cb64e]/40 text-[10px] space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-400 shrink-0">User:</span>
                        <span className="font-mono font-bold text-white select-all truncate">
                          {userAccount.gameUsername}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-400 shrink-0">Pass:</span>
                        <span className="font-mono font-bold text-white select-all truncate">
                          {userAccount.gamePassword}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleLaunch(game, userAccount)}
                        className="btn-hood-green py-2 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1"
                      >
                        <Play size={12} className="fill-white" />
                        Launch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTune('coin');
                          onLoadCoins?.(game, userAccount);
                        }}
                        className="py-2 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 bg-amber-500/15 border border-amber-500/45 text-amber-200 hover:bg-amber-500/25 transition-all"
                      >
                        <Coins size={12} />
                        Load coins
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#1a3363] grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLaunch(game, null)}
                      className="btn-hood-green py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
                    >
                      <Play size={12} className="fill-white" />
                      Play
                    </button>
                    {isPending ? (
                      <button
                        type="button"
                        disabled
                        className="py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 bg-amber-950/50 border border-amber-500/40 text-amber-300/90 cursor-not-allowed"
                      >
                        <Clock size={12} className="animate-pulse" />
                        Pending
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onRequestGame(game);
                          playTune('click');
                        }}
                        className="py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 bg-[#09142a] border border-[#1a3363] hover:border-[#2cb64e] text-gray-200"
                      >
                        <KeyRound size={12} className="text-[#2cb64e]" />
                        Get ID
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
