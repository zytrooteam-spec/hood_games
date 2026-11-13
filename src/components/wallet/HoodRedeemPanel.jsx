'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Gamepad2,
  QrCode,
  Upload,
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';
import { playerApiFetch } from '@/lib/playerApiFetch';
import { compressImageFile } from '@/lib/imageCompress';
import HoodCashierGameSelect from '@/components/wallet/HoodCashierGameSelect';

const PAYOUT_METHODS = [
  { id: 'cashapp', name: 'Cash App' },
  { id: 'crypto-btc', name: 'Bitcoin (BTC)' },
  { id: 'crypto-usdt', name: 'USDT (TRC20)' },
  { id: 'venmo', name: 'Venmo' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'zelle', name: 'Zelle Pay' },
];

const PRESET_AMOUNTS = [50, 100, 200, 500];

export default function HoodRedeemPanel({
  user,
  fetchUser,
  adminGames,
  userGameAccounts,
  selectedGameWithdraw,
  onSelectGameWithdraw,
}) {
  const [payoutMethod, setPayoutMethod] = useState('Cash App');
  const [recipientTag, setRecipientTag] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [gameScreenshot, setGameScreenshot] = useState('');
  const [gameScreenshotName, setGameScreenshotName] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [qrCodeImageName, setQrCodeImageName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  const handleGameShot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      hoodAlert.warning('Screenshot must be under 25MB');
      return;
    }
    setGameScreenshotName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxSize: 1024, quality: 0.62, maxChars: 110000 });
      setGameScreenshot(compressed || '');
    } catch {
      const reader = new FileReader();
      reader.onload = () => setGameScreenshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      hoodAlert.warning('QR image must be under 25MB');
      return;
    }
    setQrCodeImageName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxSize: 1024, quality: 0.62, maxChars: 110000 });
      setQrCodeImage(compressed || '');
    } catch {
      const reader = new FileReader();
      reader.onload = () => setQrCodeImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please sign in first', 'Login required');
      return;
    }
    const num = Number(withdrawAmount);
    if (!num || num <= 0) {
      hoodAlert.warning('Enter a valid amount');
      return;
    }
    if (!recipientTag.trim()) {
      hoodAlert.warning('Enter your payout tag / cashtag');
      return;
    }
    if (!selectedGameWithdraw) {
      hoodAlert.warning('Select the game you won from');
      return;
    }
    if (!gameScreenshot) {
      hoodAlert.warning('Upload your game winning screenshot');
      return;
    }
    if (!qrCodeImage) {
      hoodAlert.warning('Upload your payout QR code screenshot');
      return;
    }

  const linked = userGameAccounts?.find(
    (a) =>
      (a.gameTitle || '').toLowerCase().trim() === selectedGameWithdraw.toLowerCase().trim()
  );
    if (!linked) {
      hoodAlert.warning(
        `No game account for ${selectedGameWithdraw}. Request a game ID under Game Id first.`
      );
      return;
    }

    setSubmitting(true);
    playTune('click');
    try {
      const res = await playerApiFetch('/api/payments/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          payoutMethod,
          destinationTag: recipientTag.trim(),
          destinationAddress: recipientTag.trim(),
          gameTitle: selectedGameWithdraw,
          gameScreenshot,
          qrCodeImage,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Withdrawal failed');
        return;
      }
      setWithdrawSuccess(data.message);
      playTune('win');
      setRecipientTag('');
      setGameScreenshot('');
      setGameScreenshotName('');
      setQrCodeImage('');
      setQrCodeImageName('');
      fetchUser?.(true);
      try {
        const ch = new BroadcastChannel('hood_staff_alerts');
        ch.postMessage({
          type: 'NEW_COIN_CASHOUT',
          amount: num,
          username: user.username,
          gameTitle: selectedGameWithdraw,
        });
        ch.close();
      } catch {
        /* ignore */
      }
      localStorage.setItem(
        'hood_staff_event',
        JSON.stringify({
          type: 'NEW_COIN_CASHOUT',
          amount: num,
          username: user.username,
          gameTitle: selectedGameWithdraw,
          time: Date.now(),
        })
      );
    } catch {
      hoodAlert.error('Network error submitting redemption');
    } finally {
      setSubmitting(false);
    }
  };

  if (withdrawSuccess) {
    return (
      <div className="p-8 rounded-2xl bg-blue-950/40 border border-blue-500 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <Check size={28} />
        </div>
        <h4 className="text-xl font-black text-white">Cashout submitted</h4>
        <p className="text-xs text-gray-300">{withdrawSuccess}</p>
        <button
          type="button"
          onClick={() => setWithdrawSuccess(null)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-3.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs text-gray-300 flex items-center gap-2">
        <Clock size={16} className="text-blue-400 shrink-0" />
        <span>
          Stage 1: Coin desk verifies your game screenshot. Stage 2: Finance pays your{' '}
          {payoutMethod} tag (typically 15–30 min after approval).
        </span>
      </div>

      <HoodCashierGameSelect
        adminGames={adminGames}
        userGameAccounts={userGameAccounts}
        selectedGame={selectedGameWithdraw}
        onSelectGame={onSelectGameWithdraw}
        label="Redeem winnings from game *"
      />

      <div>
        <label className="text-xs font-bold text-gray-300 block mb-2 uppercase">Payout method *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PAYOUT_METHODS.map((m) => {
            const on = payoutMethod === m.name;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayoutMethod(m.name)}
                className={`py-2.5 px-2 rounded-xl text-[10px] font-black border transition-all ${
                  on
                    ? 'border-[#2cb64e] bg-[#2cb64e]/15 text-[#7ee08f]'
                    : 'border-[#1a3363] bg-[#09142a] text-gray-300 hover:border-[#2cb64e]/40'
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-300 block mb-2">Payout tag / cashtag / address *</label>
        <input
          type="text"
          value={recipientTag}
          onChange={(e) => setRecipientTag(e.target.value)}
          className="hood-input w-full px-4 py-3 rounded-2xl text-xs font-mono"
          placeholder="e.g. $MyCashAppTag or Zelle email"
          required
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-300 flex justify-between mb-1.5">
          <span>Redeem amount (SC) *</span>
          <span className="text-[10px] text-gray-400 font-mono">1 SC = 1 USD</span>
        </label>
        <div className="hood-input-prefix rounded-2xl font-mono font-bold mb-2">
          <span className="hood-input-prefix__symbol" aria-hidden>
            $
          </span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="font-bold text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setWithdrawAmount(String(p))}
              className={`py-1.5 rounded-lg text-[10px] font-black border ${
                Number(withdrawAmount) === p
                  ? 'border-[#2cb64e] text-[#7ee08f]'
                  : 'border-[#1a3363] text-gray-400'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
            <Gamepad2 size={13} className="text-[#2cb64e]" />
            Game winning screenshot *
          </label>
          <div className="relative border-2 border-dashed border-[#1a3363] rounded-2xl p-4 text-center bg-[#070d1e]/60 hover:border-[#2cb64e]/40">
            <input type="file" accept="image/*" onChange={handleGameShot} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload size={18} className="text-[#2cb64e] mx-auto mb-1" />
            <p className="text-[10px] text-gray-300 font-bold">
              {gameScreenshotName || 'Upload win proof from game'}
            </p>
          </div>
          {gameScreenshot ? (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400">
              <CheckCircle2 size={12} /> Attached
            </div>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
            <QrCode size={13} className="text-blue-400" />
            Payout QR screenshot *
          </label>
          <div className="relative border-2 border-dashed border-[#1a3363] rounded-2xl p-4 text-center bg-[#070d1e]/60 hover:border-blue-500/40">
            <input type="file" accept="image/*" onChange={handleQr} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-300 font-bold">
              {qrCodeImageName || 'Cash App / Venmo / Crypto QR'}
            </p>
          </div>
          {qrCodeImage ? (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400">
              <CheckCircle2 size={12} /> Attached
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
      >
        <ArrowUpRight size={16} />
        <span>{submitting ? 'Submitting…' : `Submit $${Number(withdrawAmount || 0).toFixed(2)} cashout`}</span>
      </button>
    </form>
  );
}
