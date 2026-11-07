'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Lock,
  User,
  Mail,
  Phone,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Gift
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { broadcastPlayerSession } from '@/lib/sessionClient';
export default function AuthModal({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
  onOpenCashier,
}) {
  const [tab, setTab] = useState(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialTab === 'withdraw' || initialTab === 'redeem') setTab('redeem');
    else setTab(initialTab === 'register' ? 'register' : initialTab === 'login' ? 'login' : 'login');
    setError('');
  }, [isOpen, initialTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    playTune('click');

    try {
      if (tab === 'login' || tab === 'redeem') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password, isAdminLogin: false }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Invalid credentials');
        } else {
          playTune('win');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-sync', { detail: data.user }));
            window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: data.user }));
            broadcastPlayerSession(data.user);
          }
          if (onSuccess) onSuccess(data.user);
          if (tab === 'redeem' && onOpenCashier) onOpenCashier('withdraw');
          onClose();
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
            phone: phone.trim(),
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Registration failed');
        } else {
          playTune('win');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-sync', { detail: data.user }));
            window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: data.user }));
            broadcastPlayerSession(data.user);
          }
          if (onSuccess) onSuccess(data.user);
          onClose();
        }
      }
    } catch (err) {
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-hidden">
      <div className="relative w-full max-w-lg max-h-[min(92dvh,780px)] sm:max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] border-b-0 sm:border-b-2 p-4 pt-12 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all z-20"
        >
          <X size={16} />
        </button>

        {/* Top Header with Brand Logo & Bonus Pill */}
        <div className="text-center space-y-2 mb-6">
          <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-[#2cb64e]/50 shadow-[0_0_20px_rgba(44,182,78,0.4)] bg-[#070d1e] flex items-center justify-center p-1.5">
            <Image
              src="/logo.png"
              alt="Hood Games"
              fill
              sizes="56px"
              className="object-contain p-1"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} className="text-emerald-400 animate-pulse" />
            <span>
              {tab === 'login'
                ? 'WELCOME BACK PLAYER'
                : tab === 'redeem'
                  ? 'SECURE LOGIN FOR CASHOUT'
                  : 'INSTANT $5.00 SC BONUS ON SIGNUP'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight px-1">
            {tab === 'login' ? 'Log In to Hood Games' : tab === 'redeem' ? 'Log in to redeem' : 'Create Free VIP Account'}
          </h3>
          <p className="text-xs text-gray-400">
            {tab === 'login'
              ? 'Access your sweeps wallet, games catalog, and 24/7 support.'
              : tab === 'redeem'
                ? 'Sign in to verify your account, then we open deposit & redeem in one wallet section.'
                : 'Sign up in 30 seconds to claim free sweeps credits and start playing.'}
          </p>
        </div>

        {/* Tab Toggle Switcher */}
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <div className="p-1 rounded-2xl bg-[#070d1e] border border-[#1a3363] grid grid-cols-3 gap-1 w-full">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                playTune('click');
              }}
              className={`py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wide sm:tracking-wider transition-all ${
                tab === 'login'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                playTune('click');
              }}
              className={`py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wide sm:tracking-wider transition-all ${
                tab === 'register'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('redeem');
                setError('');
                playTune('click');
              }}
              className={`py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wide sm:tracking-wider transition-all ${
                tab === 'redeem'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Redeem
            </button>
          </div>
        </div>
        {tab !== 'register' && (
          <p className="text-center text-[11px] text-gray-500 -mt-1 mb-4">
            New here?{' '}
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                playTune('click');
              }}
              className="text-[#2cb64e] font-bold hover:underline"
            >
              Create a free account
            </button>
          </p>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'login' || tab === 'redeem' ? (
            <>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Username or Email Address
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium"
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hood-input w-full pl-10 pr-10 py-3 rounded-2xl text-xs font-medium"
                    placeholder="Enter your account password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Choose Username
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium"
                    placeholder="e.g. LuckyAce77"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium"
                    placeholder="player@domain.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Password (Min 6 Characters)
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hood-input w-full pl-10 pr-10 py-3 rounded-2xl text-xs font-medium"
                    placeholder="Create a secure password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Mobile Number (Optional for SMS / OTP)
                </label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-5 ${
              tab === 'redeem'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg border border-blue-400/40'
                : tab === 'register'
                  ? 'btn-hood-green shadow-[0_4px_22px_rgba(44,182,78,0.5)]'
                  : 'btn-hood-green shadow-[0_4px_22px_rgba(44,182,78,0.5)]'
            }`}
          >
            <span>
              {loading
                ? 'Validating Account...'
                : tab === 'login'
                  ? 'Sign in'
                  : tab === 'redeem'
                    ? 'Sign in & open redeem'
                    : 'Create Account & Claim $5 SC Free'}
            </span>
            {tab === 'redeem' ? <ArrowUpRight size={16} /> : <ArrowRight size={16} />}
          </button>
        </form>

        {/* Trust Badges */}
        <div className="mt-6 pt-4 border-t border-[#1a3363] flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] sm:text-[10.5px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#2cb64e] shrink-0" />
            <span>256-Bit SSL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#2cb64e] shrink-0" />
            <span>Instant Auto-Credit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#2cb64e] shrink-0" />
            <span>US Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
