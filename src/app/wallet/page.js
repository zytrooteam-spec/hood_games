'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  Wallet,
  ArrowUpRight,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  DollarSign,
  Coins,
  Upload
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';
import { diffSet } from '@/lib/fastDiff';

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState('deposit');
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copied, setCopied] = useState(false);

  // Deposit Form
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

  // Withdraw Form
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  // History
  const [deposits, setDeposits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

  const loadPaymentData = () => {
    fetch('/api/payments/methods')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.methods)) {
          const active = d.methods.filter((m) => m.active !== false);
          diffSet(setMethods, active);
          setSelectedMethod((prev) => (prev ? prev : active[0] || null));
        }
      })
      .catch(() => {});

    fetch('/api/payments/deposit')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.deposits)) {
          diffSet(setDeposits, d.deposits);
        }
      })
      .catch(() => {});

    fetch('/api/payments/withdraw')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.redemptions)) {
          diffSet(setRedemptions, d.redemptions);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPaymentData();
    // Silent background poll every 6s so payment confirmations update automatically without flicker
    const interval = setInterval(loadPaymentData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyTag = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    playTune('click');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e, user, fetchUser) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please sign in first', 'Login required');
      return;
    }
    const num = Number(depositAmount);
    if (isNaN(num) || num < 5) {
      hoodAlert.warning('Minimum deposit is $5.00', 'Deposit amount');
      return;
    }

    setSubmittingDeposit(true);
    playTune('click');

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
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Deposit failed', 'Deposit failed');
      } else {
        setDepositSuccess(data.message);
        playTune('coin');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
          window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
        }
        if (fetchUser) fetchUser();
        loadPaymentData();
      }
    } catch {
      hoodAlert.error('Network error submitting deposit');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdraw = async (e, user, fetchUser) => {
    e.preventDefault();
    if (!user) {
      hoodAlert.warning('Please sign in first', 'Login required');
      return;
    }
    const num = Number(withdrawAmount);
    if (isNaN(num) || num < 50) {
      hoodAlert.warning('Minimum redemption is $50.00 SC', 'Redemption amount');
      return;
    }
    if (!withdrawAddress.trim()) {
      hoodAlert.warning('Please provide your payout address or cashtag', 'Payout details');
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
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || 'Withdrawal failed', 'Withdrawal failed');
      } else {
        setWithdrawSuccess(data.message);
        playTune('win');
        if (fetchUser) fetchUser();
      }
    } catch {
      hoodAlert.error('Network error submitting redemption');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const numDep = Number(depositAmount) || 0;
  const matchBonusSC = Number((numDep * 3.0).toFixed(2));
  const totalCreditedSC = Number((numDep + matchBonusSC).toFixed(2));

  return (
    <AppShell>
      {({ user, fetchUser, openAuth }) => (
        <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
                <Wallet size={13} />
                <span>Instant Cashier Desk</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Deposit & Redeem Station
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                100% automated sweepstakes wallet. 300% match bonus on first deposit.
              </p>
            </div>

            {user && (
              <div className="p-4 rounded-2xl bg-[#070d1e] border border-[#2cb64e]/40 shadow-inner flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center">
                  <Coins size={20} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Available Balance</span>
                  <span className="text-lg font-black text-[#2cb64e] font-mono leading-tight">
                    ${Number(user.balanceSC || 0).toFixed(2)} SC
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Unified Tab Switcher (Deposit & Redeem in One Section) */}
          <div className="flex items-center justify-center">
            <div className="p-1 rounded-2xl bg-[#070d1e] border border-[#1a3363] flex items-center gap-1 max-w-md w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('deposit');
                  playTune('click');
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'deposit'
                    ? 'btn-hood-green text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Wallet size={16} />
                <span>Deposit Funds</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('withdraw');
                  playTune('click');
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'withdraw'
                    ? 'bg-blue-600 text-white shadow-lg border border-blue-400/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowUpRight size={16} />
                <span>Redeem / Cashout</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Deposit */}
          {activeTab === 'deposit' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] shadow-2xl space-y-5">
              {depositSuccess ? (
                <div className="p-8 rounded-2xl bg-emerald-950/40 border border-[#2cb64e] text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center mx-auto">
                    <Check size={28} />
                  </div>
                  <h4 className="text-xl font-black text-white">Deposit Submitted!</h4>
                  <p className="text-xs text-gray-300">{depositSuccess}</p>
                  <button
                    type="button"
                    onClick={() => setDepositSuccess(null)}
                    className="btn-hood-green px-6 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Submit Another Deposit
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => handleDeposit(e, user, fetchUser)} className="space-y-5">
                  {/* Gateway selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2">
                      Select Payment Gateway
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {methods.map((m) => (
                        <button
                          key={m.methodId || m._id}
                          type="button"
                          onClick={() => {
                            setSelectedMethod(m);
                            playTune('click');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            selectedMethod?.methodId === m.methodId
                              ? 'bg-[#12244c] border-[#2cb64e] shadow-[0_0_15px_rgba(44,182,78,0.3)]'
                              : 'bg-[#070d1e] border-[#1a3363] text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <span className="text-xs font-black block text-white">{m.name}</span>
                          <span className="text-[10px] text-gray-400 block truncate">{m.tag || 'Instant'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Tag */}
                  {selectedMethod && (
                    <div className="p-4 rounded-2xl bg-[#070d1e] border border-[#2cb64e]/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">
                          Send Payment To ({selectedMethod.name})
                        </span>
                        <span className="text-base font-black text-white font-mono select-all">
                          {selectedMethod.tag || 'Contact Support'}
                        </span>
                      </div>
                      {selectedMethod.tag && (
                        <button
                          type="button"
                          onClick={() => handleCopyTag(selectedMethod.tag)}
                          className="px-4 py-2 rounded-xl bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-xs font-bold flex items-center gap-1.5 hover:bg-[#2cb64e]/30 transition-all"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copied ? 'Copied Tag!' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2">
                      Deposit Amount ($ USD)
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2.5">
                      {['20', '50', '100', '250'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setDepositAmount(amt);
                            playTune('click');
                          }}
                          className={`py-2.5 rounded-xl text-xs font-black font-mono border transition-all ${
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
                      className="hood-input w-full px-4 py-3 rounded-2xl font-mono text-sm font-bold"
                      placeholder="Enter Custom Amount"
                      required
                    />
                  </div>

                  {/* 300% Bonus Preview */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2cb64e]/15 to-emerald-950/30 border border-[#2cb64e]/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-300 font-bold block">300% Welcome Match Bonus:</span>
                      <span className="text-[11px] text-[#2cb64e] font-semibold">+${matchBonusSC.toFixed(2)} Extra SC Free</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Credited</span>
                      <span className="text-xl font-black text-[#2cb64e] font-mono leading-tight">
                        ${totalCreditedSC.toFixed(2)} SC
                      </span>
                    </div>
                  </div>

                  {/* Sender Tag */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Your Cash App Cashtag / Sender Info
                    </label>
                    <input
                      type="text"
                      value={senderTag}
                      onChange={(e) => setSenderTag(e.target.value)}
                      className="hood-input w-full px-4 py-2.5 rounded-xl text-xs font-mono"
                      placeholder="e.g. $JohnDoe"
                      required
                    />
                  </div>

                  {/* Payment Receipt Upload */}
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
                          <Check size={16} />
                          <span>Receipt Screenshot Attached (Click to change)</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                          <Upload size={16} className="text-gray-400" />
                          <span>Click to upload Cash App / Zelle screenshot proof</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingDeposit}
                    className="w-full btn-hood-green py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Wallet size={16} />
                    <span>{submittingDeposit ? 'Submitting...' : 'SUBMIT DEPOSIT FOR INSTANT APPROVAL'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Withdraw */}
          {activeTab === 'withdraw' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] shadow-2xl space-y-5">
              {withdrawSuccess ? (
                <div className="p-8 rounded-2xl bg-blue-950/40 border border-blue-500 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                    <Check size={28} />
                  </div>
                  <h4 className="text-xl font-black text-white">Cashout Submitted!</h4>
                  <p className="text-xs text-gray-300">{withdrawSuccess}</p>
                  <button
                    type="button"
                    onClick={() => setWithdrawSuccess(null)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => handleWithdraw(e, user, fetchUser)} className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs text-gray-300 flex items-center gap-2">
                    <Clock size={16} className="text-blue-400 shrink-0" />
                    <span>Redemptions are settled within 15–30 minutes directly to your account.</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2">
                      Payout Destination Tag / Address
                    </label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      className="hood-input w-full px-4 py-3 rounded-2xl text-xs font-mono"
                      placeholder="e.g. $MyCashAppTag or Zelle Email"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 flex items-center justify-between mb-1.5">
                      <span>Redeem Amount (Min $50.00 SC)</span>
                      <span className="text-[10px] text-gray-400 font-mono">1 SC = 1 USD</span>
                    </label>
                    <input
                      type="number"
                      min="50"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="hood-input w-full px-4 py-3 rounded-2xl font-mono text-sm font-bold"
                      placeholder="50"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingWithdraw}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl"
                  >
                    <ArrowUpRight size={16} />
                    <span>{submittingWithdraw ? 'Processing Request...' : 'REQUEST CASHOUT (15-30 MINS)'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
