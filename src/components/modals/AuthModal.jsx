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
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { broadcastPlayerSession } from '@/lib/sessionClient';
import { confirmPlayerSession } from '@/lib/playerSession';

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

  const resetFields = () => {
    setIdentifier('');
    setUsername('');
    setEmail('');
    setPassword('');
    setPhone('');
    setShowPassword(false);
    setError('');
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const next =
      initialTab === 'register' || initialTab === 'signup' ? 'register' : 'login';
    setTab(next);
    setError('');
  }, [isOpen, initialTab]);

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const switchTab = (next) => {
    setTab(next);
    setError('');
    playTune('click');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    playTune('click');

    try {
      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            identifier: identifier.trim(),
            password,
            isAdminLogin: false,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setError(data.error || `Login failed (${res.status || 'network'})`);
          return;
        }
        if (!data.user) {
          setError('Login response invalid. Please try again.');
          return;
        }
        const session = await confirmPlayerSession(data.user);
        if (!session.ok) {
          setError(session.error);
          return;
        }
        playTune('win');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-sync', { detail: session.user }));
          window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: session.user }));
          broadcastPlayerSession(session.user);
        }
        onSuccess?.(session.user);
        handleClose();
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
            phone: phone.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setError(data.error || `Sign up failed (${res.status || 'network'})`);
          return;
        }
        if (!data.user) {
          setError('Sign up response invalid. Please try again.');
          return;
        }
        const session = await confirmPlayerSession(data.user);
        if (!session.ok) {
          setError(session.error);
          return;
        }
        playTune('win');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-sync', { detail: session.user }));
          window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: session.user }));
          broadcastPlayerSession(session.user);
        }
        onSuccess?.(session.user);
        handleClose();
      }
    } catch {
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLogin = tab === 'login';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[min(92dvh,780px)] sm:max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] border-b-0 sm:border-b-2 p-4 pt-12 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all z-20"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="text-center space-y-2 mb-5 sm:mb-6">
          <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-[#2cb64e]/50 shadow-[0_0_20px_rgba(44,182,78,0.4)] bg-[#070d1e] flex items-center justify-center p-1.5">
            <Image src="/logo.png" alt="Hood Gaming" fill sizes="56px" className="object-contain p-1" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} className="text-emerald-400 animate-pulse shrink-0" />
            <span>{isLogin ? 'WELCOME BACK' : 'INSTANT $5.00 SC BONUS'}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight px-1">
            {isLogin ? 'Log In to Hood Gaming' : 'Create Your Free Account'}
          </h3>
          <p className="text-xs text-gray-400 px-2">
            {isLogin
              ? 'Access your wallet, games, and 24/7 support.'
              : 'Sign up in under a minute — free sweeps credits included.'}
          </p>
        </div>

        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <div className="p-1 rounded-2xl bg-[#070d1e] border border-[#1a3363] grid grid-cols-2 gap-1 w-full">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                isLogin ? 'btn-hood-green text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                !isLogin ? 'btn-hood-green text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Username or email</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium"
                    placeholder="Username or email"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hood-input w-full pl-10 pr-10 py-3 rounded-2xl text-sm font-medium"
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Username</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium"
                    placeholder="Pick a username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Email</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium"
                    placeholder="you@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Password (6+ characters)</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hood-input w-full pl-10 pr-10 py-3 rounded-2xl text-sm font-medium"
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Phone (optional)</label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="hood-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium"
                    placeholder="+1 phone"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2 btn-hood-green shadow-[0_4px_22px_rgba(44,182,78,0.5)] disabled:opacity-60"
          >
            <span>
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign in'
                  : 'Create account & claim $5 SC'}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1a3363] flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] sm:text-[10.5px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#2cb64e] shrink-0" />
            <span>256-Bit SSL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#2cb64e] shrink-0" />
            <span>Instant Auto-Credit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
