'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, X, Clock, Wallet } from 'lucide-react';
import { WHEEL_SLICES } from '@/lib/wheelConstants';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert } from '@/lib/hoodAlert';

export default function HoodDailySpinModal({ isOpen, onClose, user, onSuccess }) {
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [wonPrize, setWonPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setWonPrize(null);
      return;
    }
    fetch('/api/daily-spin')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setCanSpin(Boolean(data.canSpin));
          setAvailableSpins(data.availableSpins || 0);
          setStatusMessage(data.message || '');
        }
      })
      .catch(() => {});
  }, [isOpen, user]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const center = width / 2;
    const radius = center - 10;
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
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1a3363';
      ctx.stroke();
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.text || '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(seg.label, radius - 14, 4);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(center, center, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#070d1e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2cb64e';
    ctx.stroke();
  }, [isOpen]);

  const handleSpin = async () => {
    if (spinning || !canSpin) return;
    if (!user) {
      hoodAlert.warning('Please log in first.', 'Login required');
      return;
    }

    setSpinning(true);
    setWonPrize(null);
    playTune('spin');

    try {
      const res = await fetch('/api/daily-spin', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        hoodAlert.error(data.message || data.error || 'Spin failed', 'Spin');
        setSpinning(false);
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);
        setStatusMessage(data.message || '');
        return;
      }

      const sliceIndex = data.sliceIndex ?? 0;
      const degreesPerSegment = 360 / WHEEL_SLICES.length;
      const targetDegree = rotation + 360 * 5 + (360 - sliceIndex * degreesPerSegment - degreesPerSegment / 2);
      setRotation(targetDegree);

      setTimeout(() => {
        setSpinning(false);
        setWonPrize({ amount: data.winAmount, isBadLuck: data.isBadLuck, label: data.prize?.label });
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);
        if (!data.isBadLuck && data.winAmount > 0) {
          playTune('win');
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#2cb64e', '#f59e0b', '#00f0ff', '#ffffff'],
            });
          } catch {}
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hood-user-sync'));
        }
        if (onSuccess) onSuccess();
      }, 4000);
    } catch {
      setSpinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/50 p-6 shadow-[0_0_50px_rgba(44,182,78,0.3)] text-center">
        <button
          type="button"
          onClick={onClose}
          disabled={spinning}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
        >
          <X size={16} />
        </button>

        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/30 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} className="text-amber-400 animate-pulse" />
            <span>Depositor Lucky Wheel</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-wide">Hood Spin Wheel</h3>
          <p className="text-xs text-gray-300">{statusMessage || '2 free spins unlock on each approved deposit.'}</p>
          <p className="text-[11px] text-amber-300 font-bold flex items-center justify-center gap-1">
            <Wallet size={12} /> {availableSpins} spin{availableSpins === 1 ? '' : 's'} ready
          </p>
        </div>

        <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
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

        {wonPrize && (
          <div
            className={`my-3 p-3 rounded-2xl border animate-in zoom-in-95 ${
              wonPrize.isBadLuck
                ? 'bg-[#070d1e] border-[#334155] text-gray-300'
                : 'bg-[#2cb64e]/15 border-[#2cb64e] text-[#2cb64e]'
            }`}
          >
            {wonPrize.isBadLuck ? (
              <span className="text-sm font-bold">Bad luck — try your next spin!</span>
            ) : (
              <span className="text-xl font-black font-mono">You won {wonPrize.label}!</span>
            )}
          </div>
        )}

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
          {spinning
            ? 'Spinning...'
            : canSpin
            ? `SPIN NOW (${availableSpins} LEFT)`
            : 'DEPOSIT TO UNLOCK SPINS'}
        </button>

        {!canSpin && !wonPrize && (
          <p className="text-[10px] text-gray-500 mt-2 flex items-center justify-center gap-1">
            <Clock size={12} /> Prizes: $1, $2, $3 SC or Try Again (30% no win)
          </p>
        )}
      </div>
    </div>
  );
}
