'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Copy,
  Plus,
  Minus,
  Key,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Users,
  Gamepad2,
  History,
  Sparkles,
  Eye,
  MessageSquare,
  Send,
} from 'lucide-react';
import { hoodAlert } from '@/lib/hoodAlert';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
  { id: 'withdrawals', label: 'Cashouts', icon: ArrowUpRight },
  { id: 'games', label: 'Game IDs', icon: Gamepad2 },
  { id: 'referrals', label: 'Referrals', icon: Users },
  { id: 'ledger', label: 'Ledger', icon: History },
];

export default function Player360ProfileModal({ userId, onClose, onUserUpdated, onOpenChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [copiedField, setCopiedField] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
      const d = await res.json();
      if (d.success) setData(d);
      else hoodAlert.error(d.error || 'Failed to load profile');
    } catch {
      hoodAlert.error('Network error loading profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const copyText = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const staffPut = async (body) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user.id, ...body }),
    });
    return res.json();
  };

  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    const val = parseFloat(adjustAmount);
    if (!Number.isFinite(val) || val <= 0) {
      hoodAlert.error('Enter a valid amount');
      return;
    }
    setIsAdjusting(true);
    const finalAmount = adjustMode === 'deduct' ? -val : val;
    const d = await staffPut({
      action: 'adjustBalance',
      balanceAdjustment: finalAmount,
      reason: adjustReason.trim() || (adjustMode === 'add' ? 'Manual credit' : 'Manual debit'),
    });
    setIsAdjusting(false);
    if (d.success) {
      hoodAlert.success(d.message || 'Balance updated');
      setAdjustAmount('');
      onUserUpdated?.(data.user.id, d.newBalance);
      fetchProfile();
    } else hoodAlert.error(d.error || 'Update failed');
  };

  const handleResetPassword = async () => {
    const newPass = prompt(`New password for ${data?.user?.username} (min 6 chars):`);
    if (!newPass) return;
    const d = await staffPut({ action: 'resetPassword', newPassword: newPass });
    if (d.success) hoodAlert.success(d.message);
    else hoodAlert.error(d.error);
  };

  const handleUnbindDevice = async () => {
    if (!window.confirm('Clear device lock for this player?')) return;
    const d = await staffPut({ action: 'resetDevice' });
    if (d.success) {
      hoodAlert.success(d.message);
      fetchProfile();
    } else hoodAlert.error(d.error);
  };

  const handleToggleBan = async () => {
    const next = data?.user?.isBanned ? 'unban' : 'ban';
    if (!window.confirm(`${next} player ${data?.user?.username}?`)) return;
    const d = await staffPut({ action: 'toggleBan', reason: next === 'ban' ? 'Staff action' : 'Cleared' });
    if (d.success) {
      hoodAlert.success(d.message);
      fetchProfile();
      onUserUpdated?.(data.user.id);
    } else hoodAlert.error(d.error);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = messageText.trim();
    if (!text || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId: data.user.id }),
      });
      const rd = await res.json();
      if (rd.success) {
        hoodAlert.success('Message sent');
        setMessageText('');
        setMessageOpen(false);
      } else hoodAlert.error(rd.error || 'Send failed');
    } catch {
      hoodAlert.error('Network error');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!userId) return null;

  const u = data?.user;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-[#030711]/90 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-[#2cb64e]/35 bg-[#070d1e] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-[#1a3363] bg-[#0c1b38]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#2cb64e]/15 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e] font-black shrink-0">
              {u?.username?.substring(0, 2).toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white truncate">{u?.username || 'Player 360°'}</h2>
                {u?.isBanned ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    BANNED
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {u?.email}
                {u?.referralCode ? ` · Ref: ${u.referralCode}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMessageOpen(true)}
              className="btn-hood-green px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1"
            >
              <MessageSquare size={13} /> Message
            </button>
            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChat(u);
                }}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold border border-[#1a3363] text-gray-300 hover:text-white flex items-center gap-1"
              >
                <ArrowUpRight size={13} /> Chat desk
              </button>
            )}
            <button type="button" onClick={fetchProfile} className="p-2 rounded-xl border border-[#1a3363] text-gray-400 hover:text-white">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl border border-[#1a3363] text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Balance bar */}
        {u && (
          <div className="grid sm:grid-cols-2 gap-3 p-4 border-b border-[#1a3363] bg-[#09142a]">
            <div className="p-4 rounded-xl border border-[#2cb64e]/35 bg-[#070d1e]">
              <div className="text-[10px] font-black uppercase text-[#2cb64e] flex items-center gap-1">
                <Wallet size={12} /> SC Balance
              </div>
              <div className="text-3xl font-black font-mono text-[#2cb64e] mt-1">
                ${Number(u.balanceSC || 0).toFixed(2)} <span className="text-sm">SC</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">GC: {Number(u.balanceGC || 0).toLocaleString()}</div>
            </div>
            <form onSubmit={handleApplyAdjustment} className="p-4 rounded-xl border border-[#1a3363] bg-[#070d1e] space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${adjustMode === 'add' ? 'bg-[#2cb64e] text-black' : 'bg-[#0c1b38] text-gray-400'}`}
                >
                  <Plus size={11} className="inline" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('deduct')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${adjustMode === 'deduct' ? 'bg-rose-500 text-white' : 'bg-[#0c1b38] text-gray-400'}`}
                >
                  <Minus size={11} className="inline" /> Deduct
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount SC"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="hood-input flex-1 min-w-[100px] font-mono text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="hood-input flex-[2] min-w-[140px] text-sm"
                />
                <button type="submit" disabled={isAdjusting} className="btn-hood-green px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                  {isAdjusting ? '…' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto px-3 border-b border-[#1a3363] bg-[#070d1e]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === 'deposits'
                ? data?.deposits?.length
                : tab.id === 'withdrawals'
                  ? data?.withdrawals?.length
                  : tab.id === 'games'
                    ? data?.gameAccounts?.length
                    : tab.id === 'referrals'
                      ? data?.referrals?.length
                      : tab.id === 'ledger'
                        ? data?.ledger?.length
                        : null;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`shrink-0 px-3 py-3 text-[10px] font-black uppercase flex items-center gap-1 border-b-2 ${
                  active ? 'border-[#2cb64e] text-[#2cb64e]' : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={12} />
                {tab.label}
                {count != null && (
                  <span className="ml-1 px-1.5 rounded-full bg-[#0c1b38] text-[9px]">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#070d1e]">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-sm font-bold uppercase">Loading player 360°…</div>
          ) : !data ? (
            <div className="py-12 text-center text-gray-500">No data</div>
          ) : (
            <>
              {activeSubTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      ['Total Deposited', data.stats?.totalDepositsAmount, 'emerald'],
                      ['Total Cashed Out', data.stats?.totalWithdrawalsAmount, 'cyan'],
                      ['Net Margin', data.stats?.netMargin, 'white'],
                      ['Referrals', data.stats?.referralsCount, 'amber'],
                    ].map(([label, val, tone]) => {
                      const valueClass =
                        tone === 'emerald'
                          ? 'text-[#2cb64e]'
                          : tone === 'cyan'
                            ? 'text-cyan-300'
                            : tone === 'amber'
                              ? 'text-amber-300'
                              : 'text-white';
                      return (
                        <div key={label} className="p-3 rounded-xl border border-[#1a3363] bg-[#09142a]">
                          <div className="text-[10px] font-black uppercase text-gray-500">{label}</div>
                          <div className={`text-xl font-black font-mono mt-1 ${valueClass}`}>
                            {typeof val === 'number' && label !== 'Referrals' ? `$${Number(val).toFixed(2)}` : val ?? 0}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 rounded-xl border border-[#1a3363] bg-[#09142a] space-y-2 text-xs">
                    <h4 className="font-black text-[#2cb64e] uppercase text-[10px] flex items-center gap-1">
                      <ShieldCheck size={13} /> Security
                    </h4>
                    <div className="flex justify-between text-gray-400">
                      <span>Player ID</span>
                      <span className="font-mono text-white flex items-center gap-1">
                        {u.id}
                        <button type="button" onClick={() => copyText(u.id, 'id')} className="text-[#2cb64e]">
                          <Copy size={11} />
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Device</span>
                      <span className="font-mono text-white">{u.deviceId ? `${String(u.deviceId).slice(0, 18)}…` : 'Unbound'}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Referred by</span>
                      <span className="text-white">{u.referredBy || '—'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1a3363]">
                      <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Key size={11} /> Reset password
                      </button>
                      {u.deviceId && (
                        <button type="button" onClick={handleUnbindDevice} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Smartphone size={11} /> Unbind device
                        </button>
                      )}
                      <button type="button" onClick={handleToggleBan} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <ShieldCheck size={11} /> {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'deposits' && (
                <ProfileTable
                  empty="No deposits"
                  rows={data.deposits}
                  cols={['amount', 'methodName', 'status', 'createdAt']}
                  proofKey="hasProof"
                  proofApi={(id) => `/api/payments/deposit/proof?id=${id}`}
                />
              )}
              {activeSubTab === 'withdrawals' && (
                <ProfileTable
                  empty="No cashouts"
                  rows={data.withdrawals}
                  cols={['amount', 'gameTitle', 'payoutMethod', 'status', 'createdAt']}
                />
              )}
              {activeSubTab === 'games' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(data.gameAccounts || []).length === 0 ? (
                    <p className="text-gray-500 text-sm col-span-2">No game accounts yet.</p>
                  ) : (
                    data.gameAccounts.map((g) => (
                      <div key={g.id} className="p-3 rounded-xl border border-[#1a3363] bg-[#09142a]">
                        <div className="font-black text-white text-sm">{g.gameTitle}</div>
                        <div className="text-xs text-gray-400 mt-2 font-mono flex justify-between">
                          <span>User: {g.username}</span>
                          <button type="button" onClick={() => copyText(g.username, `u-${g.id}`)} className="text-[#2cb64e]">
                            {copiedField === `u-${g.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 font-mono flex justify-between">
                          <span>Pass: {g.password ? '••••••' : '—'}</span>
                          {g.password && (
                            <button type="button" onClick={() => copyText(g.password, `p-${g.id}`)} className="text-[#2cb64e]">
                              {copiedField === `p-${g.id}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeSubTab === 'referrals' && (
                <ProfileTable empty="No referrals" rows={data.referrals} cols={['username', 'email', 'balanceSC', 'createdAt']} />
              )}
              {activeSubTab === 'ledger' && (
                <ProfileTable empty="No ledger" rows={data.ledger} cols={['type', 'amount', 'balanceAfter', 'reason', 'processedBy', 'createdAt']} />
              )}
            </>
          )}
        </div>
      </div>

      {messageOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80" onClick={() => !sendingMessage && setMessageOpen(false)}>
          <form onSubmit={handleSendMessage} className="w-full max-w-md p-4 rounded-2xl border border-[#2cb64e]/40 bg-[#0c1b38] space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-white">Message @{u?.username}</h3>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              className="hood-input w-full text-sm"
              placeholder="Staff reply…"
              maxLength={2000}
            />
            <button type="submit" disabled={sendingMessage || !messageText.trim()} className="btn-hood-green w-full py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1">
              <Send size={14} /> {sendingMessage ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileTable({ rows = [], cols, empty, proofKey, proofApi }) {
  if (!rows.length) return <p className="text-gray-500 text-sm py-8 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1a3363]">
      <table className="w-full text-left text-xs min-w-[520px]">
        <thead className="bg-[#0c1b38] text-gray-400 uppercase text-[10px]">
          <tr>
            {cols.map((c) => (
              <th key={c} className="p-2">
                {c.replace(/([A-Z])/g, ' $1')}
              </th>
            ))}
            {proofKey && <th className="p-2">Proof</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a3363]">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#0e2042]/40">
              {cols.map((c) => (
                <td key={c} className="p-2 text-gray-200 font-mono">
                  {c === 'createdAt' && row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : c === 'amount' || c === 'balanceSC'
                      ? `$${Number(row[c] || 0).toFixed(2)}`
                      : String(row[c] ?? '—')}
                </td>
              ))}
              {proofKey && (
                <td className="p-2">
                  {row[proofKey] && proofApi ? (
                    <a
                      href={proofApi(row.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2cb64e] font-bold flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
