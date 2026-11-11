'use client';

import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Bell,
  Fingerprint,
  Apple,
  Share2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

function DownloadAppContent() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    playTune('click');
    setDownloading(true);
    // Trigger direct download
    window.location.href = '/download/hood-games.apk';
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-cyan-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider">
            <Smartphone size={15} />
            <span>Official Mobile Client • Native Android & iOS</span>
            <span className="text-[#2cb64e] font-bold">• 120 FPS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Download <span className="text-cyan-400">Hood Games</span> App for Android & iOS
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Take the premier sweeps casino with you anywhere. Experience ultra-fast loading,
            instant cashout push notifications, and seamless 1-tap deposits with our native mobile app.
          </p>

          {/* Quick CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="btn-hood-green px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_25px_rgba(44,182,78,0.45)] flex items-center gap-2.5"
            >
              <Download size={18} />
              <span>{downloading ? 'Starting APK Download...' : 'Download Android APK (v2.6.1)'}</span>
            </button>

            <span className="text-xs text-gray-400 font-mono">18.4 MB • Free & Secure</span>
          </div>
        </div>
      </div>

      {/* Main Download Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Android Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-emerald-500/40 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40">
                Direct Android APK
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Android Package (APK)</h2>
              <p className="text-xs text-gray-400">Compatible with Samsung, Google Pixel, Motorola, Xiaomi, OnePlus</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
              <Smartphone size={24} />
            </div>
          </div>

          {/* Specs Table */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Package ID</span>
              <span className="font-mono font-bold text-white">com.hoodgames.app</span>
            </div>
            <div className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Version</span>
              <span className="font-mono font-bold text-[#2cb64e]">2.6.1 (standalone app)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">File Size</span>
              <span className="font-mono font-bold text-white">18.4 MB</span>
            </div>
            <div className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Android OS</span>
              <span className="font-mono font-bold text-cyan-300">8.0 or Higher</span>
            </div>
          </div>

          {/* Download Action */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full btn-hood-green py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            <Download size={16} />
            <span>Download Official Android APK</span>
          </button>

          {/* 3 Step Install Guide */}
          <div className="pt-4 border-t border-[#1a3363] space-y-2.5">
            <h4 className="text-xs font-black uppercase text-gray-300">Quick Installation Steps:</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#12244c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <span>Click the download button above to save <code>hood-games.apk</code>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#12244c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <span>
                  Tap the file and tap <strong>Install</strong>. Hood Gaming installs as its{' '}
                  <strong>own app</strong> (<code>com.hoodgames.app</code>) — it will{' '}
                  <strong>not</strong> update or replace Players Paradise.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#12244c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <span>Open Hood Games and sign in to access Orion Stars, Fire Kirin & your wallet!</span>
              </div>
            </div>
          </div>
        </div>

        {/* iOS (iPhone / iPad) Web App Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-6 shadow-2xl relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Apple iOS App (PWA)
              </span>
              <h2 className="text-2xl font-black text-white mt-1">iPhone & iPad Web App</h2>
              <p className="text-xs text-gray-400">No App Store restrictions. Fullscreen native-like experience.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Apple size={24} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-3">
            <h4 className="text-xs font-black uppercase text-white">How to Install on iPhone in 10 Seconds:</h4>
            <div className="space-y-3 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#12244c] border border-[#254687] flex items-center justify-center text-white font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="font-bold text-white">Open in Safari Browser</p>
                  <p className="text-gray-400">Visit <code>hoodgames.vip</code> on your Safari browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#12244c] border border-[#254687] flex items-center justify-center text-white font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="font-bold text-white">Tap the Share Icon</p>
                  <p className="text-gray-400">Tap the square icon with arrow pointing up in Safari’s bottom toolbar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#12244c] border border-[#254687] flex items-center justify-center text-white font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="font-bold text-white">Select "Add to Home Screen"</p>
                  <p className="text-gray-400">The Hood Games app icon will appear directly on your home screen!</p>
                </div>
              </div>
            </div>
          </div>

          {/* iOS Perks */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 size={14} className="text-[#2cb64e]" />
              <span>Full screen display without Safari browser bars</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 size={14} className="text-[#2cb64e]" />
              <span>Face ID quick login support</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 size={14} className="text-[#2cb64e]" />
              <span>Instant push notifications for cashouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* App Highlights Banner */}
      <div className="p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-6 shadow-2xl">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-black text-white">Why Play on the Mobile App?</h2>
          <p className="text-xs text-gray-400">
            Engineered for high performance, maximum security, and low latency sweeps gaming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bell size={20} />
            </div>
            <h4 className="text-sm font-black text-white">Instant Cashout Push Alerts</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Get an instant notification the second your Cash App, Chime, or crypto payment is dispatched by our desk.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
              <Zap size={20} />
            </div>
            <h4 className="text-sm font-black text-white">120 FPS High-Speed Gaming</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Native hardware acceleration ensures buttery smooth fish table gameplay with zero input lag.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Fingerprint size={20} />
            </div>
            <h4 className="text-sm font-black text-white">Biometric Vault Security</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Authenticate redemptions and logins securely using fingerprint or Face ID hardware credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DownloadAppPage() {
  return <DownloadAppContent />;
}
