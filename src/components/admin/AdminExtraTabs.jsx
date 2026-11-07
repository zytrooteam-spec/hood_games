'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Search, RefreshCw, Check, Power, Megaphone, Gift, Link2, DollarSign } from 'lucide-react';
import AdminImageField from './AdminImageField';
import { diffSet } from '@/lib/fastDiff';
import { playTune } from '@/lib/soundAlerts';
import { hoodAlert, hoodConfirm } from '@/lib/hoodAlert';

/* ------------------------------------------------------------------ */
/* Shared UI helpers                                                   */
/* ------------------------------------------------------------------ */
const inputCls = 'hood-input w-full px-3 py-2.5 rounded-xl text-xs font-semibold';
const cardCls = 'rounded-2xl border border-[#1a3363] bg-[#09142a]';

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const cls =
    ['approved', 'completed', 'credited', 'active'].includes(s)
      ? 'bg-emerald-500/20 text-emerald-300'
      : ['rejected', 'banned', 'inactive'].includes(s)
      ? 'bg-rose-500/20 text-rose-300'
      : 'bg-amber-500/20 text-amber-300';
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>{status}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#09142a] border-2 border-[#1a3363] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a3363] pb-3">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-300 block mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. GAMES LIBRARY                                                    */
/* ------------------------------------------------------------------ */
const EMPTY_GAME = { title: '', platform: '', category: 'slots', playUrl: '', image: '', badge: 'NEW', description: '', priority: 10, active: true };

export function GamesLibraryTab() {
  const [games, setGames] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/games?all=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setGames, d.games || []))
      .catch(() => {});
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...editing, priority: Number(editing.priority || 10), active: !!editing.active, isActive: !!editing.active };
      const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok || !d.success) return hoodAlert.error(d.error || 'Failed to save game (image may be too large — try a smaller file)', 'Save failed');
      playTune('coin');
      setEditing(null);
      load();
    } finally { setSaving(false); }
  };

  const toggle = async (g) => {
    await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: g._id, active: g.active === false, isActive: g.active === false }) });
    load();
  };

  const remove = async (g) => {
    const ok = await hoodConfirm({
      title: 'Delete game platform',
      message: `Delete "${g.title}" permanently? Players will no longer see this game.`,
      confirmLabel: 'Delete permanently',
      cancelLabel: 'Keep game',
    });
    if (!ok) return;
    await fetch(`/api/games?id=${g._id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-black text-white">Games Library ({games.length})</h3>
        <button onClick={() => setEditing({ ...EMPTY_GAME })} className="btn-hood-green px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 self-start">
          <Plus size={14} /> Add Game Platform
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {games.map((g) => (
          <div key={g._id} className={`${cardCls} p-4 flex gap-3 ${g.active === false ? 'opacity-50' : ''}`}>
            <div className="w-14 h-14 rounded-xl bg-[#070d1e] border border-[#1a3363] overflow-hidden shrink-0 flex items-center justify-center">
              {g.image ? <img src={g.image} alt={g.title} className="w-full h-full object-cover" /> : <span className="text-[#2cb64e] font-black">{g.title?.[0]}</span>}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white truncate">{g.title}</h4>
                {g.badge && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">{g.badge}</span>}
              </div>
              <p className="text-[10px] text-gray-400 truncate">{g.category} • {g.playUrl || 'no URL'}</p>
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => setEditing({ ...EMPTY_GAME, ...g })} className="px-2 py-1 rounded bg-[#0e2042] text-gray-200 text-[10px] font-bold flex items-center gap-1"><Edit2 size={10} />Edit</button>
                <button onClick={() => toggle(g)} className="px-2 py-1 rounded bg-[#0e2042] text-gray-200 text-[10px] font-bold flex items-center gap-1"><Power size={10} />{g.active === false ? 'Enable' : 'Disable'}</button>
                <button onClick={() => remove(g)} className="px-2 py-1 rounded bg-rose-950/50 text-rose-300 text-[10px] font-bold flex items-center gap-1"><Trash2 size={10} />Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.title}` : 'Add Game Platform'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title"><input required className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, platform: e.target.value })} /></Field>
              <Field label="Category">
                <select className={inputCls} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {['slots', 'fish', 'table', 'keno', 'arcade'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Play URL"><input className={inputCls} value={editing.playUrl} onChange={(e) => setEditing({ ...editing, playUrl: e.target.value })} placeholder="https://..." /></Field>
              <div className="sm:col-span-2">
                <AdminImageField
                  label="Cover Image"
                  value={editing.image}
                  onChange={(v) => setEditing({ ...editing, image: v })}
                  hint="Upload cover art or use /images/your-game.svg"
                  maxSize={500}
                  quality={0.85}
                />
              </div>
              <Field label="Badge"><input className={inputCls} value={editing.badge} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} /></Field>
              <Field label="Sort Priority"><input type="number" className={inputCls} value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea rows={2} className={inputCls} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#2cb64e]" /> Visible to players
            </label>
            <button disabled={saving} className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase">{saving ? 'Saving...' : 'Save Game'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. PAYMENT GATEWAYS                                                 */
/* ------------------------------------------------------------------ */
const EMPTY_GATEWAY = { name: '', tag: '', instructions: '', badge: 'INSTANT', minDeposit: 10, maxDeposit: 5000, minWithdrawal: 25, maxWithdrawal: 5000, active: true };

export function GatewaysTab() {
  const [methods, setMethods] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    fetch('/api/payments/methods').then((r) => r.json()).then((d) => d?.success && diffSet(setMethods, d.methods || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/payments/methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    const d = await res.json();
    if (!d.success) return hoodAlert.error(d.error || 'Failed', 'Gateway save failed');
    playTune('coin');
    setEditing(null);
    load();
  };

  const remove = async (m) => {
    const ok = await hoodConfirm({
      title: 'Remove payment gateway',
      message: `Remove ${m.name}? Deposits using this method may stop working until you add it again.`,
      confirmLabel: 'Remove gateway',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;
    await fetch(`/api/payments/methods?id=${m._id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-black text-white">Payment Gateways ({methods.length})</h3>
        <button onClick={() => setEditing({ ...EMPTY_GATEWAY })} className="btn-hood-green px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 self-start"><Plus size={14} /> Add Gateway</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {methods.map((m) => (
          <div key={m._id} className={`${cardCls} p-4 space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-white">{m.name}</h4>
                <p className="text-xs font-mono text-cyan-300 select-all">{m.tag}</p>
              </div>
              <StatusBadge status={m.active === false ? 'inactive' : 'active'} />
            </div>
            <p className="text-[11px] text-gray-400">{m.instructions}</p>
            <p className="text-[10px] text-gray-500 font-mono">Deposit ${m.minDeposit}–${m.maxDeposit} • Cashout ${m.minWithdrawal}–${m.maxWithdrawal}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setEditing({ ...EMPTY_GATEWAY, ...m })} className="px-2 py-1 rounded bg-[#0e2042] text-gray-200 text-[10px] font-bold flex items-center gap-1"><Edit2 size={10} />Edit</button>
              <button onClick={() => remove(m)} className="px-2 py-1 rounded bg-rose-950/50 text-rose-300 text-[10px] font-bold flex items-center gap-1"><Trash2 size={10} />Remove</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.name}` : 'Add Gateway'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name"><input required className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Cash App" /></Field>
              <Field label="Tag / Address"><input required className={inputCls} value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="$HoodGamesHQ" /></Field>
              <Field label="Min Deposit"><input type="number" className={inputCls} value={editing.minDeposit} onChange={(e) => setEditing({ ...editing, minDeposit: e.target.value })} /></Field>
              <Field label="Max Deposit"><input type="number" className={inputCls} value={editing.maxDeposit} onChange={(e) => setEditing({ ...editing, maxDeposit: e.target.value })} /></Field>
              <Field label="Min Cashout"><input type="number" className={inputCls} value={editing.minWithdrawal} onChange={(e) => setEditing({ ...editing, minWithdrawal: e.target.value })} /></Field>
              <Field label="Max Cashout"><input type="number" className={inputCls} value={editing.maxWithdrawal} onChange={(e) => setEditing({ ...editing, maxWithdrawal: e.target.value })} /></Field>
            </div>
            <Field label="Badge"><input className={inputCls} value={editing.badge} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} /></Field>
            <Field label="Player Instructions"><textarea rows={2} className={inputCls} value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#2cb64e]" /> Active in cashier
            </label>
            <button className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase">Save Gateway</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. GAME CREDIT LOADS (Coin Allotment queue)                         */
/* ------------------------------------------------------------------ */
export function GameLoadsTab() {
  const [transfers, setTransfers] = useState([]);
  const load = useCallback(() => {
    fetch('/api/coins/allotment').then((r) => r.json()).then((d) => d?.success && diffSet(setTransfers, d.transfers || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  const act = async (id, action, transfer) => {
    if (action === 'reject') {
      const ok = await hoodConfirm({
        title: 'Reject & refund load?',
        message: `Refund $${Number(transfer?.amount || 0).toFixed(2)} SC to ${transfer?.username || 'player'}'s wallet?`,
        confirmLabel: 'Reject & refund',
        cancelLabel: 'Keep pending',
        variant: 'warning',
      });
      if (!ok) return;
    } else {
      const ok = await hoodConfirm({
        title: 'Mark credits loaded?',
        message: `Confirm $${Number(transfer?.amount || 0).toFixed(2)} was loaded into ${transfer?.gameTitle || 'game'} for ${transfer?.username || 'player'}.`,
        confirmLabel: 'Yes, loaded',
        cancelLabel: 'Cancel',
        variant: 'success',
      });
      if (!ok) return;
    }

    const res = await fetch('/api/coins/allotment', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    const d = await res.json();
    if (!d.success) hoodAlert.error(d.error || 'Failed', 'Load request failed');
    else {
      playTune(action === 'complete' ? 'coin' : 'click');
      hoodAlert.success(action === 'complete' ? 'Load marked complete' : 'Load rejected & refunded');
    }
    load();
  };

  return (
    <div className="space-y-4 pt-6">
      <h3 className="text-base font-black text-white">Game Credit Load Queue ({transfers.filter((t) => t.status === 'pending').length} pending)</h3>
      <div className={`overflow-x-auto ${cardCls}`}>
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
            <tr><th className="p-3">Player</th><th className="p-3">Game</th><th className="p-3">Amount</th><th className="p-3">Requested</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[#1a3363]">
            {transfers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No load requests yet.</td></tr>}
            {transfers.map((t) => (
              <tr key={t._id} className="hover:bg-[#0e2042]/50">
                <td className="p-3 font-bold text-white">{t.username}</td>
                <td className="p-3 text-[#2cb64e] font-bold">{t.gameTitle}</td>
                <td className="p-3 font-mono">${Number(t.amount).toFixed(2)}</td>
                <td className="p-3 text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3"><StatusBadge status={t.status} /></td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  {t.status === 'pending' && (
                    <>
                      <button onClick={() => act(t._id, 'complete', t)} className="px-2.5 py-1 rounded bg-[#2cb64e] text-white font-bold text-[10px]"><Check size={10} className="inline" /> Loaded</button>
                      <button onClick={() => act(t._id, 'reject', t)} className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px]">Reject & Refund</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. LEDGER / TX SEARCH                                               */
/* ------------------------------------------------------------------ */
export function LedgerTab() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ deposits: 0, redemptions: 0, bonuses: 0 });
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/ledger?q=${encodeURIComponent(q)}&type=${type}`)
      .then((r) => r.json())
      .then((d) => { if (d?.success) { diffSet(setRows, d.rows); diffSet(setTotals, d.totals); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, type]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const exportCsv = () => {
    const head = 'id,type,username,amount,method,status,reference,createdAt';
    const body = rows.map((r) => [r.id, r.type, r.username, r.amount, r.method, r.status, r.reference, r.createdAt].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hood-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Approved Deposits', totals.deposits, 'text-[#2cb64e]'], ['Approved Cashouts', totals.redemptions, 'text-blue-300'], ['Bonuses Paid', totals.bonuses, 'text-amber-300']].map(([l, v, c]) => (
          <div key={l} className={`${cardCls} p-4`}>
            <span className="text-[10px] uppercase font-bold text-gray-400">{l}</span>
            <p className={`text-xl font-black font-mono ${c}`}>${Number(v).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by player, TX id, tag, method..." className={`${inputCls} pl-9`} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} sm:w-44`}>
          <option value="all">All types</option>
          <option value="deposit">Deposits</option>
          <option value="redemption">Redemptions</option>
          <option value="cashback">Cashback</option>
          <option value="free_spin">Free Spins</option>
          <option value="game_load">Game Loads</option>
        </select>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0e2042] border border-[#1a3363] text-gray-300 text-xs font-bold flex items-center gap-1 justify-center"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh</button>
        <button onClick={exportCsv} className="btn-hood-green px-3 py-2 rounded-xl text-xs font-black">Export CSV</button>
      </div>

      <div className={`overflow-x-auto ${cardCls}`}>
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
            <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Player</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-[#1a3363]">
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No transactions found.</td></tr>}
            {rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} className="hover:bg-[#0e2042]/50">
                <td className="p-3 text-gray-400 whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                <td className="p-3 uppercase text-[10px] font-black text-gray-300">{r.type.replace('_', ' ')}</td>
                <td className="p-3 font-bold text-white">{r.username}</td>
                <td className={`p-3 font-mono font-black ${r.direction === 'in' ? 'text-[#2cb64e]' : r.direction === 'out' ? 'text-blue-300' : 'text-amber-300'}`}>
                  {r.direction === 'out' ? '-' : '+'}${r.amount.toFixed(2)}
                </td>
                <td className="p-3 text-gray-300">{r.method}</td>
                <td className="p-3 font-mono text-gray-400 truncate max-w-[160px]">{r.reference}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. STAFF MANAGEMENT                                                 */
/* ------------------------------------------------------------------ */
export function StaffTab({ currentUser }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/staff').then((r) => r.json()).then((d) => d?.success && diffSet(setStaff, d.staff || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!d.success) return hoodAlert.error(d.error || 'Failed', 'Staff create failed');
      playTune('coin');
      setForm({ username: '', email: '', password: '', role: 'staff' });
      load();
    } finally { setSaving(false); }
  };

  const remove = async (s) => {
    const ok = await hoodConfirm({
      title: 'Revoke staff access',
      message: `Revoke access for ${s.username}? They will be logged out and cannot open the admin desk.`,
      confirmLabel: 'Revoke access',
      cancelLabel: 'Keep staff',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/staff?id=${s._id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!d.success) hoodAlert.error(d.error, 'Revoke failed');
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-6">
      <form onSubmit={create} className={`${cardCls} p-5 space-y-3 lg:col-span-4 h-fit`}>
        <h3 className="text-sm font-black text-white">Create Staff Account</h3>
        <p className="text-[11px] text-gray-400">Staff can only be created here — there is no public admin registration.</p>
        <Field label="Username"><input required className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input required minLength={6} type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role">
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff (finance, chat, requests)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </Field>
        <button disabled={saving} className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase">{saving ? 'Creating...' : 'Create Account'}</button>
      </form>

      <div className={`overflow-x-auto ${cardCls} lg:col-span-8`}>
        <table className="w-full text-left text-xs min-w-[520px]">
          <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
            <tr><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[#1a3363]">
            {staff.map((s) => (
              <tr key={s._id} className="hover:bg-[#0e2042]/50">
                <td className="p-3 font-bold text-white">{s.username}</td>
                <td className="p-3 text-gray-300">{s.email}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-[#2cb64e]/20 text-[#2cb64e] text-[10px] font-black uppercase">{s.role}</span></td>
                <td className="p-3 text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                <td className="p-3 text-right">
                  {String(s._id) !== String(currentUser?.id) && (
                    <button onClick={() => remove(s)} className="px-2 py-1 rounded bg-rose-950/50 text-rose-300 text-[10px] font-bold inline-flex items-center gap-1"><Trash2 size={10} />Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. PROMOTIONS & PUSH BROADCAST                                     */
/* ------------------------------------------------------------------ */
const EMPTY_PROMO = { title: '', badge: 'HOT', description: '', matchPercent: 50, category: 'bonus', active: true, priority: 10 };

export function PromosTab() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushDispatching, setPushDispatching] = useState(false);

  const load = useCallback(() => {
    fetch('/api/promotions?admin=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setPromos, d.promotions || []))
      .catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const createPromo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/promotions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!d.success) return hoodAlert.error(d.error || 'Failed', 'Promotion');
      hoodAlert.success('Promotion saved', 'Promos');
      setForm(EMPTY_PROMO);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    await fetch('/api/promotions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p._id, active: !p.active }) });
    load();
  };

  const remove = async (id) => {
    const ok = await hoodConfirm({ title: 'Delete promotion?', message: 'Players will no longer see this promo banner.', confirmLabel: 'Delete' });
    if (!ok) return;
    await fetch('/api/promotions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  const dispatchPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushDispatching(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: pushTitle.trim(), message: pushBody.trim(), channel: 'push', target: 'all' }),
      });
      const d = await res.json();
      if (d.success) {
        hoodAlert.success(d.message || 'Push sent', 'Broadcast');
        setPushTitle('');
        setPushBody('');
      } else hoodAlert.error(d.error || 'Push failed');
    } finally {
      setPushDispatching(false);
    }
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={createPromo} className={`${cardCls} p-5 space-y-3`}>
          <h3 className="text-sm font-black text-white flex items-center gap-2"><Gift size={16} className="text-[#2cb64e]" /> Create site promotion</h3>
          <Field label="Title"><input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Badge"><input className={inputCls} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} /></Field>
          <Field label="Description"><textarea required className={`${inputCls} min-h-[80px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Match %"><input type="number" className={inputCls} value={form.matchPercent} onChange={(e) => setForm({ ...form, matchPercent: Number(e.target.value) })} /></Field>
            <Field label="Priority"><input type="number" className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></Field>
          </div>
          <button disabled={saving} className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase">{saving ? 'Saving...' : 'Publish promotion'}</button>
        </form>

        <div className={`${cardCls} p-5 space-y-3`}>
          <h3 className="text-sm font-black text-white flex items-center gap-2"><Megaphone size={16} className="text-amber-300" /> Player push broadcast</h3>
          <p className="text-[10px] text-gray-500">All subscribed APK / browser devices (same flow as Players Paradise).</p>
          <input className={inputCls} placeholder="Push title" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
          <textarea className={`${inputCls} min-h-[72px]`} placeholder="Push message" value={pushBody} onChange={(e) => setPushBody(e.target.value)} />
          <button type="button" disabled={pushDispatching} onClick={dispatchPush} className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase">
            {pushDispatching ? 'Sending...' : 'Send push to all players'}
          </button>
        </div>
      </div>

      <div className={`overflow-x-auto ${cardCls}`}>
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
            <tr><th className="p-3">Title</th><th className="p-3">Badge</th><th className="p-3">Match</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[#1a3363]">
            {promos.map((p) => (
              <tr key={p._id} className="hover:bg-[#0e2042]/50">
                <td className="p-3 font-bold text-white">{p.title}<p className="text-gray-500 font-normal mt-0.5 max-w-xs truncate">{p.description}</p></td>
                <td className="p-3 text-amber-300 font-bold">{p.badge}</td>
                <td className="p-3 font-mono">{p.matchPercent}%</td>
                <td className="p-3"><StatusBadge status={p.active ? 'active' : 'inactive'} /></td>
                <td className="p-3 text-right space-x-1">
                  <button type="button" onClick={() => toggleActive(p)} className="px-2 py-1 rounded bg-[#070d1e] border border-[#1a3363] text-[10px] font-bold"><Power size={10} className="inline" /> Toggle</button>
                  <button type="button" onClick={() => remove(p._id)} className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 text-[10px] font-bold"><Trash2 size={10} className="inline" /> Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. AFFILIATES & COMMISSIONS                                        */
/* ------------------------------------------------------------------ */
export function AffiliatesTab() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ partners: 0, unpaid: 0, earned: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/affiliates?mode=admin', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          diffSet(setRows, d.affiliates || []);
          setTotals(d.totals || { partners: 0, unpaid: 0, earned: 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const payout = async (userId, username, amount) => {
    const ok = await hoodConfirm({
      title: 'Pay affiliate commission',
      message: `Pay $${Number(amount).toFixed(2)} SC unpaid commission to ${username}?`,
      confirmLabel: 'Pay to wallet',
    });
    if (!ok) return;
    const res = await fetch('/api/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action: 'payout' }) });
    const d = await res.json();
    if (d.success) hoodAlert.success(d.message, 'Affiliate');
    else hoodAlert.error(d.error || 'Payout failed');
    load();
  };

  return (
    <div className="space-y-4 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${cardCls} p-4`}><span className="text-[10px] text-gray-400 uppercase font-bold">Partners</span><p className="text-2xl font-black text-white font-mono">{totals.partners}</p></div>
        <div className={`${cardCls} p-4`}><span className="text-[10px] text-gray-400 uppercase font-bold">Unpaid SC</span><p className="text-2xl font-black text-amber-300 font-mono">${totals.unpaid?.toFixed?.(2) ?? Number(totals.unpaid || 0).toFixed(2)}</p></div>
        <div className={`${cardCls} p-4`}><span className="text-[10px] text-gray-400 uppercase font-bold">Lifetime earned</span><p className="text-2xl font-black text-[#2cb64e] font-mono">${totals.earned?.toFixed?.(2) ?? Number(totals.earned || 0).toFixed(2)}</p></div>
      </div>

      <h3 className="text-sm font-black text-white flex items-center gap-2"><Link2 size={16} className="text-[#2cb64e]" /> Affiliate partners</h3>
      {loading ? <p className="text-xs text-gray-500">Loading affiliates...</p> : (
        <div className={`overflow-x-auto ${cardCls}`}>
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
              <tr>
                <th className="p-3">Partner</th>
                <th className="p-3">Code</th>
                <th className="p-3">Referrals</th>
                <th className="p-3">Deposits gen.</th>
                <th className="p-3">Unpaid</th>
                <th className="p-3">Earned</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a3363]">
              {rows.map((a) => (
                <tr key={a.userId} className="hover:bg-[#0e2042]/50">
                  <td className="p-3 font-bold text-white">{a.username}<p className="text-gray-500 font-normal">{a.email}</p></td>
                  <td className="p-3 font-mono text-[#2cb64e]">{a.referralCode}</td>
                  <td className="p-3">{a.totalReferrals}</td>
                  <td className="p-3 font-mono">${Number(a.totalDepositsGenerated || 0).toFixed(2)}</td>
                  <td className="p-3 font-mono text-amber-300">${Number(a.commissionsUnpaid || 0).toFixed(2)}</td>
                  <td className="p-3 font-mono">${Number(a.commissionsEarned || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {a.commissionsUnpaid > 0 && (
                      <button type="button" onClick={() => payout(a.userId, a.username, a.commissionsUnpaid)} className="btn-hood-green px-3 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1"><DollarSign size={10} /> Pay wallet</button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">No affiliate activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
