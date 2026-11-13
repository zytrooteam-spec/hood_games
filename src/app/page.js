'use client';

import React, { useState, useEffect } from 'react';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import { useAppShell } from '@/components/layout/AppShell';

// Home Hub Sections
import HoodHeroSection from '@/components/home/HoodHeroSection';
import HoodWinnersTicker from '@/components/home/HoodWinnersTicker';
import HoodQuickActionCards from '@/components/home/HoodQuickActionCards';

// Games & Calculator Sections
import HoodCashbackCalculator from '@/components/games/HoodCashbackCalculator';
import HoodGameGrid from '@/components/games/HoodGameGrid';

// Modals
import HoodDailySpinModal from '@/components/games/HoodDailySpinModal';
import HoodAppModal from '@/components/modals/HoodAppModal';
import GameRequestModal from '@/components/modals/GameRequestModal';
import LoadCoinsModal from '@/components/modals/LoadCoinsModal';
import { readGamesCache, writeGamesCache } from '@/lib/gameAssets';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';

import {
  Sparkles,
  Gamepad2,
  ShieldCheck,
  Zap,
  Gift,
  ArrowRight,
  Trophy,
  CheckCircle2,
  Lock,
  Download,
  Coins
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { playerApiFetch } from '@/lib/playerApiFetch';

export default function HomePage() {
  const { user, fetchUser, openAuth, openCashier, openFreeplay } = useAppShell();

  // Navigation view: 'home' or 'games'
  const [activeView, setActiveView] = useState('home');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const [settings, setSettings] = useState(null);
  const [games, setGames] = useState(() => readGamesCache() || []);
  const [loadingGames, setLoadingGames] = useState(() => !(readGamesCache()?.length > 0));
  const [userGameAccounts, setUserGameAccounts] = useState([]);
  const [pendingAccountRequests, setPendingAccountRequests] = useState([]);

  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [requestModal, setRequestModal] = useState({ open: false, game: null });
  const [loadCoinsModal, setLoadCoinsModal] = useState({ open: false, game: null, userAccount: null });

  // Load User Game Accounts
  const loadUserAccounts = async (email) => {
    try {
      const res = await playerApiFetch(`/api/game-accounts?email=${encodeURIComponent(email || '')}`);
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data?.gameAccounts)) diffSet(setUserGameAccounts, data.gameAccounts);
        if (Array.isArray(data?.pendingRequests)) diffSet(setPendingAccountRequests, data.pendingRequests);
      }
    } catch {}
  };

  // Load System Settings & Games
  const fetchSiteData = async (isSilent = false) => {
    if (!isSilent && games.length === 0) setLoadingGames(true);
    try {
      const [setRes, gamesRes] = await Promise.all([
        fetch('/api/admin/settings').then((r) => r.json()).catch(() => ({})),
        fetch('/api/games', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);

      if (setRes?.success && setRes?.settings) {
        diffSet(setSettings, setRes.settings);
      }
      if (gamesRes?.success && Array.isArray(gamesRes?.games)) {
        const sanitized = gamesRes.games.map((g) => ({
          ...g,
          title: sanitizeGameTitle(g.title),
        }));
        diffSet(setGames, sanitized);
        writeGamesCache(sanitized);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    const cached = readGamesCache();
    if (cached?.length) {
      diffSet(
        setGames,
        cached.map((g) => ({ ...g, title: sanitizeGameTitle(g.title) }))
      );
    }
    fetchSiteData(Boolean(cached?.length));
    const stopPoll = startSseBackedPoll(() => fetchSiteData(true), {
      whenDisconnected: 35_000,
      whenConnected: 180_000,
      runOnStart: false,
    });
    return () => stopPoll();
  }, []);

  useEffect(() => {
    if (user?.email) loadUserAccounts(user.email);
    else {
      diffSet(setUserGameAccounts, []);
      diffSet(setPendingAccountRequests, []);
    }
  }, [user?.email]);

  return (
    <>
      <div className="space-y-7">
          {/* ======================================================== */}
          {/* VIEW 1: HOME (Landing Page / Explanations Only)          */}
          {/* ======================================================== */}
          {activeView === 'home' && (
            <div className="space-y-7 animate-in fade-in">
              {/* Hero Banner with Casino Atmosphere */}
              <HoodHeroSection
                user={user}
                onOpenAuth={(tab) => openAuth(tab)}
                onOpenCashier={(tab) => openCashier(tab)}
                onOpenFreeplay={() => (user ? openFreeplay() : openAuth('register'))}
                setActiveView={setActiveView}
                freeplayAmountSC={Number(settings?.freeplayAmountSC ?? 5)}
                isMobileOnlyHome={isMobile && activeView === 'home'}
              />

              {/* Winning of Random Clients Bar (Requirement #5) */}
              <HoodWinnersTicker />

              <HoodQuickActionCards
                customCards={settings?.quickActionCards || []}
                landingMode={isMobile && activeView === 'home'}
                onOpenCashier={(tab) => openCashier(tab)}
                onOpenSpinWheel={() => setSpinModalOpen(true)}
                setActiveView={setActiveView}
              />
              {isMobile && activeView === 'home' && (
                <div className="md:hidden p-4 rounded-2xl bg-[#0c1f3d]/80 border border-[#1a3363] text-center -mt-2">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Use the bottom bar: <strong className="text-gray-200">Games</strong> for wheel &amp; catalog,{' '}
                    <strong className="text-gray-200">Wallet</strong> for deposit &amp; redeem,{' '}
                    <strong className="text-gray-200">Support</strong> for live chat.
                  </p>
                </div>
              )}

              {/* Explanatory Cards: What Hood Games Offers */}
              <div className="pt-2 space-y-5">
                <div className="text-center max-w-2xl mx-auto space-y-1.5">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
                    <Sparkles size={13} className="text-emerald-400" />
                    <span>The Premier Concierge Choice</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Why America Plays on Hood Games
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Experience America’s highest-rated sweeps entertainment with unmatched security and instant settlement.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#09142a] border border-[#1a3363] space-y-3 shadow-xl hover:border-[#2cb64e]/50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-[#2cb64e]/15 border border-[#2cb64e]/30 flex items-center justify-center text-[#2cb64e]">
                      <Zap size={24} />
                    </div>
                    <h4 className="text-base font-black text-white">Lightning Fast Cashouts</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Cash out your Sweeps Coins directly to Cash App, Zelle, or Crypto in under 30 minutes with zero hidden fees.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#09142a] border border-[#1a3363] space-y-3 shadow-xl hover:border-amber-400/50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Trophy size={24} />
                    </div>
                    <h4 className="text-base font-black text-white">Sunday Cashback Net Payout</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Earn 5%–20% of your weekly net play deposited into your wallet every single Sunday without any rollover demands.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#09142a] border border-[#1a3363] space-y-3 shadow-xl hover:border-blue-400/50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <ShieldCheck size={24} />
                    </div>
                    <h4 className="text-base font-black text-white">24/7 Dedicated Concierge</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Our VIP live agents are online 24/7 via chat to issue logins, verify deposits, and expedite payouts.
                    </p>
                  </div>
                </div>

                {/* Informational CTA — desktop/tablet only (mobile Home stays non-operational) */}
                <div className="hidden md:flex p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#0e2042] to-[#0c1b38] border-2 border-[#1a3363] flex-col sm:flex-row items-center justify-between gap-5 mt-4 shadow-xl">
                  <div className="space-y-1">
                    <h4 className="text-lg sm:text-xl font-black text-white">
                      Ready to Explore the Games & Wheel?
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Spin the daily wheel for free credits, calculate your weekly cashback, or browse all 7+ platforms.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('games');
                      playTune('click');
                    }}
                    className="btn-hood-green px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-2 shadow-[0_4px_20px_rgba(44,182,78,0.4)]"
                  >
                    <Gamepad2 size={16} />
                    <span>Go to Games & Cashback</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: GAMES (Wheel Spin, Cashback Calculator, Games)    */}
          {/* Requirement #3: In Mobile Section: Games has              */}
          {/* [wheel spin, cashback calculator then games list]         */}
          {/* ======================================================== */}
          {activeView === 'games' && (
            <div className="space-y-8 animate-in fade-in">
              {/* 1. FreeSpin Daily Wheel Station at the Top */}
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

                <button
                  type="button"
                  onClick={() => {
                    setSpinModalOpen(true);
                    playTune('spin');
                  }}
                  className="btn-hood-green px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-2 shadow-[0_4px_22px_rgba(44,182,78,0.5)]"
                >
                  <Sparkles size={15} />
                  <span>SPIN THE WHEEL NOW</span>
                </button>
              </div>

              {/* 2. Sunday Cashback Calculator (Requirement #7) */}
              <HoodCashbackCalculator
                user={user}
                cashbackPercent={settings?.cashbackPercent || 10}
                onOpenCashier={(tab) => openCashier(tab)}
              />

              {/* 3. Games Catalog Grid */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2.5">
                  <Gamepad2 size={24} className="text-[#2cb64e]" />
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                    Master Sweepstakes Catalog
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">
                  Request instant credentials or transfer credits directly into your favorite platform.
                </p>

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
            </div>
          )}
      </div>

      <HoodDailySpinModal
        isOpen={spinModalOpen}
        onClose={() => setSpinModalOpen(false)}
        user={user}
        onSuccess={fetchUser}
      />

      <HoodAppModal
        isOpen={appModalOpen}
        onClose={() => setAppModalOpen(false)}
      />

      <GameRequestModal
        isOpen={requestModal.open}
        initialGame={requestModal.game}
        onClose={() => setRequestModal({ open: false, game: null })}
        user={user}
        onSuccess={() => {
          setRequestModal({ open: false, game: null });
          fetchUser();
        }}
      />

      <LoadCoinsModal
        isOpen={loadCoinsModal.open}
        game={loadCoinsModal.game}
        userAccount={loadCoinsModal.userAccount}
        user={user}
        onClose={() => setLoadCoinsModal({ open: false, game: null, userAccount: null })}
        onSuccess={() => {
          fetchUser();
          if (user?.email) loadUserAccounts(user.email);
        }}
      />
    </>
  );
}
