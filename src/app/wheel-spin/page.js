'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import AppShell, { useAppShell } from '@/components/layout/AppShell';
import {
  Gift,
  Sparkles,
  Trophy,
  Clock,
  Coins,
  Flame,
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import { WHEEL_SEGMENTS } from '@/lib/wheelConstants';
import { playTune } from '@/lib/soundAlerts';
import Link from 'next/link';
import { diffSet } from '@/lib/fastDiff';

function WheelSpinPageContent() {
  const { user, fetchUser, openAuth } = useAppShell();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const [wonPrize, setWonPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);

  // Check spin status from API
  const checkSpinStatus = async () => {
    try {
      const res = await fetch('/api/daily-spin');
      const data = await res.json();
      if (data?.success) {
        diffSet(setCanSpin, data.canSpin);
        if (!data.canSpin && data.nextSpinAvailable) {
          const next = new Date(data.nextSpinAvailable);
          diffSet(setCooldownMessage, `Next free spin available at ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        } else {
          diffSet(setCooldownMessage, '');
        }
      }
    } catch {}
  };

  useEffect(() => {
    checkSpinStatus();
  }, [user]);

  // Render Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 12;
    const center = width / 2;

    const numSegments = WHEEL_SEGMENTS.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, width, height);

    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = i * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternating radiant blues with golden highlights
      if (seg.isJackpot) {
        ctx.fillStyle = '#b45309'; // Jackpot Gold
      } else if (i % 2 === 0) {
        ctx.fillStyle = '#12244c';
      } else {
        ctx.fillStyle = '#09152b';
      }
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = seg.isJackpot ? '#f59e0b' : '#1a3363';
      ctx.stroke();

      // Label text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.isJackpot ? '#fef08a' : '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(seg.label, radius - 18, 5);
      ctx.restore();
    });

    // Outer border ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2cb64e';
    ctx.stroke();

    // Center hub pin
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

      if (data?.success && data?.prize) {
        const segIndex = WHEEL_SEGMENTS.findIndex((s) => s.id === data.prize.id);
        const segmentAngle = 360 / WHEEL_SEGMENTS.length;
        const targetDeg = 360 - (segIndex * segmentAngle + segmentAngle / 2);
        const fullSpins = 360 * 6;
        const finalDeg = rotation + fullSpins + targetDeg;

        setRotation(finalDeg);

        setTimeout(() => {
          setSpinning(false);
          setWonPrize(data.prize);
          setCanSpin(false);
          setCooldownMessage('Next free spin resets in 24 hours');
          playTune('win');

          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#2cb64e', '#f59e0b', '#38bdf8', '#ffffff'],
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
            window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
          }

          if (fetchUser) fetchUser();
        }, 4500);
      } else {
        setSpinning(false);
        setCooldownMessage(data?.message || 'Daily spin limit reached.');
      }
    } catch {
      setSpinning(false);
      setCooldownMessage('Error claiming spin. Please try again.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Sparkles size={15} className="text-amber-400 animate-pulse" />
            <span>Daily Free Spin Wheel • Guaranteed Wins</span>
            <span className="text-emerald-400 font-bold">• 100% FREE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Spin the <span className="text-amber-400">Fortune Wheel</span> & Win Up to{' '}
            <span className="text-[#2cb64e]">$500 SC</span> Daily
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Every verified Hood Games member receives a free daily spin every 24 hours.
            Win instant credits to play Orion Stars, Fire Kirin, Ultra Panda, or redeem straight away!
          </p>
        </div>
      </div>

      {/* Main Wheel Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Wheel Display (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] flex flex-col items-center justify-center relative shadow-2xl">
          {/* Wheel Pointer */}
          <div className="absolute top-8 sm:top-12 z-20 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)] filter" />

          {/* Interactive Wheel Canvas */}
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
          </div>

          {/* Winner Banner if won */}
          {wonPrize && (
            <div className="mt-6 w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#2cb64e]/20 to-amber-500/20 border-2 border-[#2cb64e] text-center space-y-1 animate-bounce">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                🎉 Congratulations! You Won
              </span>
              <h3 className="text-2xl font-black text-white">{wonPrize.label}</h3>
              <p className="text-xs text-gray-300">Credits have been added directly to your account balance!</p>
            </div>
          )}

          {/* Spin Trigger Button */}
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
                  <span>Spinning Fortune Wheel...</span>
                </>
              ) : !user ? (
                <>
                  <Sparkles size={18} />
                  <span>Log In to Spin Free</span>
                </>
              ) : canSpin ? (
                <>
                  <Sparkles size={18} />
                  <span>SPIN NOW (100% FREE)</span>
                </>
              ) : (
                <>
                  <Clock size={18} />
                  <span>Spin Cooldown Active</span>
                </>
              )}
            </button>

            {cooldownMessage && (
              <p className="text-xs text-center text-amber-400 font-bold flex items-center justify-center gap-1.5">
                <Clock size={13} />
                <span>{cooldownMessage}</span>
              </p>
            )}
          </div>
        </div>

        {/* Wheel Perks & Recent Winners (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Daily Spin Breakdown */}
          <div className="p-6 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              <span>Free Spin Prizes</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070d1e] border border-amber-500/40">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>Grand Jackpot</span>
                </span>
                <span className="font-mono font-black text-[#2cb64e]">$500 SC</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span className="text-gray-300">Mega Tier</span>
                <span className="font-mono font-bold text-white">$100 SC & $50 SC</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span className="text-gray-300">Player Boost</span>
                <span className="font-mono font-bold text-white">$25 SC & $10 SC</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363]">
                <span className="text-gray-300">Instant Starter</span>
                <span className="font-mono font-bold text-white">$5 SC & 50 Free Entries</span>
              </div>
            </div>
          </div>

          {/* Quick Rules */}
          <div className="p-6 rounded-3xl bg-[#070d1e] border-2 border-[#1a3363] space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2cb64e]" />
              <span>Rules & Eligibility</span>
            </h4>
            <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
              <li>1 Free Spin awarded every 24 hours per account.</li>
              <li>Prizes are credited instantly to your playable wallet.</li>
              <li>VIP players receive 2x to unlimited free spins daily!</li>
            </ul>

            <Link
              href="/vip"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 pt-1"
            >
              <span>Learn how VIP members get extra spins 👑</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WheelSpinPage() {
  return (
    <AppShell>
      <WheelSpinPageContent />
    </AppShell>
  );
}
