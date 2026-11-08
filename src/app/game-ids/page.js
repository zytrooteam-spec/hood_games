'use client';

import React, { useState, useEffect } from 'react';
import AppShell, { useAppShell } from '@/components/layout/AppShell';
import { RequireGuestOrUser } from '@/components/auth/SessionGate';
import GameRequestModal from '@/components/modals/GameRequestModal';
import LoadCoinsModal from '@/components/modals/LoadCoinsModal';
import { Key, Copy, Check, Play, Clock, Plus, ShieldCheck, Gamepad2, Coins } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import { getGameThumbnail, readGamesCache, writeGamesCache } from '@/lib/gameAssets';
import { findGameForAccount } from '@/lib/matchGameAccount';
import { playerApiFetch } from '@/lib/playerApiFetch';

function GameIdsContent() {
  const { user, openAuth } = useAppShell();
  const [accounts, setAccounts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [gamesCatalog, setGamesCatalog] = useState(() => readGamesCache() || []);
  const [loadingDesk, setLoadingDesk] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [requestModal, setRequestModal] = useState({ open: false, game: null });
  const [loadCoinsModal, setLoadCoinsModal] = useState({ open: false, game: null, userAccount: null });

  const loadData = async (email, silent = false) => {
    if (!email) return;
    if (!silent) setLoadingDesk(true);
    try {
      const res = await playerApiFetch(`/api/game-accounts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data?.success) {
        const sanitizedAccounts = (data.gameAccounts || []).map((a) => ({
          ...a,
          gameTitle: sanitizeGameTitle(a.gameTitle),
        }));
        const sanitizedRequests = (data.pendingRequests || []).map((r) => ({
          ...r,
          gameTitle: sanitizeGameTitle(r.gameTitle),
        }));
        diffSet(setAccounts, sanitizedAccounts);
        diffSet(setPendingRequests, sanitizedRequests);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingDesk(false);
    }
  };

  useEffect(() => {
    fetch('/api/games', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.games)) {
          const sanitized = d.games.map((g) => ({ ...g, title: sanitizeGameTitle(g.title) }));
          diffSet(setGamesCatalog, sanitized);
          writeGamesCache(sanitized);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadData(user.email);
      const interval = setInterval(() => loadData(user.email, true), 5000);
      return () => clearInterval(interval);
    }
    setLoadingDesk(false);
  }, [user?.email]);

  const copyText = (txt, id) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    playTune('click');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const guestGate = (
    <div className="p-8 sm:p-12 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] text-center max-w-lg mx-auto space-y-4 my-12 shadow-2xl">
      <div className="w-14 h-14 rounded-2xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e] mx-auto">
        <Key size={26} />
      </div>
      <h2 className="text-2xl font-black text-white">Sign In to View Your Game IDs</h2>
      <p className="text-xs text-gray-300">
        Log in to access your Orion Stars, Fire Kirin, and Ultra Panda credentials.
      </p>
      <button
        type="button"
        onClick={() => openAuth('login')}
        className="btn-hood-green px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
      >
        Log In Now
      </button>
    </div>
  );

  return (
    <RequireGuestOrUser guest={guestGate}>
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#091733] to-[#070d1e] border-2 border-[#1a3363] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-wider">
            <Key size={13} />
            <span>My Game Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Player Game Accounts & PINs
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Your official logins for Orion Stars, Fire Kirin, Game Vault, and Juwa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRequestModal({ open: true, game: null })}
          className="btn-hood-green px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
        >
          <Plus size={16} />
          <span>Request New Game ID</span>
        </button>
      </div>

      {/* Pending Requests Queue */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
            <Clock size={16} />
            <span>Pending Credentials In Queue ({pendingRequests.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-2xl bg-[#09142a] border border-amber-500/40 space-y-1.5 shadow-md"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-white text-sm">{req.gameTitle}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                    GENERATING
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Concierge desk is generating your login. Usually takes 2-5 minutes.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Credentials Grid */}
      <div className="space-y-3 pt-2">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#2cb64e]" />
          <span>Active Game Credentials ({accounts.length})</span>
        </h3>

        {loadingDesk && accounts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-3xl bg-[#09142a] border border-[#1a3363] animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#1a3363]/70" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-[#1a3363]/70 rounded" />
                    <div className="h-3 w-1/2 bg-[#1a3363]/50 rounded" />
                  </div>
                </div>
                <div className="h-16 bg-[#1a3363]/40 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 bg-[#2cb64e]/20 rounded-xl" />
                  <div className="h-10 bg-[#1a3363]/50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#09142a] border border-[#1a3363] text-center text-gray-400 space-y-3">
            <Gamepad2 size={32} className="mx-auto text-gray-500" />
            <p className="text-xs">You don't have any provisioned game accounts yet.</p>
            <button
              type="button"
              onClick={() => setRequestModal({ open: true, game: null })}
              className="btn-hood-green px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              Request Your First Game ID
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const matchedGame = findGameForAccount(gamesCatalog, acc);
              const thumb = getGameThumbnail(
                acc.gameTitle,
                matchedGame?.image || matchedGame?.thumbnail || matchedGame?.imageUrl
              );
              const launchUrl = acc.loginUrl || matchedGame?.playUrl;

              return (
              <div
                key={acc._id}
                className="p-5 rounded-3xl bg-gradient-to-b from-[#0e2042] to-[#070d1e] border-2 border-[#1a3363] hover:border-[#2cb64e]/50 space-y-3 shadow-xl transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#2cb64e]/35 bg-[#09142a] shrink-0 flex items-center justify-center">
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={thumb} alt={acc.gameTitle} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={22} className="text-[#2cb64e]/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-base text-white truncate">{acc.gameTitle}</h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 shrink-0">
                        READY
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 m-0 mt-0.5">Linked platform account</p>
                  </div>
                </div>

                {/* Username Box */}
                <div className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Game Username</span>
                    <span className="text-sm font-mono font-bold text-white select-all">{acc.gameUsername}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(acc.gameUsername, `u_${acc._id}`)}
                    className="p-1.5 rounded-lg bg-[#12244c] hover:bg-[#1a3363] text-gray-300"
                  >
                    {copiedId === `u_${acc._id}` ? <Check size={13} className="text-[#2cb64e]" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Password Box */}
                <div className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Game Password / PIN</span>
                    <span className="text-sm font-mono font-bold text-[#2cb64e] select-all">{acc.gamePassword}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(acc.gamePassword, `p_${acc._id}`)}
                    className="p-1.5 rounded-lg bg-[#12244c] hover:bg-[#1a3363] text-gray-300"
                  >
                    {copiedId === `p_${acc._id}` ? <Check size={13} className="text-[#2cb64e]" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!launchUrl}
                    onClick={() => {
                      if (launchUrl) {
                        playTune('win');
                        window.open(launchUrl, '_blank', 'noreferrer');
                      }
                    }}
                    className="btn-hood-green py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play size={13} className="fill-white" />
                    Launch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTune('coin');
                      setLoadCoinsModal({
                        open: true,
                        game: matchedGame || { title: acc.gameTitle, id: acc.gameId },
                        userAccount: acc,
                      });
                    }}
                    className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-amber-500/15 border border-amber-500/45 text-amber-200 hover:bg-amber-500/25"
                  >
                    <Coins size={13} />
                    Load coins
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <LoadCoinsModal
        isOpen={loadCoinsModal.open}
        game={loadCoinsModal.game}
        userAccount={loadCoinsModal.userAccount}
        user={user}
        onClose={() => setLoadCoinsModal({ open: false, game: null, userAccount: null })}
        onSuccess={() => user?.email && loadData(user.email, true)}
      />

      <GameRequestModal
        isOpen={requestModal.open}
        initialGame={requestModal.game}
        onClose={() => setRequestModal({ open: false, game: null })}
        user={user}
        onSuccess={() => {
          setRequestModal({ open: false, game: null });
          if (user?.email) loadData(user.email);
        }}
      />
    </div>
    </RequireGuestOrUser>
  );
}

export default function GameIdsPage() {
  return (
    <AppShell>
      <GameIdsContent />
    </AppShell>
  );
}
