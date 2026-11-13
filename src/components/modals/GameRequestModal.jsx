'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Key, ArrowRight, Gamepad2 } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';
import { playerApiFetch } from '@/lib/playerApiFetch';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import { readGamesCache } from '@/lib/gameAssets';

export default function GameRequestModal({
  isOpen,
  initialGame,
  platformGames,
  onClose,
  user,
  onSuccess,
}) {
  const [gamesList, setGamesList] = useState([]);
  const [selectedGameTitle, setSelectedGameTitle] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [transferAmount, setTransferAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const submitLockRef = React.useRef(false);

  const lockedToGame = Boolean(initialGame?.title || initialGame?.platform);

  const seedFromInitial = useMemo(() => {
    if (!initialGame) return { title: '', id: '' };
    return {
      title: sanitizeGameTitle(initialGame.title || initialGame.platform || ''),
      id: String(initialGame._id || initialGame.id || ''),
    };
  }, [initialGame]);

  useEffect(() => {
    if (!isOpen) {
      submitLockRef.current = false;
      return;
    }

    if (seedFromInitial.title) {
      setSelectedGameTitle(seedFromInitial.title);
      setSelectedGameId(seedFromInitial.id);
    }

    const fromParent = Array.isArray(platformGames)
      ? platformGames
          .filter((g) => g.active !== false)
          .map((g) => ({ ...g, title: sanitizeGameTitle(g.title) }))
      : null;

    if (fromParent?.length) {
      diffSet(setGamesList, fromParent);
      if (!seedFromInitial.title && fromParent[0]?.title) {
        setSelectedGameTitle(fromParent[0].title);
        setSelectedGameId(String(fromParent[0]._id || fromParent[0].id || ''));
      }
      return;
    }

    const cached = readGamesCache();
    if (cached?.length) {
      const active = cached
        .filter((g) => g.active !== false)
        .map((g) => ({ ...g, title: sanitizeGameTitle(g.title) }));
      if (active.length) {
        diffSet(setGamesList, active);
        if (!seedFromInitial.title) {
          setSelectedGameTitle(active[0].title);
          setSelectedGameId(String(active[0]._id || active[0].id || ''));
        }
      }
    }

    playerApiFetch('/api/games', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.games)) {
          const activeGames = d.games
            .filter((g) => g.active !== false)
            .map((g) => ({
              ...g,
              title: sanitizeGameTitle(g.title),
            }));
          diffSet(setGamesList, activeGames);
          if (!seedFromInitial.title && activeGames.length > 0) {
            setSelectedGameTitle(activeGames[0].title);
            setSelectedGameId(String(activeGames[0]._id || activeGames[0].id || ''));
          }
        }
      })
      .catch(() => {});
  }, [isOpen, platformGames, seedFromInitial]);

  if (!isOpen) return null;

  const pingStaffDesk = (extra = {}) => {
    try {
      const staffChannel = new BroadcastChannel('hood_staff_alerts');
      staffChannel.postMessage({
        type: 'NEW_GAME_ID_REQUEST',
        title: 'New game ID request',
        tune: 'marimba',
        ...extra,
      });
      staffChannel.close();
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(
        'hood_staff_event',
        JSON.stringify({
          type: 'NEW_GAME_ID_REQUEST',
          title: 'New game ID request',
          tune: 'marimba',
          t: Date.now(),
          ...extra,
        })
      );
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('hood-admin-refresh'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    if (!user) {
      hoodAlert.warning('Please log in first.', 'Login required');
      return;
    }

    const finalGameTitle = sanitizeGameTitle(selectedGameTitle || seedFromInitial.title || 'Game Platform');
    if (!finalGameTitle) {
      hoodAlert.warning('Please select a game platform.', 'Select a game');
      return;
    }

    submitLockRef.current = true;
    playTune('click');

    const body = {
      gameId: selectedGameId || seedFromInitial.id || undefined,
      gameTitle: finalGameTitle,
      transferAmount: Number(transferAmount || 0),
      notes,
    };

    pingStaffDesk({ prefetch: true, gameTitle: finalGameTitle });
    hoodAlert.success(
      `${finalGameTitle} request sent — staff desk notified. Check Game Id for status.`,
      'Request queued'
    );
    onClose?.();

    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), 25000);

    void playerApiFetch('/api/account-requests', {
      method: 'POST',
      signal: ctrl.signal,
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(timeout);
        submitLockRef.current = false;
        if (!data?.success) {
          hoodAlert.error(data?.error || 'Request failed', 'Request failed');
          return;
        }
        playTune('win');
        window.dispatchEvent(new CustomEvent('hood-game-accounts-refresh'));
        pingStaffDesk({
          requestId: data.requestId,
          request: data.request,
          gameTitle: finalGameTitle,
        });
        onSuccess?.();
      })
      .catch((err) => {
        clearTimeout(timeout);
        submitLockRef.current = false;
        const timedOut = err?.name === 'AbortError';
        hoodAlert.error(
          timedOut
            ? 'Server is slow — your request may still be queued. Check Game Id tab in a moment.'
            : 'Network error submitting request',
          timedOut ? 'Still processing' : 'Request failed'
        );
      });
  };

  const displayTitle = selectedGameTitle || seedFromInitial.title || 'Game Platform';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] p-6 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
        >
          <X size={16} />
        </button>

        <div className="space-y-1 mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Key size={13} />
            <span>Generate Login Credentials</span>
          </div>
          <h3 className="text-2xl font-black text-white">{displayTitle} Account</h3>
          <p className="text-xs text-gray-300">
            Request official player credentials configured directly in the database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            {lockedToGame ? (
              <div className="rounded-xl border border-[#2cb64e]/40 bg-[#2cb64e]/10 px-4 py-3 flex items-center gap-3">
                <Gamepad2 size={20} className="text-[#2cb64e] shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform</p>
                  <p className="text-sm font-black text-white truncate">{displayTitle}</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Select platform</label>
                <select
                  value={selectedGameTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setSelectedGameTitle(title);
                    const match = gamesList.find((g) => g.title === title);
                    setSelectedGameId(String(match?._id || match?.id || ''));
                  }}
                  className="hood-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#070d1e]"
                >
                  {gamesList.length > 0 ? (
                    gamesList.map((g) => (
                      <option key={g._id || g.id || g.title} value={g.title}>
                        {g.title} {g.category ? `(${g.category})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value={selectedGameTitle || ''}>
                      {selectedGameTitle || 'Loading platforms...'}
                    </option>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Optional: Initial Coins to Load ($ SC)
              </label>
              <input
                type="number"
                min="0"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="hood-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold"
                placeholder="0"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Enter 0 if you only want login credentials right now.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Special Note / Existing Player Username
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="hood-input w-full px-3.5 py-2 rounded-xl text-xs"
                placeholder="Optional notes for concierge desk..."
              />
            </div>

            <button
              type="submit"
              className="w-full btn-hood-green py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>REQUEST CREDENTIALS NOW</span>
              <ArrowRight size={15} />
            </button>
          </form>
      </div>
    </div>
  );
}
