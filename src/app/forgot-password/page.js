'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: cleanEmail,
          purpose: 'Password Reset',
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch password reset code.');
      }

      setStep('reset');
      setResendCooldown(45);
      setSuccessMsg(`Reset code sent to ${cleanEmail}! Please check your inbox.`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: email.trim().toLowerCase(),
          purpose: 'Password Reset',
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend reset code.');
      }

      setResendCooldown(45);
      setSuccessMsg('A new reset code has been dispatched to your email.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit security code from your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password. Please check your verification code.');
      }

      setSuccessMsg('Password reset successfully! Redirecting to login...');

      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md p-5 sm:p-8 rounded-3xl border border-[var(--chrome-border)] bg-[#070919] shadow-2xl space-y-6 relative overflow-hidden">
      {/* Top Header */}
      <div className="text-center space-y-3">
        <Link href="/">
          <div
            className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border-2 border-[var(--neon-cyan)] shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            style={{ position: 'relative', width: '64px', height: '64px', minWidth: '64px', margin: '0 auto' }}
          >
            <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
          </div>
        </Link>
        <h1 className="font-heading font-black text-2xl text-white">
          {step === 'email' ? (
            <>RESET <span className="text-[var(--neon-cyan)]">PASSWORD</span></>
          ) : (
            <>ENTER <span className="text-[var(--neon-purple-light)]">NEW PASSWORD</span></>
          )}
        </h1>
        <p className="text-xs text-slate-400">
          {step === 'email'
            ? 'Enter your registered email to receive a 6-digit OTP'
            : `Enter the 6-digit code sent to ${email}`}
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2.5 text-xs text-emerald-200 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 animate-pulse" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 1: Enter Email */}
      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              ACCOUNT EMAIL
            </label>
            <div className="relative">
              <input
                type="email"
                required
                disabled={loading}
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full cyber-btn-cyan py-3.5 rounded-xl font-heading font-black text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>DISPATCHING CODE...</span>
              </>
            ) : (
              <>
                <Mail size={16} />
                <span>SEND RESET CODE</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: Enter OTP & New Password */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
            <span className="text-slate-400">Target Account:</span>
            <span className="font-mono text-cyan-300 font-bold">{email}</span>
          </div>

          {/* 6-Digit OTP */}
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              6-DIGIT EMAIL CODE (OTP)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                disabled={loading}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="cyber-input tracking-widest font-mono text-center text-lg"
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              NEW PASSWORD (MIN 6 CHARACTERS)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="cyber-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              CONFIRM NEW PASSWORD
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                disabled={loading}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="cyber-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Resend Cooldown */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
                setOtp('');
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Change Email</span>
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResendOtp}
              className={`font-bold transition ${
                resendCooldown > 0
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-[var(--neon-cyan)] hover:underline cursor-pointer'
              }`}
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || newPassword.length < 6}
            className="w-full cyber-btn-cyan py-3.5 rounded-xl font-heading font-black text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>UPDATING PASSWORD...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>SET NEW PASSWORD</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
        Remembered your password?{' '}
        <Link href="/login" className="text-[var(--neon-cyan)] font-bold hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
