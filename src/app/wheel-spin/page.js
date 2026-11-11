'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAppShell } from '@/components/layout/AppShell';
import { Gift, Sparkles, Trophy, Clock, Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import { WHEEL_SLICES } from '@/lib/wheelConstants';
import { playTune } from '@/lib/soundAlerts';
import Link from 'next/link';
import { diffSet } from '@/lib/fastDiff';

function WheelSpinPageContent() {
  const { user, fetchUser, openAuth } = useAppShell();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [wonPrize, setWonPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);

  const checkSpinStatus = async () => {
    try {
      const res = await fetch('/api/daily-spin');
      const data = await res.json();
      if (data?.success) {
        diffSet(setCanSpin, Boolean(data.canSpin));
        diffSet(setAvailableSpins, data.availableSpins || 0);
        diffSet(setStatusMessage, data.message || '');
      }
    } catch {}
  };

  useEffect(() => {
    checkSpinStatus();
    const i = setInterval(checkSpinStatus, 8000);
    return () => clearInterval(i);
  }, [user]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const center = width / 2;
    const radius = center - 12;
    const slices = WHEEL_SLICES;
    const anglePerSegment = (2 * Math.PI) / slices.length;

    ctx.clearRect(0, 0, width, width);
    slices.forEach((seg, i) => {
      const startAngle = i * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1a3363';
      ctx.stroke();
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.text || '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(seg.label, radius - 18, 5);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2cb64e';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#070d1e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2cb64e';
    ctx.stroke();
  }, []);

  const handleSpin = async () => {
    if (!user) {
      openAuth('login');
      return;
    }
    if (spinning || !canSpin) return;

    setSpinning(true);
    setWonPrize(null);
    playTune('spin');

    try {
      const res = await fetch('/api/daily-spin', { method: 'POST' });
      const data = await res.json();

      if (!data?.success) {
        setSpinning(false);
        diffSet(setStatusMessage, data.message || 'No spins available.');
        diffSet(setCanSpin, Boolean(data.canSpin));
        diffSet(setAvailableSpins, data.availableSpins || 0);
        return;
      }

      const sliceIndex = data.sliceIndex ?? 0;
      const segmentAngle = 360 / WHEEL_SLICES.length;
      const targetDeg = 360 - (sliceIndex * segmentAngle + segmentAngle / 2);
      const finalDeg = rotation + 360 * 6 + targetDeg;
      setRotation(finalDeg);

      setTimeout(() => {
        setSpinning(false);
        setWonPrize({ amount: data.winAmount, isBadLuck: data.isBadLuck, label: data.prize?.label });
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);

        if (!data.isBadLuck && data.winAmount > 0) {
          playTune('win');
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#2cb64e', '#f59e0b', '#38bdf8', '#ffffff'],
          });
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hood-user-sync'));
        }
        if (fetchUser) fetchUser();
      }, 4500);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Sparkles size={15} className="text-amber-400 animate-pulse" />
              <span>Depositor Exclusive Lucky Wheel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Spin for <span className="text-[#2cb64e]">$1 – $3 SC</span> (Paradise rules)
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Each <strong className="text-white">approved deposit</strong> unlocks <strong className="text-amber-300">2 free spins</strong>.
              Winnings go straight to your Hood wallet — same odds as Players Paradise.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#09142a]/90 border border-[#2cb64e]/40 min-w-[180px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Free spins ready</span>
            <p className="text-3xl font-black text-[#2cb64e] font-mono mt-1">{availableSpins}</p>
            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
              <Wallet size={11} /> Balance SC: ${Number(user?.balanceSC ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 p-6 sm:p-10 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] flex flex-col items-center justify-center relative shadow-2xl">
          <div className="absolute top-8 sm:top-12 z-20 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)]" />

          <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
              }}
              className="w-full h-full drop-shadow-[0_0_35px_rgba(44,182,78,0.3)]"
            />
            <div className="absolute z-10 pointer-events-none">
              <Gift size={28} className="text-[#2cb64e]" />
            </div>
          </div>

          {wonPrize && (
            <div
              className={`mt-6 w-full p-4 rounded-2xl border-2 text-center space-y-1 ${
                wonPrize.isBadLuck
                  ? 'bg-[#070d1e] border-[#334155] text-gray-300'
                  : 'bg-gradient-to-r from-amber-500/20 via-[#2cb64e]/20 to-amber-500/20 border-[#2cb64e] animate-bounce'
              }`}
            >
              {wonPrize.isBadLuck ? (
                <p className="text-sm font-bold">Bad luck — spin again if you have spins left!</p>
              ) : (
                <>
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider">You won</span>
                  <h3 className="text-2xl font-black text-white">{wonPrize.label}</h3>
                </>
              )}
            </div>
          )}

          <div className="mt-6 w-full max-w-sm space-y-2">
            <button
              type="button"
              disabled={spinning || (!canSpin && !!user)}
              onClick={handleSpin}
              className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_6px_25px_rgba(44,182,78,0.45)] ${
                spinning || (!canSpin && !!user)
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'btn-hood-green text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {spinning ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>Spinning...</span>
                </>
              ) : !user ? (
                <>
                  <Sparkles size={18} />
                  <span>Log In to Spin</span>
                </>
              ) : canSpin ? (
                <>
                  <Sparkles size={18} />
                  <span>SPIN NOW ({availableSpins} AVAILABLE)</span>
                </>
              ) : (
                <>
                  <Clock size={18} />
                  <span>Deposit for 2 Free Spins</span>
                </>
              )}
            </button>
            {statusMessage && (
              <p className="text-xs text-center text-amber-400 font-bold">{statusMessage}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              <span>Wheel slices (same as Paradise)</span>
            </h3>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#2cb64e]/40">
                <span>$3 SC</span>
                <span className="font-mono text-[#2cb64e]">10% chance</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span>$2 SC</span>
                <span className="font-mono">20% chance</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span>$1 SC</span>
                <span className="font-mono">40% chance</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span>Bad Luck / Try Again</span>
                <span className="font-mono">30% (0 SC)</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#070d1e] border-2 border-[#1a3363] space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2cb64e]" />
              <span>How it works</span>
            </h4>
            <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
              <li>New accounts start with 0 spins until first approved deposit.</li>
              <li>Staff approval adds <strong className="text-gray-200">+2 spins</strong> every time.</li>
              <li>Each spin uses one credit; SC wins credit instantly to wallet.</li>
            </ul>
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2cb64e] hover:text-emerald-300 pt-1"
            >
              <span>Make a deposit to unlock spins</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WheelSpinPage() {
  return <WheelSpinPageContent />;
}
