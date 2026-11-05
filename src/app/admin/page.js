'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dedicated Admin Login Form State (Strictly Login, Zero Register)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me?admin=true');
      const data = await res.json();
      if (data?.success && data?.user) {
        const r = (data.user.role || '').toLowerCase();
        if (['admin', 'superadmin', 'staff', 'coin_manager', 'financial_manager', 'support_admin'].includes(r)) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Handle Admin / Staff Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setSubmitting(true);
    setLoginError('');
    playTune('click');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          isAdminLogin: true,
        }),
      });

      const data = await res.json();

      if (data?.success && data?.user) {
        const r = (data.user.role || '').toLowerCase();
        if (['admin', 'superadmin', 'staff', 'coin_manager', 'financial_manager', 'support_admin'].includes(r)) {
          setUser(data.user);
          playTune('win');
        } else {
          setLoginError('Access Denied: Your account does not have administrative permissions.');
        }
      } else {
        setLoginError(data?.error || 'Invalid credentials. Please verify your staff username/password.');
      }
    } catch {
      setLoginError('Network connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdminLogout: true }),
    });
    setUser(null);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d1e] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e] font-black animate-spin">
          ⚡
        </div>
        <p className="text-xs font-black uppercase tracking-wider text-gray-400 font-mono">
          Authenticating Hood Terminal...
        </p>
      </div>
    );
  }

  // =========================================================================
  // DEDICATED SEPARATE ADMIN LOGIN FORM (ONLY LOGIN, NO REGISTER)
  // =========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070d1e] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient Lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0c1b38] via-[#09142a] to-[#070d1e] border-2 border-[#1a3363] shadow-[0_20px_70px_rgba(0,0,0,0.85)] space-y-6">
            {/* Header with Logo */}
            <div className="text-center space-y-2">
              <div className="relative w-16 h-16 rounded-2xl bg-[#070d1e] border border-[#2cb64e]/50 p-2 mx-auto shadow-inner">
                <Image src="/logo.png" alt="Hood Games Logo" fill className="object-contain p-1" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-[10px] font-black uppercase tracking-wider mt-2">
                <ShieldCheck size={13} />
                <span>RESTRICTED STAFF TERMINAL</span>
              </div>

              <h1 className="font-heading text-2xl font-black text-white tracking-tight">
                Hood Games Master Desk
              </h1>
              <p className="text-xs text-gray-400">
                Administrative authentication required. Only verified personnel may proceed.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Dedicated Staff Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-300 mb-1.5 font-mono">
                  Staff Username or Email
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-gray-500">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin, staff, or email"
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-white font-semibold text-xs focus:border-[#2cb64e] focus:outline-none focus:ring-2 focus:ring-[#2cb64e]/30 transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-300 mb-1.5 font-mono">
                  Master Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-gray-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-white font-semibold text-xs focus:border-[#2cb64e] focus:outline-none focus:ring-2 focus:ring-[#2cb64e]/30 transition-all placeholder:text-gray-600"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-hood-green py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_22px_rgba(44,182,78,0.45)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>{submitting ? 'Verifying Staff Access...' : 'AUTHENTICATE & ENTER DESK'}</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Security Warning Notice */}
            <div className="p-3 rounded-2xl bg-[#070d1e]/80 border border-[#1a3363] text-center space-y-1">
              <span className="text-[10px] font-mono font-bold text-gray-500 block">
                🔒 Protected by End-to-End Session Encryption
              </span>
              <p className="text-[10px] text-gray-500">
                Unauthorized login attempts are permanently logged with client IP for security audits.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard user={user} onLogout={handleLogout} />;
}
