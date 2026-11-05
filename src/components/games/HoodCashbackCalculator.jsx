'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calculator, Calendar, ArrowRight, DollarSign, Info, Trophy } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet } from '@/lib/fastDiff';

export default function HoodCashbackCalculator({
  user,
  cashbackPercent = 10,
  onOpenCashier,
}) {
  const [depositInput, setDepositInput] = useState('200');
  const [cashoutInput, setCashoutInput] = useState('50');
  const [systemPercent, setSystemPercent] = useState(cashbackPercent);
  const [realStats, setRealStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real cashback stats for this week
  useEffect(() => {
    fetch('/api/cashback')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          diffSet(setSystemPercent, data.cashbackPercent || 10);
          if (data.totalDeposit > 0 || data.totalCashout > 0) {
            diffSet(setRealStats, data);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const numDep = Math.max(0, parseFloat(depositInput) || 0);
  const numCash = Math.max(0, parseFloat(cashoutInput) || 0);
  const netPlay = Math.max(0, numDep - numCash);
  const calculatedCashback = Number(((netPlay * systemPercent) / 100).toFixed(2));

  // Quick preset buttons
  const presets = [
    { dep: 100, cash: 20 },
    { dep: 250, cash: 50 },
    { dep: 500, cash: 100 },
    { dep: 1000, cash: 200 },
  ];

  return (
    <div
      id="cashback-calculator-section"
      className="w-full my-6 rounded-3xl bg-gradient-to-br from-[#0e2042] via-[#09142a] to-[#070d1e] border border-[#1a3363] p-5 sm:p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Decorative Aura */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1a3363] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-amber-400 animate-pulse" />
            <span>Weekly Loyalty Cashback</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Sunday Cashback Calculator
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
            You’ll get <strong className="text-amber-300">{systemPercent}%</strong> of your net play from the past week deposited directly into your wallet every Sunday.
            <span className="block text-gray-400 text-xs mt-0.5 font-mono">
              Formula: (Total Deposit − Total Cashout) × {systemPercent}%
            </span>
          </p>
        </div>

        {/* Live Admin Rate Badge */}
        <div className="px-4 py-2.5 rounded-2xl bg-[#070d1e] border border-[#2cb64e]/40 shadow-inner flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#2cb64e]/20 text-[#2cb64e] flex items-center justify-center font-black text-lg">
            %
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Current Rate</span>
            <span className="text-lg font-black text-[#2cb64e] leading-tight font-mono">
              {systemPercent}% NET
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Calculator Body */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Left 7 cols: Inputs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Deposit Input */}
            <div className="p-3.5 rounded-2xl bg-[#070d1e]/90 border border-[#1a3363] space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Total Deposit of Week</span>
                <span className="text-[10px] text-gray-400 font-normal">($ USD / SC)</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#09142a] border border-[#1a3363] text-white font-mono font-bold text-sm focus:border-[#2cb64e] focus:outline-none"
                  placeholder="200"
                />
              </div>
            </div>

            {/* Total Cashout Input */}
            <div className="p-3.5 rounded-2xl bg-[#070d1e]/90 border border-[#1a3363] space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Total Cashout of Week</span>
                <span className="text-[10px] text-gray-400 font-normal">($ USD / SC)</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={cashoutInput}
                  onChange={(e) => setCashoutInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#09142a] border border-[#1a3363] text-white font-mono font-bold text-sm focus:border-[#2cb64e] focus:outline-none"
                  placeholder="50"
                />
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-gray-400">Quick Test:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDepositInput(String(p.dep));
                  setCashoutInput(String(p.cash));
                  playTune('click');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0c1b38] hover:bg-[#12244c] text-gray-300 hover:text-white border border-[#1a3363] transition-all"
              >
                ${p.dep} Dep / ${p.cash} Out
              </button>
            ))}
          </div>

          {/* Breakdown pill */}
          <div className="p-3 rounded-xl bg-[#0c1b38]/60 border border-[#1a3363] text-xs text-gray-300 flex items-center justify-between">
            <span>
              Net Difference: <strong className="text-white font-mono">${netPlay.toFixed(2)}</strong>
            </span>
            <span className="text-gray-400">•</span>
            <span>
              Multiplied by: <strong className="text-amber-300 font-mono">{systemPercent}%</strong>
            </span>
          </div>
        </div>

        {/* Right 5 cols: Estimated Payout Card */}
        <div className="lg:col-span-5">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12244c] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-[0_0_30px_rgba(44,182,78,0.25)] text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-300">
              <Calendar size={14} className="text-[#2cb64e]" />
              <span>Paid Every Sunday Midnight</span>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                Estimated Sunday Reward
              </span>
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2cb64e] via-emerald-300 to-teal-200 font-mono">
                ${calculatedCashback.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-[#2cb64e] block mt-0.5">
                Sweeps Coins (SC)
              </span>
            </div>

            <p className="text-[11px] text-gray-400 font-medium">
              Funds are automatically credited directly to your wallet every Sunday. No playthrough required!
            </p>

            <button
              type="button"
              onClick={() => {
                if (onOpenCashier) onOpenCashier('deposit');
                playTune('click');
              }}
              className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Deposit to Boost Your Cashback</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
