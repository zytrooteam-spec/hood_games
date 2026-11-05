'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Headphones,
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { compressImageFile } from '@/lib/imageCompress';
import { diffSet } from '@/lib/fastDiff';
import HoodChatMessageBubble from '@/components/chat/HoodChatMessageBubble';

const STAFF_ROLES = new Set(['admin', 'superadmin', 'staff', 'coin_manager', 'financial_manager', 'support_admin']);

function isStaffUser(user) {
  return user && STAFF_ROLES.has(String(user.role || '').toLowerCase());
}

export default function HoodChatPageContent({ user, onOpenAuth }) {
  const staffViewer = isStaffUser(user);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const lastStaffCount = useRef(0);
  const fetchRef = useRef(null);

  const fetchMessages = async () => {
    if (!user) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) {
        diffSet(setMessages, data.messages);
        const staffCount = data.messages.filter((m) => m.senderRole === 'staff').length;
        if (staffCount > lastStaffCount.current && lastStaffCount.current > 0) {
          playTune('bell', 0.6);
        }
        lastStaffCount.current = staffCount;
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchRef.current = fetchMessages;
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [user?.email, user?.id]);

  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('hood_player_chat_sync');
      bc.onmessage = () => fetchRef.current?.();
    } catch {
      bc = null;
    }
    return () => bc?.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, attachedImage]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageFile(file, { maxSize: 1200, quality: 0.65, maxChars: 140000 });
      setAttachedImage(dataUrl);
    } catch (err) {
      alert(err?.message || 'Could not attach image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if ((!input.trim() && !attachedImage) || sending) return;
    if (!user) {
      onOpenAuth?.('login');
      return;
    }

    const textToSend = input.trim();
    const imageToSend = attachedImage;
    setInput('');
    setAttachedImage(null);
    setSendError(null);
    setSending(true);
    playTune('click');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, imageUrl: imageToSend }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send');
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      playTune('coin', 0.5);
      fetchMessages();
    } catch (err) {
      setInput(textToSend);
      setAttachedImage(imageToSend);
      setSendError(err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    'I need help with a deposit',
    'Where is my cashout?',
    'Request game login credentials',
    'Speak to VIP host',
  ];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-[#2cb64e]/35 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/40 text-[#2cb64e] text-[10px] font-black uppercase">
              <Headphones size={14} />
              <span>24/7 Live Concierge</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-white">Hood Games Support Chat</h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Message our desk for deposits, cashouts, game IDs, or send payment screenshots — staff replies here in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
            <ShieldCheck size={14} />
            Encrypted VIP channel
          </div>
        </div>
      </div>

      {!user ? (
        <div className="rounded-3xl border border-[#1a3363] bg-[#09142a] p-8 text-center space-y-4">
          <Sparkles className="mx-auto text-[#2cb64e]" size={32} />
          <p className="text-sm text-gray-300">Sign in to start a secure chat with Hood Games support.</p>
          <button type="button" onClick={() => onOpenAuth?.('login')} className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase">
            Sign In to Chat
          </button>
        </div>
      ) : staffViewer ? (
        <div className="rounded-3xl border-2 border-amber-500/40 bg-[#09142a] p-8 text-center space-y-4 max-w-xl mx-auto">
          <Headphones className="mx-auto text-amber-400" size={36} />
          <h2 className="font-heading text-lg font-black text-white">Admin / Staff Account Detected</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Player chat is for customers only. To reply to players with text and image attachments, use the{' '}
            <strong>Admin Support desk</strong> — pick a thread, then send messages and screenshots there.
          </p>
          <Link
            href="/admin"
            className="inline-flex btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
          >
            Open Admin Support Desk
          </Link>
          <p className="text-[10px] text-gray-500">
            Tip: keep player login in another tab if you need to test the player chat experience.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
          <div className="lg:col-span-4 rounded-3xl border border-[#1a3363] bg-[#09142a] p-5 space-y-4 hidden lg:block">
            <h3 className="text-xs font-black uppercase text-gray-300 tracking-wider">Quick topics</h3>
            <div className="space-y-2">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInput(q);
                    playTune('click');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] hover:border-[#2cb64e]/40 text-xs font-semibold text-gray-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Tip: attach Cash App / Zelle screenshots with the paperclip button so we can approve deposits faster.
            </p>
          </div>

          <div className="lg:col-span-8 rounded-3xl border-2 border-[#1a3363] bg-[#09142a] flex flex-col overflow-hidden min-h-[480px] shadow-2xl">
            <div className="p-4 bg-[#0c1b38] border-b border-[#1a3363] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
                  <Headphones size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Concierge Desk</p>
                  <p className="text-[10px] text-gray-400">Logged in as {user.username} (player)</p>
                </div>
              </div>
              <button type="button" onClick={() => fetchMessages()} className="p-2 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-400 hover:text-white" title="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d1e]/80">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2 py-12">
                  <ImageIcon size={28} className="text-[#2cb64e]" />
                  <p className="text-sm font-bold text-gray-200">No messages yet</p>
                  <p className="text-xs max-w-xs">Say hello or send a payment screenshot — our team monitors this channel 24/7.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <HoodChatMessageBubble
                    key={m._id || idx}
                    message={m}
                    isMine={m.senderRole === 'player' || m.username === user.username}
                    onPreviewImage={setPreviewImage}
                  />
                ))
              )}
            </div>

            {attachedImage && (
              <div className="px-4 py-2 border-t border-[#1a3363] bg-[#0c1b38] flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage} alt="Attachment preview" className="h-16 w-16 rounded-lg object-cover border border-[#2cb64e]/40" />
                <span className="text-[10px] text-gray-400 flex-1">Image ready to send</span>
                <button type="button" onClick={() => setAttachedImage(null)} className="p-1.5 rounded-lg bg-[#070d1e] text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}

            {sendError ? <p className="px-4 text-[11px] text-rose-400 font-bold">{sendError}</p> : null}

            <form onSubmit={handleSend} className="p-3 bg-[#0c1b38] border-t border-[#1a3363] flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button
                type="button"
                disabled={uploadingImage || sending}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-300 hover:text-[#2cb64e] shrink-0"
                title="Attach image"
              >
                {uploadingImage ? <RefreshCw size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                className="hood-input flex-1 px-3 py-2.5 rounded-xl text-xs min-h-[42px] max-h-28 resize-y"
                placeholder="Type message or attach payment proof..."
              />
              <button
                type="submit"
                disabled={sending || (!input.trim() && !attachedImage)}
                className="btn-hood-green p-2.5 rounded-xl text-white disabled:opacity-50 shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {previewImage ? (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage} alt="Full size" className="max-w-full max-h-[90vh] rounded-2xl border border-[#1a3363]" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white" onClick={() => setPreviewImage(null)}>
            <X size={20} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
