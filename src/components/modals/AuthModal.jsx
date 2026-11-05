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
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Gift
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function AuthModal({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
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
    setTab(initialTab);
    setError('');
  }, [isOpen, initialTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    playTune('click');

    try {
      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Invalid credentials');
        } else {
          playTune('win');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-sync', { detail: data.user }));
            window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: data.user }));
          }
          if (onSuccess) onSuccess(data.user);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all z-20"
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
            <span>{tab === 'login' ? 'WELCOME BACK PLAYER' : 'INSTANT $5.00 SC BONUS ON SIGNUP'}</span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            {tab === 'login' ? 'Log In to Hood Games' : 'Create Free VIP Account'}
          </h3>
          <p className="text-xs text-gray-400">
            {tab === 'login'
              ? 'Access your sweeps wallet, games catalog, and 24/7 support.'
              : 'Sign up in 30 seconds to claim free sweeps credits and start playing.'}
          </p>
        </div>

        {/* Tab Toggle Switcher */}
        <div className="flex items-center justify-center mb-6">
          <div className="p-1 rounded-2xl bg-[#070d1e] border border-[#1a3363] flex items-center gap-1 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                playTune('click');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                tab === 'login'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                playTune('click');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                tab === 'register'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'login' ? (
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
            className="w-full btn-hood-green py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_22px_rgba(44,182,78,0.5)] mt-5"
          >
            <span>
              {loading
                ? 'Validating Account...'
                : tab === 'login'
                ? 'Sign In to Account'
                : 'Create Account & Claim $5 SC Free'}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Trust Badges */}
        <div className="mt-6 pt-4 border-t border-[#1a3363] flex items-center justify-center gap-4 text-[10.5px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#2cb64e]" />
            <span>256-Bit SSL</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#2cb64e]" />
            <span>Instant Auto-Credit</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#2cb64e]" />
            <span>US Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
