'use client';

import React, { useState, useEffect } from 'react';
import { useAppShell } from '@/components/layout/AppShell';
import HoodGameGrid from '@/components/games/HoodGameGrid';
import HoodCashbackCalculator from '@/components/games/HoodCashbackCalculator';
import HoodDailySpinModal from '@/components/games/HoodDailySpinModal';
import GameRequestModal from '@/components/modals/GameRequestModal';
import LoadCoinsModal from '@/components/modals/LoadCoinsModal';
import { Gamepad2, Sparkles, Zap, Gift } from 'lucide-react';
import Link from 'next/link';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import { readGamesCache, writeGamesCache } from '@/lib/gameAssets';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';
import { HOOD_POLL } from '@/lib/pollingConfig';
import { hoodSsePoll } from '@/lib/ssePollOptions';
import usePollingFetch from '@/hooks/usePollingFetch';
import { HOOD_GAME_ACCOUNTS_SNAPSHOT } from '@/lib/clientCache';

function GamesContent() {
  const { user, fetchUser, openAuth } = useAppShell();
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const accountsUrl = user?.email
    ? `/api/game-accounts?email=${encodeURIComponent(user.email)}`
    : null;
  const { data: accountsData } = usePollingFetch(accountsUrl, {
    cacheKey: user?.email ? HOOD_GAME_ACCOUNTS_SNAPSHOT : null,
    pollMs: HOOD_POLL.PLAYER,
    enabled: Boolean(user?.email),
  });
  const userGameAccounts = accountsData?.gameAccounts || [];
  const pendingAccountRequests = accountsData?.pendingRequests || [];
  const [requestModal, setRequestModal] = useState({ open: false, game: null });
  const [loadCoinsModal, setLoadCoinsModal] = useState({ open: false, game: null, userAccount: null });
  const [spinModalOpen, setSpinModalOpen] = useState(false);

  const loadGames = (isSilent = false) => {
    if (!isSilent && games.length === 0) setLoadingGames(true);
    fetch('/api/games', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.games)) {
          const sanitized = d.games.map((g) => ({
            ...g,
            title: sanitizeGameTitle(g.title),
          }));
          diffSet(setGames, sanitized);
          writeGamesCache(sanitized);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGames(false));
  };

  useEffect(() => {
    const cached = readGamesCache();
    if (cached?.length) diffSet(setGames, cached.map((g) => ({ ...g, title: sanitizeGameTitle(g.title) })));
    loadGames(Boolean(cached?.length));
    return startSseBackedPoll(() => loadGames(true), hoodSsePoll(HOOD_POLL.LISTS));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Page intro (wallet CTA — requirements: wheel → cashback → games on this tab) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#091733] to-[#070d1e] border-2 border-[#1a3363] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Gamepad2 size={13} />
            <span>Verified Sweeps Arcade</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Games hub
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Daily wheel first, then Sunday cashback calculator, then all platforms — same order on mobile bottom nav &quot;Games&quot;.
          </p>
        </div>

        <Link
          href="/wallet"
          className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2"
        >
          <Zap size={15} />
          <span>Deposit &amp; redeem</span>
        </Link>
      </div>

      {/* 1. FreeSpin Daily Wheel (first) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-[0_0_35px_rgba(44,182,78,0.25)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e] shrink-0 shadow-inner">
            <Gift size={32} className="animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-amber-400" />
              <span>Every 24 Hours Guaranteed</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Hood FreeSpin Daily Wheel
            </h3>
            <p className="text-xs text-gray-300">
              Spin for up to $10.00 SC in free cash and 50,000 GC every single day!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSpinModalOpen(true);
              playTune('spin');
            }}
            className="btn-hood-green w-full sm:w-auto px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 flex items-center justify-center gap-2 shadow-[0_4px_22px_rgba(44,182,78,0.5)]"
          >
            <Sparkles size={15} />
            <span>SPIN THE WHEEL NOW</span>
          </button>
        </div>
      </div>

      {/* 2. Sunday Cashback Calculator */}
      <HoodCashbackCalculator
        user={user}
        onOpenCashier={() => {}}
      />

      {/* 3. All platforms grid (last) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 size={20} className="text-[#2cb64e]" />
            <h3 className="text-lg font-black text-white">All sweepstakes platforms ({games.length})</h3>
          </div>
          <span className="text-xs text-gray-400 hidden sm:inline">Request credentials or load credits</span>
        </div>

        <HoodGameGrid
          games={games}
          loadingGames={loadingGames}
          userGameAccounts={userGameAccounts}
          pendingAccountRequests={pendingAccountRequests}
          onRequestGame={(game) => {
            if (!user) openAuth('login');
            else setRequestModal({ open: true, game });
          }}
          onLoadCoins={(game, userAccount) => {
            if (!user) openAuth('login');
            else setLoadCoinsModal({ open: true, game, userAccount });
          }}
        />
      </div>

      {/* Modals */}
      <LoadCoinsModal
        isOpen={loadCoinsModal.open}
        game={loadCoinsModal.game}
        userAccount={loadCoinsModal.userAccount}
        user={user}
        onClose={() => setLoadCoinsModal({ open: false, game: null, userAccount: null })}
        onSuccess={() => fetchUser?.()}
      />
      <GameRequestModal
        isOpen={requestModal.open}
        initialGame={requestModal.game}
        onClose={() => setRequestModal({ open: false, game: null })}
        user={user}
        onSuccess={() => {
          setRequestModal({ open: false, game: null });
          if (fetchUser) fetchUser();
        }}
      />

      <HoodDailySpinModal
        isOpen={spinModalOpen}
        onClose={() => setSpinModalOpen(false)}
        user={user}
        onSuccess={() => {
          if (fetchUser) fetchUser();
        }}
      />
    </div>
  );
}

export default function GamesPage() {
  return <GamesContent />;
}
