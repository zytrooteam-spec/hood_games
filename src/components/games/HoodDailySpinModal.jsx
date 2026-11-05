'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, X, Clock, Coins, Flame } from 'lucide-react';
import { WHEEL_SEGMENTS } from '@/lib/wheelConstants';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';

export default function HoodDailySpinModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}) {
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const [wonPrize, setWonPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);

  // Check spin status
  useEffect(() => {
    if (!isOpen) {
      setWonPrize(null);
      return;
    }

    fetch('/api/daily-spin')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setCanSpin(data.canSpin);
          if (!data.canSpin && data.nextSpinAvailable) {
            const next = new Date(data.nextSpinAvailable);
            setCooldownMessage(`Next free spin available at ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Draw Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 10;
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

      ctx.fillStyle = i % 2 === 0 ? '#0c1b38' : '#09142a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1a3363';
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.text || '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(seg.label, radius - 20, 4);
      ctx.restore();
    });

    // Center Gold Pin
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#2cb64e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, []);

  const handleSpin = async () => {
    if (spinning || !canSpin) return;

    if (!user) {
      hoodAlert.warning('Please log in to claim your daily free spin!', 'Login required');
      return;
    }

    setSpinning(true);
    playTune('spin');

    try {
      const res = await fetch('/api/daily-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!data.success) {
        hoodAlert.error(data.error || 'Spin failed', 'Spin failed');
        setSpinning(false);
        return;
      }

      const segmentIndex = data.segmentIndex;
      const numSegments = WHEEL_SEGMENTS.length;
      const degreesPerSegment = 360 / numSegments;

      // Pointer is at the top (270 degrees or 90 degrees depending on orientation)
      const targetDegree = 360 * 5 + (360 - segmentIndex * degreesPerSegment - degreesPerSegment / 2);
      setRotation(targetDegree);

      setTimeout(() => {
        setSpinning(false);
        setWonPrize(data.prize);
        setCanSpin(false);
        setCooldownMessage('Next free spin in 24 hours');
        playTune('win');

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2cb64e', '#f59e0b', '#00f0ff', '#ffffff'],
          });
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
          window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
        }

        if (onSuccess) onSuccess();
      }, 4000);
    } catch (err) {
      console.error(err);
      setSpinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/50 p-6 shadow-[0_0_50px_rgba(44,182,78,0.3)] text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={spinning}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} className="text-amber-400 animate-pulse" />
            <span>Daily Free Spin</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-wide">
            Hood High-Roller Wheel
          </h3>
          <p className="text-xs text-gray-300">
            Spin once every 24 hours for guaranteed SC and GC rewards!
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
          {/* Wheel Pointer Pin at Top */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />

          {/* Rotating Canvas Wheel */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
            }}
            className="w-full h-full rounded-full shadow-[0_0_25px_rgba(44,182,78,0.35)]"
          >
            <canvas ref={canvasRef} width={256} height={256} className="w-full h-full" />
          </div>
        </div>

        {/* Won Prize Banner */}
        {wonPrize && (
          <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-[#2cb64e]/20 via-emerald-500/20 to-[#2cb64e]/20 border border-[#2cb64e] animate-in zoom-in-95">
            <span className="text-[11px] font-bold text-gray-300 uppercase block">Congratulations!</span>
            <span className="text-xl font-black text-[#2cb64e] font-mono">
              You won {wonPrize.label}!
            </span>
          </div>
        )}

        {/* Cooldown notice */}
        {!canSpin && cooldownMessage && !wonPrize && (
          <div className="my-2 p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs text-amber-300 flex items-center justify-center gap-2">
            <Clock size={14} />
            <span>{cooldownMessage}</span>
          </div>
        )}

        {/* Spin CTA Button */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning || !canSpin}
          className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
            canSpin && !spinning
              ? 'btn-hood-green shadow-[0_6px_25px_rgba(44,182,78,0.5)]'
              : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 cursor-not-allowed'
          }`}
        >
          {spinning ? 'Spinning Wheel...' : canSpin ? 'SPIN THE WHEEL NOW' : 'SPIN CLAIMED (COME BACK TOMORROW)'}
        </button>
      </div>
    </div>
  );
}
