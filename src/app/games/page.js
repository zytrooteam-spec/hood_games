'use client';

import React, { useState, useEffect } from 'react';
import AppShell, { useAppShell } from '@/components/layout/AppShell';
import HoodGameGrid from '@/components/games/HoodGameGrid';
import HoodCashbackCalculator from '@/components/games/HoodCashbackCalculator';
import HoodDailySpinModal from '@/components/games/HoodDailySpinModal';
import GameRequestModal from '@/components/modals/GameRequestModal';
import { Gamepad2, Sparkles, Zap, Gift, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';

function GamesContent() {
  const { user, fetchUser, openAuth } = useAppShell();
  const [games, setGames] = useState([]);
  const [userGameAccounts, setUserGameAccounts] = useState([]);
  const [requestModal, setRequestModal] = useState({ open: false, game: null });
  const [spinModalOpen, setSpinModalOpen] = useState(false);

  const loadGames = () => {
    fetch('/api/games')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.games)) {
          const sanitized = d.games.map((g) => ({
            ...g,
            title: sanitizeGameTitle(g.title),
          }));
          diffSet(setGames, sanitized);
        }
      })
      .catch(() => {});
  };

  const loadUserAccounts = (email) => {
    if (!email) return;
    fetch(`/api/game-accounts?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.gameAccounts)) {
          diffSet(setUserGameAccounts, d.gameAccounts);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadGames();
    // Silent background poll every 8s
    const interval = setInterval(loadGames, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadUserAccounts(user.email);
      const interval = setInterval(() => loadUserAccounts(user.email), 6000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#091733] to-[#070d1e] border-2 border-[#1a3363] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Gamepad2 size={13} />
            <span>Verified Sweeps Arcade</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Master Sweepstakes Platforms
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Spin the daily wheel, calculate your Sunday cashback, and play verified sweeps platforms.
          </p>
        </div>

        <Link
          href="/wallet"
          className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2"
        >
          <Zap size={15} />
          <span>Deposit & Load Credits</span>
        </Link>
      </div>

      {/* 2. REQUIREMENT #3 PART A: FreeSpin Daily Wheel Section */}
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

      {/* 3. REQUIREMENT #3 PART B: Sunday Cashback Calculator */}
      <HoodCashbackCalculator
        user={user}
        onOpenCashier={() => {}}
      />

      {/* 4. REQUIREMENT #3 PART C: Master Games List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 size={20} className="text-[#2cb64e]" />
            <h3 className="text-lg font-black text-white">All Sweepstakes Platforms ({games.length})</h3>
          </div>
          <span className="text-xs text-gray-400">Direct Portal Access & Instant Credentials</span>
        </div>

        <HoodGameGrid
          games={games}
          userGameAccounts={userGameAccounts}
          onRequestGame={(game) => {
            if (!user) openAuth('login');
            else setRequestModal({ open: true, game });
          }}
          onOpenCashier={() => {}}
        />
      </div>

      {/* Modals */}
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
  return (
    <AppShell>
      <GamesContent />
    </AppShell>
  );
}
