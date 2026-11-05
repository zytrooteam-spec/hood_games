'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, CheckCheck, Clock } from 'lucide-react';
import { diffSet } from '@/lib/fastDiff';
import { playTune } from '@/lib/soundAlerts';

export default function HoodNotificationsModal({ isOpen, onClose, user, onAllRead }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        diffSet(setNotifs, data.notifications);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      onAllRead?.();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isOpen || !user) return;
    playTune('bell', 0.5);
    fetchNotifs();
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when modal opens only
  }, [isOpen, user?.email]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-16 sm:pt-20 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md max-h-[75vh] overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/35 shadow-[0_24px_70px_rgba(0,0,0,0.85)] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a3363]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#070d1e] border border-[#1a3363] flex items-center justify-center">
              <Bell size={18} className="text-[#2cb64e]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2cb64e]">VIP Inbox</p>
              <h3 className="font-heading text-sm font-black text-white">Your Notifications</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Loading alerts…</p>
          ) : notifs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No notifications yet.</p>
          ) : (
            notifs.map((n) => (
              <div
                key={n._id || n.id}
                className={`p-3 rounded-2xl border text-xs ${
                  n.read ? 'bg-[#070d1e]/60 border-[#1a3363] text-gray-400' : 'bg-[#0e2042] border-[#2cb64e]/40 text-gray-100'
                }`}
              >
                <p className="font-black text-white text-[13px]">{n.title}</p>
                <p className="mt-1 leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                  <Clock size={10} />
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                </div>
              </div>
            ))
          )}
        </div>

        {notifs.length > 0 && (
          <div className="p-3 border-t border-[#1a3363]">
            <button
              type="button"
              onClick={markAllRead}
              className="w-full py-2 rounded-xl bg-[#12244c] text-xs font-bold text-gray-200 flex items-center justify-center gap-1.5 hover:bg-[#1a3363]"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
