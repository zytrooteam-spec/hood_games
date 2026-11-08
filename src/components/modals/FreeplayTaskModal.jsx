'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Gift,
  Mail,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Gamepad2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { compressImageFile } from '@/lib/imageCompress';
import { playerApiFetch } from '@/lib/playerApiFetch';

export default function FreeplayTaskModal({
  isOpen,
  onClose,
  user,
  freeplayAmount = 3,
  onSuccess,
}) {
  const [availableGames, setAvailableGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('Ultra Panda');
  const [screenshot, setScreenshot] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const fileInputRef = useRef(null);
  const initialEmailSentRef = useRef(false);

  const targetEmail = user?.email || '';

  // Fetch real games from admin
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/games', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.games) && d.games.length > 0) {
          const gameTitles = d.games.map((g) => (g.title || '').trim()).filter(Boolean);
          setAvailableGames(gameTitles);
          setSelectedGame((prev) => {
            const cleanPrev = (prev || '').trim().toLowerCase();
            const exists = gameTitles.some((t) => t.toLowerCase() === cleanPrev);
            return exists ? prev : gameTitles[0];
          });
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Check freeplay claim status on open
  useEffect(() => {
    if (!isOpen) return;
    if (user?.email) {
      fetch('/api/freeplay', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.claimed) {
            setIsClaimed(true);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, user]);

  // Auto-send verification email on first open (only if not already claimed)
  useEffect(() => {
    if (isOpen && targetEmail && !initialEmailSentRef.current && !isClaimed) {
      initialEmailSentRef.current = true;
      handleSendEmail();
    }
  }, [isOpen, targetEmail, isClaimed]);

  if (!isOpen) return null;

  const handleSendEmail = async (isManual = false) => {
    if (!targetEmail) {
      setStatusMsg({ type: 'error', text: 'Please sign in or provide a valid email address.' });
      return;
    }
    if (isManual && resendCooldown > 0) return;

    setEmailSending(true);
    setStatusMsg(null);
    try {
      const res = await playerApiFetch('/api/freeplay/send-task-email', {
        method: 'POST',
        body: JSON.stringify({
          email: targetEmail,
          name: user?.username || '',
          gameTitle: selectedGame,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSent(true);
        if (data.taskId) setTaskId(data.taskId);
        setResendCooldown(45);
        setStatusMsg({
          type: 'success',
          text: isManual
            ? 'New verification email dispatched! Check your Spam / Inbox.'
            : 'Verification task email sent! Follow the instructions below.',
        });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Could not send verification email.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Network error sending verification email.' });
    } finally {
      setEmailSending(false);
    }
  };

  // Compress uploaded screenshot
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Please upload a valid image (PNG, JPG, or WebP).' });
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageFile(file, { maxSize: 1200, quality: 0.65 });
      setScreenshot(compressed || null);
      setStatusMsg({ type: 'success', text: 'Inbox screenshot attached and ready!' });
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => setScreenshot(event.target.result);
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGame) {
      setStatusMsg({ type: 'error', text: 'Please select a casino game platform.' });
      return;
    }
    if (!screenshot) {
      setStatusMsg({ type: 'error', text: 'Please upload your Inbox screenshot proof.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await playerApiFetch('/api/freeplay', {
        method: 'POST',
        body: JSON.stringify({
          gameTitle: selectedGame,
          taskId,
          screenshot,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        try {
          const ch = new BroadcastChannel('paradise_staff_alerts');
          ch.postMessage({
            type: 'NEW_REQUEST',
            category: 'ACCOUNT_CREATION',
            requestId: data.requestId,
            request: data.request,
            gameTitle: selectedGame,
            userName: user?.username || targetEmail.split('@')[0],
            userEmail: targetEmail,
            freeplayPending: true,
            freeplayAmount: data.amount || freeplayAmount,
            timestamp: Date.now(),
          });
          ch.close();
        } catch {}
        try {
          localStorage.setItem('paradise_staff_event', JSON.stringify({
            type: 'NEW_REQUEST',
            category: 'ACCOUNT_CREATION',
            requestId: data.requestId,
            request: data.request,
            gameTitle: selectedGame,
            userName: user?.username || targetEmail.split('@')[0],
            userEmail: targetEmail,
            time: Date.now(),
          }));
        } catch {}

        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#C026D3', '#F59E0B', '#10B981'],
          });
        } catch {}

        if (onSuccess) onSuccess(data);
        setStatusMsg({
          type: 'success',
          text: data.message || 'Freeplay task submitted successfully! Staff is reviewing your proof.',
        });

        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to submit task proof.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Network error submitting task proof.' });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(selectedGame && screenshot && !uploading && !submitting);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl border border-cyan-500/30 bg-[#0c0824] p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,240,255,0.15)] my-8 text-white space-y-5">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer z-20"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,240,255,0.4)] shrink-0">
            <Gift size={24} className="text-black" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-black uppercase tracking-wider mb-1">
              <Sparkles size={11} />
              <span>${Number(freeplayAmount).toFixed(0)} Freeplay Task</span>
              {taskId && <span className="text-white">#{taskId}</span>}
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white m-0 tracking-wide">
              FREEPLAY VERIFICATION TASK
            </h2>
            <p className="text-xs text-slate-300 m-0 leading-relaxed">
              Complete this 30-second verification task to claim your ${Number(freeplayAmount).toFixed(0)} freeplay credits!
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-red-950/70 border-red-500/50 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Already Claimed 1-Time Freeplay Card */}
        {isClaimed ? (
          <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-200 uppercase tracking-wide">
                Freeplay Welcome Bonus Already Claimed!
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-md mx-auto">
                Each player is eligible for exactly <strong>one</strong> Freeplay welcome bonus after signup. You have already claimed yours! Make a deposit now to receive up to <strong>+300% match bonus</strong> on your funds.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/deposit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-sm hover:opacity-90 transition shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                <span>Make a Deposit (Get Bonus)</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Select Game Platform */}
          <div className="space-y-2">
            <label className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>Select Casino Game Platform:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(availableGames.length > 0 ? availableGames : (selectedGame ? [selectedGame] : [])).map((game) => {
                const isSelected = selectedGame === game;
                return (
                  <button
                    key={game}
                    type="button"
                    onClick={() => setSelectedGame(game)}
                    className={`py-2 px-3 rounded-xl text-xs font-black font-heading transition border cursor-pointer text-center ${
                      isSelected
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {game}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Verification Task Email Dispatch Info */}
          <div className="p-4 rounded-2xl bg-[#070514] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Verification Email Sent
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSendEmail(true)}
                disabled={emailSending || resendCooldown > 0}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={emailSending ? 'animate-spin' : ''} />
                <span>
                  {emailSending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend (${resendCooldown}s)`
                    : 'Resend Email'}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-1.5 font-mono">
              <p className="m-0">
                Dispatched to: <strong className="text-cyan-300">{targetEmail}</strong>
              </p>
              {taskId && (
                <p className="m-0">
                  Task Reference ID: <strong className="text-amber-400">{taskId}</strong>
                </p>
              )}
            </div>

            {/* Instruction Checklist */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-200 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Check your <strong>Spam / Junk folder</strong>. If there, click <strong className="text-emerald-400">&quot;Report Not Spam&quot;</strong> or <strong>&quot;Move to Inbox&quot;</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Open your <strong>Primary Inbox</strong> and take a screenshot showing the Hood Gaming verification email inside your Inbox.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Upload the screenshot proof below and hit submit!
                </span>
              </div>
            </div>

            <p className="text-[10.5px] text-cyan-300/80 m-0 leading-relaxed italic">
              🔒 Privacy Tip: You can blur out or draw lines over other personal emails in your screenshot.
            </p>
          </div>

          {/* Step 3: Screenshot Upload Proof Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                <span>Upload Inbox Screenshot Proof:</span>
              </span>
              <span className="text-[10.5px] text-slate-400 lowercase font-normal">PNG, JPG, or WebP</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {!screenshot ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-cyan-500/35 hover:border-cyan-400 bg-slate-900/50 hover:bg-slate-900/80 transition flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  {uploading ? <RefreshCw size={22} className="animate-spin" /> : <Upload size={22} />}
                </div>
                <div>
                  <span className="text-xs font-black text-white block">
                    {uploading ? 'Processing Image...' : 'Click to Upload Inbox Screenshot Proof'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PNG, JPG, JPEG, or WebP
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 bg-[#070514] space-y-2 p-2">
                <img
                  src={screenshot}
                  alt="Inbox proof"
                  className="w-full max-h-48 object-contain rounded-xl bg-black"
                />
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Proof Attached &amp; Ready</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshot('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3.5 px-6 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              canSubmit
                ? 'cyber-btn-cyan shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>SUBMITTING TASK PROOF...</span>
              </>
            ) : !screenshot ? (
              <>
                <Upload size={16} />
                <span>ATTACH INBOX SCREENSHOT TO SUBMIT</span>
              </>
            ) : (
              <>
                <Gift size={16} />
                <span>SUBMIT TASK &amp; CLAIM ${Number(freeplayAmount).toFixed(0)} FREEPLAY &rarr;</span>
              </>
            )}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
