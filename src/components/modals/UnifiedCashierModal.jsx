'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  X,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  Upload,
  AlertCircle
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import HoodCashierGameSelect from '@/components/wallet/HoodCashierGameSelect';
import { getAvailableGamePlatforms } from '@/lib/gamePlatforms';

export default function UnifiedCashierModal({
  isOpen,
  initialTab = 'deposit',
  onClose,
  user,
  onBalanceUpdated,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copied, setCopied] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('50');
  const [senderTag, setSenderTag] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(null);

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      hoodAlert.warning('File size must be under 8MB', 'File too large');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [adminGames, setAdminGames] = useState([]);
  const [userGameAccounts, setUserGameAccounts] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedGameWithdraw, setSelectedGameWithdraw] = useState('');

  const loadGamesAndAccounts = () => {
    fetch('/api/games', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.games)) {
          const list = d.games.map((g) => ({ ...g, title: sanitizeGameTitle(g.title) }));
          diffSet(setAdminGames, list);
          const names = getAvailableGamePlatforms(list, userGameAccounts);
          if (!selectedGame && names[0]) setSelectedGame(names[0]);
          if (!selectedGameWithdraw && names[0]) setSelectedGameWithdraw(names[0]);
        }
      })
      .catch(() => {});
    if (user?.email) {
      fetch(`/api/game-accounts?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && Array.isArray(d.gameAccounts)) {
            diffSet(setUserGameAccounts, d.gameAccounts);
          }
        })
        .catch(() => {});
    }
  };

  // Load payment gateways
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setDepositSuccess(null);
    setWithdrawSuccess(null);
    loadGamesAndAccounts();

    fetch('/api/payments/methods')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.methods)) {
          const activeMethods = d.methods.filter((m) => m.active !== false);
          diffSet(setMethods, activeMethods);
          setSelectedMethod((prev) => (prev ? prev : activeMethods[0] || null));
        }
      })
      .catch(() => {});
  }, [isOpen, initialTab, user?.email]);

  useEffect(() => {
    if (!isOpen || adminGames.length === 0) return;
    const names = getAvailableGamePlatforms(adminGames, userGameAccounts);
    if (names[0] && !selectedGame) setSelectedGame(names[0]);
    if (names[0] && !selectedGameWithdraw) setSelectedGameWithdraw(names[0]);
  }, [adminGames, userGameAccounts, isOpen, selectedGame, selectedGameWithdraw]);

  const handleCopyTag = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    playTune('click');
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit Deposit
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please log in first.', 'Login required');
      return;
    }
    const num = Number(depositAmount);
    if (isNaN(num) || num < 5) {
      hoodAlert.warning('Minimum deposit is $5.00', 'Deposit amount');
      return;
    }

    setSubmittingDeposit(true);
    playTune('click');

    const linked = userGameAccounts.find(
      (a) => (a.gameTitle || '').toLowerCase().trim() === (selectedGame || '').toLowerCase().trim()
    );

    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: num,
          method: selectedMethod?.name || 'Cash App',
          senderTag: senderTag.trim(),
          proofImage: proofImage || null,
          note: depositNote.trim(),
          gameTitle: selectedGame,
          gameAccountUsername: linked?.username || '',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Deposit failed', 'Deposit failed');
      } else {
        setDepositSuccess(data.message || 'Deposit submitted successfully!');
        playTune('coin');
        if (onBalanceUpdated) onBalanceUpdated();
      }
    } catch (err) {
      hoodAlert.error('Network error submitting deposit');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Submit Withdrawal
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please log in first.', 'Login required');
      return;
    }
    const num = Number(withdrawAmount);
    if (isNaN(num) || num < 50) {
      hoodAlert.warning('Minimum redemption is $50.00 SC', 'Redemption amount');
      return;
    }
    if (!withdrawAddress.trim()) {
      hoodAlert.warning('Please enter your payout destination tag or address.', 'Payout details');
      return;
    }

    setSubmittingWithdraw(true);
    playTune('click');

    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: num,
          method: selectedMethod?.name || 'Cash App',
          payoutAddress: withdrawAddress.trim(),
          gameTitle: selectedGameWithdraw,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Withdrawal request failed', 'Withdrawal failed');
      } else {
        setWithdrawSuccess(data.message || 'Cashout request submitted!');
        playTune('win');
        if (onBalanceUpdated) onBalanceUpdated();
      }
    } catch (err) {
      hoodAlert.error('Network error submitting withdrawal');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (!isOpen) return null;

  const numDep = Number(depositAmount) || 0;
  const matchBonusSC = Number((numDep * 3.0).toFixed(2));
  const totalCreditedSC = Number((numDep + matchBonusSC).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] p-5 sm:p-7 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
        >
          <X size={16} />
        </button>

        {/* Unified Tab Switcher Header (Deposit & Withdraw in One Section) */}
        <div className="flex items-center justify-center mb-6">
          <div className="p-1 rounded-2xl bg-[#070d1e] border border-[#1a3363] flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                playTune('click');
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === 'deposit'
                  ? 'btn-hood-green text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wallet size={15} />
              <span>Deposit Funds</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('withdraw');
                playTune('click');
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-blue-600 text-white shadow-lg border border-blue-400/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowUpRight size={15} />
              <span>Redeem / Cashout</span>
            </button>
          </div>
        </div>

        {/* Current Balance Ribbon */}
        {user && (
          <div className="mb-5 p-3 rounded-2xl bg-[#070d1e]/80 border border-[#1a3363] flex items-center justify-between text-xs">
            <span className="text-gray-400 font-semibold">Wallet Sweeps Balance:</span>
            <span className="text-sm font-black text-[#2cb64e] font-mono">
              ${Number(user.balanceSC || 0).toFixed(2)} SC
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: DEPOSIT SECTION                                    */}
        {/* ========================================================= */}
        {activeTab === 'deposit' && (
          <div className="space-y-4">
            {depositSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-[#2cb64e] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="text-lg font-black text-white">Deposit Submitted!</h4>
                <p className="text-xs text-gray-300">{depositSuccess}</p>
                <button
                  type="button"
                  onClick={() => setDepositSuccess(null)}
                  className="btn-hood-green px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Another Deposit
                </button>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <HoodCashierGameSelect
                  adminGames={adminGames}
                  userGameAccounts={userGameAccounts}
                  selectedGame={selectedGame}
                  onSelectGame={setSelectedGame}
                />

                {/* 1. Payment Gateway Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">
                    Select Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.methodId || m._id}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(m);
                          playTune('click');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedMethod?.methodId === m.methodId
                            ? 'bg-[#12244c] border-[#2cb64e] shadow-[0_0_12px_rgba(44,182,78,0.3)]'
                            : 'bg-[#070d1e] border-[#1a3363] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <span className="text-xs font-black block text-white">{m.name}</span>
                        <span className="text-[10px] text-gray-400 block truncate">{m.tag || 'Instant'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Details & Copy Tag */}
                {selectedMethod && (
                  <div className="p-3.5 rounded-2xl bg-[#070d1e] border border-[#2cb64e]/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">
                        Send Payment To ({selectedMethod.name})
                      </span>
                      <span className="text-sm font-black text-white font-mono select-all">
                        {selectedMethod.tag || 'Contact support for tag'}
                      </span>
                    </div>
                    {selectedMethod.tag && (
                      <button
                        type="button"
                        onClick={() => handleCopyTag(selectedMethod.tag)}
                        className="px-3 py-1.5 rounded-lg bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-xs font-bold flex items-center gap-1.5 hover:bg-[#2cb64e]/30 transition-all"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Amount Quick Select */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">
                    Deposit Amount ($ USD)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {['20', '50', '100', '250'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setDepositAmount(amt);
                          playTune('click');
                        }}
                        className={`py-2 rounded-xl text-xs font-black font-mono border transition-all ${
                          depositAmount === amt
                            ? 'btn-hood-green text-white'
                            : 'bg-[#070d1e] border-[#1a3363] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="hood-input w-full px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold"
                    placeholder="Enter Custom Amount"
                    required
                  />
                </div>

                {/* 300% Boost Calculation Preview */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#2cb64e]/15 to-emerald-950/30 border border-[#2cb64e]/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-300 block">300% Welcome Match Bonus:</span>
                    <span className="text-[10px] text-gray-400">+${matchBonusSC.toFixed(2)} Extra SC Free</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">You Receive</span>
                    <span className="text-base font-black text-[#2cb64e] font-mono leading-tight">
                      ${totalCreditedSC.toFixed(2)} SC
                    </span>
                  </div>
                </div>

                {/* Sender Cashtag / Info */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Your Cash App Cashtag / Sender Name
                  </label>
                  <input
                    type="text"
                    value={senderTag}
                    onChange={(e) => setSenderTag(e.target.value)}
                    className="hood-input w-full px-3.5 py-2 rounded-xl text-xs"
                    placeholder="e.g. $JohnDoe"
                    required
                  />
                </div>

                {/* Optional Screenshot Proof Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Payment Receipt Screenshot (Optional)
                  </label>
                  <div className="relative border border-dashed border-[#1a3363] hover:border-[#2cb64e]/50 rounded-xl p-3 bg-[#070d1e] text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {proofImage ? (
                      <div className="flex items-center justify-center gap-2 text-xs text-[#2cb64e] font-bold">
                        <Check size={15} />
                        <span>Receipt Screenshot Attached (Click to change)</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <Upload size={15} className="text-gray-400" />
                        <span>Upload Cash App / Zelle screenshot proof</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Deposit Button */}
                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="w-full btn-hood-green py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Wallet size={16} />
                  <span>{submittingDeposit ? 'Submitting...' : 'SUBMIT DEPOSIT FOR INSTANT APPROVAL'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: WITHDRAWAL / REDEEM SECTION                         */}
        {/* ========================================================= */}
        {activeTab === 'withdraw' && (
          <div className="space-y-4">
            {withdrawSuccess ? (
              <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-500 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="text-lg font-black text-white">Cashout Submitted!</h4>
                <p className="text-xs text-gray-300">{withdrawSuccess}</p>
                <button
                  type="button"
                  onClick={() => setWithdrawSuccess(null)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                {/* Notice */}
                <div className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs text-gray-300 flex items-center gap-2">
                  <Clock size={16} className="text-blue-400 shrink-0" />
                  <span>Redemptions are processed within 15–30 minutes directly to your account.</span>
                </div>

                <HoodCashierGameSelect
                  adminGames={adminGames}
                  userGameAccounts={userGameAccounts}
                  selectedGame={selectedGameWithdraw}
                  onSelectGame={setSelectedGameWithdraw}
                  label="Redeem winnings from game"
                />

                {/* Gateway Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">
                    Payout Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash App', 'Zelle', 'Crypto (BTC/USDT)'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMethod({ name: m })}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          selectedMethod?.name === m
                            ? 'bg-[#12244c] border-blue-400 text-white'
                            : 'bg-[#070d1e] border-[#1a3363] text-gray-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payout Destination */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Your Cashtag / Zelle Email / Wallet Address
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="hood-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono"
                    placeholder="e.g. $MyCashAppTag or email@domain.com"
                    required
                  />
                </div>

                {/* Redeem Amount */}
                <div>
                  <label className="text-xs font-bold text-gray-300 flex items-center justify-between mb-1">
                    <span>Redeem Amount (Min $50.00 SC)</span>
                    <span className="text-[10px] text-gray-400">1 SC = 1 USD</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="hood-input w-full px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold"
                    placeholder="50"
                    required
                  />
                </div>

                {/* Submit Cashout Button */}
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ArrowUpRight size={16} />
                  <span>{submittingWithdraw ? 'Processing Request...' : 'REQUEST CASHOUT (15-30 MINS)'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
