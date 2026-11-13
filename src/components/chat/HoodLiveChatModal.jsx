'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ShieldCheck, User, Headphones } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { playerApiFetch } from '@/lib/playerApiFetch';
import { diffSet } from '@/lib/fastDiff';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';
import { HOOD_POLL } from '@/lib/pollingConfig';
import { hoodSsePoll } from '@/lib/ssePollOptions';
import { REALTIME_TYPES } from '@/lib/realtimePublish';

export default function HoodLiveChatModal({
  isOpen,
  onClose,
  user,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const prevCount = useRef(0);

  const fetchMessages = () => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.messages)) {
          diffSet(setMessages, d.messages);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) {
      prevCount.current = 0;
      return;
    }
    fetchMessages();
    const stop = startSseBackedPoll(fetchMessages, hoodSsePoll(HOOD_POLL.CHAT));
    const onRt = (e) => {
      const ev = e?.detail;
      if (ev?.type === REALTIME_TYPES.CHAT_MESSAGE && ev.senderRole === 'staff') fetchMessages();
    };
    window.addEventListener('hood-realtime', onRt);
    return () => {
      stop();
      window.removeEventListener('hood-realtime', onRt);
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current && messages.length > prevCount.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      prevCount.current = messages.length;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const textToSend = input.trim();
    setInput('');
    setSending(true);
    playTune('click');

    try {
      const res = await playerApiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ text: textToSend }),
      });
      const data = await res.json();
      if (data?.success && data?.message) {
        setMessages((prev) => [...prev, data.message]);
        playTune('coin');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex items-center justify-center sm:block">
      <div className="w-full h-full sm:w-96 sm:h-[520px] rounded-3xl bg-[#09142a] border-2 border-[#1a3363] shadow-[0_15px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="p-4 bg-[#0c1b38] border-b border-[#1a3363] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
              <Headphones size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                Hood Concierge Desk
                <span className="w-2 h-2 rounded-full bg-[#2cb64e] animate-pulse" />
              </h4>
              <p className="text-[10px] text-gray-400">24/7 Live Agent Support</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages Body */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d1e]/80">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
              <MessageSquare size={28} className="text-[#2cb64e]" />
              <p className="text-xs font-bold text-gray-300">Welcome to Hood Games Concierge!</p>
              <p className="text-[11px]">Send a message to our live support desk for instant assistance with deposits, cashouts, or game credentials.</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMine = m.senderRole === 'player' || m.username === user?.username;
              return (
                <div
                  key={m._id || idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[9.5px] text-gray-500 mb-0.5 px-1">
                    {isMine ? 'You' : m.username || 'Staff'} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div
                    className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs font-medium ${
                      isMine
                        ? 'btn-hood-green text-white rounded-br-none'
                        : 'bg-[#12244c] text-gray-100 border border-[#1a3363] rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#0c1b38] border-t border-[#1a3363] flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="hood-input flex-1 px-3.5 py-2 rounded-xl text-xs"
            placeholder="Type your message..."
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-hood-green p-2.5 rounded-xl text-white disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
