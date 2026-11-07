'use client';

import React from 'react';
import Image from 'next/image';
import { Download, X, Smartphone, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HoodAppModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] p-6 sm:p-7 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
        >
          <X size={16} />
        </button>

        <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-[#2cb64e]/40 shadow-[0_0_20px_rgba(44,182,78,0.3)] bg-[#09142a] flex items-center justify-center mb-4">
          <Image
            src="/logo.png"
            alt="Hood Games App"
            fill
            sizes="80px"
            className="object-contain p-2"
          />
        </div>

        <h3 className="text-2xl font-black text-white">
          Download Hood Games APK
        </h3>
        <p className="text-xs text-gray-300 mt-1 mb-5">
          Official Android application for fast gaming, push alerts & 1-tap cashouts.
        </p>

        {/* App specs */}
        <div className="p-3.5 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-left text-xs space-y-2 mb-5">
          <div className="flex justify-between text-gray-300">
            <span>Package:</span>
            <span className="font-mono text-[#2cb64e] font-bold">com.hoodgaming.official</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Compatibility:</span>
            <span className="text-white font-medium">Android 8.0 & Above</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Version:</span>
            <span className="text-white font-medium">1.0.0 (Official Release)</span>
          </div>
        </div>

        {/* Download Button */}
        <a
          href="/download/hood-games.apk"
          download
          onClick={() => playTune('win')}
          className="w-full btn-hood-green py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mb-4"
        >
          <Download size={16} />
          <span>DOWNLOAD ANDROID APK (8.5 MB)</span>
        </a>

        {/* Installation Steps */}
        <div className="text-left text-[11px] text-gray-400 space-y-1.5 pt-2 border-t border-[#1a3363]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-[#2cb64e]" />
            <span>Tap Download and accept browser prompt.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-[#2cb64e]" />
            <span>Open APK file & enable 'Install Unknown Apps' if asked.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-[#2cb64e]" />
            <span>Log in and enjoy instantaneous push notifications!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
