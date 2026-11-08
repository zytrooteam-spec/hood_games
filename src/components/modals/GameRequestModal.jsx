'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, ArrowRight, Gamepad2 } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';

export default function GameRequestModal({
  isOpen,
  initialGame,
  onClose,
  user,
  onSuccess,
}) {
  const [gamesList, setGamesList] = useState([]);
  const [selectedGameTitle, setSelectedGameTitle] = useState('');
  const [transferAmount, setTransferAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Dynamically fetch active games from the database
  useEffect(() => {
    if (!isOpen) {
      setSuccessMsg(null);
      return;
    }

    fetch('/api/games')
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

          // If initialGame provided, use its title; otherwise pick first active game
          if (initialGame?.title) {
            setSelectedGameTitle(sanitizeGameTitle(initialGame.title));
          } else if (activeGames.length > 0) {
            setSelectedGameTitle(activeGames[0].title);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, initialGame]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please log in first.', 'Login required');
      return;
    }

    const finalGameTitle = sanitizeGameTitle(selectedGameTitle || initialGame?.title || 'Game Platform');
    if (!finalGameTitle) {
      hoodAlert.warning('Please select a game platform.', 'Select a game');
      return;
    }

    setSubmitting(true);
    playTune('click');

    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: initialGame?.id,
          gameTitle: finalGameTitle,
          transferAmount: Number(transferAmount || 0),
          notes,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Request failed', 'Request failed');
      } else {
        setSuccessMsg(data.message);
        playTune('win');
        try {
          const staffChannel = new BroadcastChannel('hood_staff_alerts');
          staffChannel.postMessage({
            type: 'NEW_GAME_ID_REQUEST',
            requestId: data.requestId,
            request: data.request,
            title: 'New game ID request',
            tune: 'marimba',
          });
          staffChannel.close();
        } catch {
          /* ignore */
        }
        try {
          localStorage.setItem(
            'hood_staff_event',
            JSON.stringify({ title: 'New game ID request', tune: 'marimba', t: Date.now() })
          );
        } catch {
          /* ignore */
        }
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      hoodAlert.error('Network error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h3 className="text-2xl font-black text-white">
            {selectedGameTitle || 'Game Platform'} Account
          </h3>
          <p className="text-xs text-gray-300">
            Request official player credentials configured directly in the database.
          </p>
        </div>

        {successMsg ? (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-[#2cb64e] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h4 className="text-base font-black text-white">Credentials In Queue!</h4>
            <p className="text-xs text-gray-300">{successMsg}</p>
            <button
              type="button"
              onClick={onClose}
              className="btn-hood-green px-6 py-2 rounded-xl text-xs font-bold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dynamic Game Platform Dropdown */}
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Select Platform (Dynamic Active Games)
              </label>
              <select
                value={selectedGameTitle}
                onChange={(e) => setSelectedGameTitle(e.target.value)}
                className="hood-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#070d1e]"
              >
                {gamesList.length > 0 ? (
                  gamesList.map((g) => (
                    <option key={g._id || g.id || g.title} value={g.title}>
                      {g.title} {g.category ? `(${g.category})` : ''}
                    </option>
                  ))
                ) : (
                  <option value={selectedGameTitle || 'Game Platform'}>
                    {selectedGameTitle || 'Loading platforms...'}
                  </option>
                )}
              </select>
            </div>

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
              disabled={submitting}
              className="w-full btn-hood-green py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Submitting Request...' : 'REQUEST CREDENTIALS NOW'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
