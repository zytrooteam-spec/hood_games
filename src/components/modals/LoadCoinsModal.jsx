'use client';

import React, { useState, useEffect } from 'react';
import { Coins, Lock, RefreshCw, Gamepad2 } from 'lucide-react';
import { hoodAlert } from '@/lib/hoodAlert';
import { playerApiFetch } from '@/lib/playerApiFetch';
import {
  HoodAdminModal,
  HoodAdminModalHeader,
  HoodAdminModalBody,
  HoodAdminModalField,
  HoodAdminModalHint,
  HoodAdminModalActions,
  HoodAdminModalButton,
} from '@/components/admin/HoodAdminModal';

export default function LoadCoinsModal({ isOpen, onClose, game, user, userAccount, onSuccess }) {
  const [loadAmount, setLoadAmount] = useState(20);
  const [loading, setLoading] = useState(false);

  const availableBalance = user
    ? Math.max(0, Number((user.balanceSC || 0) - (user.frozenBalance || 0)))
    : 0;
  const frozenBalance = user ? Math.max(0, Number(user.frozenBalance || 0)) : 0;

  const gameTitle = game?.title || game?.name || userAccount?.gameTitle || 'Game';
  const gameId = game?.id || game?._id || game?.gameId;
  const gameAccountUsername =
    userAccount?.gameUsername || userAccount?.username || game?.gameUsername || '';

  useEffect(() => {
    if (isOpen) {
      if (availableBalance > 0) setLoadAmount(Math.min(20, availableBalance));
      else setLoadAmount(0);
    }
  }, [isOpen, availableBalance]);

  const presetAmounts = [10, 20, 50, 100];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.email) return;

    const amt = Number(loadAmount);
    if (!amt || amt <= 0) {
      hoodAlert.error('Enter a valid amount greater than $0.');
      return;
    }
    if (amt > availableBalance) {
      hoodAlert.error(`You only have $${availableBalance.toFixed(2)} SC available.`);
      return;
    }

    setLoading(true);

    try {
      const res = await playerApiFetch('/api/account-requests', {
        method: 'POST',
        body: JSON.stringify({
          gameTitle,
          gameId,
          gameAccountUsername,
          requestType: 'COIN_LOAD',
          transferAmount: amt,
          userEmail: user.email,
          userName: user.username,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onClose();
        hoodAlert.success(
          data.message || `$${amt.toFixed(2)} SC sent to the coin desk for ${gameTitle}.`,
          'Coin load submitted'
        );
        window.dispatchEvent(new CustomEvent('hood-user-sync'));
        window.dispatchEvent(new CustomEvent('user-sync'));
        try {
          const staffChannel = new BroadcastChannel('hood_staff_alerts');
          staffChannel.postMessage({
            type: 'NEW_COIN_LOAD',
            requestId: data.requestId,
            request: data.request,
            transferAmount: amt,
            userName: user?.username,
            userEmail: user?.email,
            gameAccountUsername,
            gameTitle,
            title: 'New coin load request',
            tune: 'marimba',
          });
          staffChannel.close();
        } catch {
          /* ignore */
        }
        try {
          localStorage.setItem(
            'hood_staff_event',
            JSON.stringify({
              type: 'NEW_COIN_LOAD',
              requestId: data.requestId,
              transferAmount: amt,
              gameTitle,
              time: Date.now(),
            })
          );
        } catch {
          /* ignore */
        }
        onSuccess?.(data);
      } else {
        hoodAlert.error(data.message || data.error || 'Could not submit load request.');
      }
    } catch {
      hoodAlert.error('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoodAdminModal open={isOpen && Boolean(game || userAccount)} onClose={onClose} size="sm" zIndex={99999}>
      <HoodAdminModalHeader
        icon={<Coins size={20} />}
        title="Load coins into game"
        subtitle={gameTitle}
        onClose={onClose}
      />
      <HoodAdminModalBody>
        <div className="rounded-xl p-4 bg-[#070d1e] border border-[#1a3363] flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500 m-0">Available balance</p>
            <p className="text-xl font-black text-[#7ee08f] m-0 mt-0.5">
              ${availableBalance.toFixed(2)} <span className="text-sm text-gray-400">SC</span>
            </p>
          </div>
          {frozenBalance > 0 ? (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-amber-400/90 m-0 flex items-center gap-1 justify-end">
                <Lock size={10} /> In escrow
              </p>
              <p className="text-sm font-bold text-amber-200 m-0">${frozenBalance.toFixed(2)} SC</p>
            </div>
          ) : null}
        </div>

        {gameAccountUsername ? (
          <p className="text-[11px] text-gray-400 m-0">
            Loading into player ID <strong className="text-white font-mono">{gameAccountUsername}</strong>
          </p>
        ) : null}

        {availableBalance <= 0 ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-xs text-rose-300 m-0">
              No available SC. Deposit first or wait for pending cashouts to clear.
            </p>
            <HoodAdminModalButton
              type="button"
              variant="primary"
              className="w-full"
              onClick={() => {
                onClose();
                window.location.href = '/wallet';
              }}
            >
              Go to deposit
            </HoodAdminModalButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <HoodAdminModalField label="Amount to load (SC)" required>
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  className="text-[10px] font-bold text-[#2cb64e] hover:underline"
                  onClick={() => setLoadAmount(availableBalance)}
                >
                  Load max (${availableBalance.toFixed(2)})
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {presetAmounts.map((amt) => {
                  const disabled = amt > availableBalance;
                  const selected = Number(loadAmount) === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setLoadAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        selected
                          ? 'border-[#2cb64e] bg-[#2cb64e]/20 text-[#7ee08f]'
                          : 'border-[#1a3363] bg-[#09142a] text-white hover:border-[#2cb64e]/40'
                      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      ${amt}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2cb64e] font-black">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={availableBalance}
                  value={loadAmount}
                  onChange={(e) =>
                    setLoadAmount(Math.min(availableBalance, Math.max(0, Number(e.target.value))))
                  }
                  className="hood-input w-full pl-8 font-mono font-bold"
                  required
                />
              </div>
              <HoodAdminModalHint>
                Coins are held in escrow until staff loads them into your game account. Rejected loads refund instantly.
              </HoodAdminModalHint>
            </HoodAdminModalField>

            <HoodAdminModalActions>
              <HoodAdminModalButton type="button" variant="ghost" onClick={onClose}>
                Cancel
              </HoodAdminModalButton>
              <HoodAdminModalButton
                type="submit"
                variant="primary"
                disabled={loading || loadAmount <= 0 || loadAmount > availableBalance}
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Gamepad2 size={14} />}
                Load ${Number(loadAmount || 0).toFixed(2)} SC
              </HoodAdminModalButton>
            </HoodAdminModalActions>
          </form>
        )}
      </HoodAdminModalBody>
    </HoodAdminModal>
  );
}

