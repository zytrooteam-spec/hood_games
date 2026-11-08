'use client';

import React, { useState } from 'react';
import {
  Search,
  Key,
  Check,
  X,
  Copy,
  CheckCheck,
  Gamepad2,
  Clock,
  Coins,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';

const AccountRequestsView = React.memo(function AccountRequestsView({
  requests = [],
  filter = 'PENDING',
  onFilterChange,
  onOpenApproveModal,
  onApproveCoinLoad,
  onCancelRequest,
  onDismissRequest,
  onRefresh,
  isRefreshing = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'ACCOUNT_CREATION' | 'COIN_LOAD'
  const [copiedId, setCopiedId] = useState(null);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Strictly only show Game Account Creation requests here (Coin Loads belong strictly in Coins Allotment Desk)
  const allRequests = (requests || []).filter(
    (r) => r.requestType !== 'COIN_LOAD' && Number(r.transferAmount || 0) <= 0
  );

  const filtered = allRequests.filter((r) => {
    // Status filter
    const matchesFilter =
      filter === 'ALL' ? true : (r.status || '').toUpperCase() === filter.toUpperCase();
    
    // Search query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.gameTitle?.toLowerCase().includes(q) ||
      r.gameAccountUsername?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = allRequests.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length;
  const readyCount = allRequests.filter((r) => (r.status || '').toUpperCase() === 'READY').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRequests = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleFilterChangeWithReset = (newFilter) => {
    if (onFilterChange) onFilterChange(newFilter);
    setCurrentPage(1);
  };

  const handleTypeChangeWithReset = (newType) => {
    setTypeFilter(newType);
    setCurrentPage(1);
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
      {/* Top Filter & Search Bar */}
      <div
        className="p-5 sm:p-6 rounded-2xl flex flex-col gap-4 shadow-2xl"
        style={{
          backgroundColor: '#0E0A24',
          background: 'linear-gradient(135deg, #0E0A24 0%, #140E33 100%)',
          border: '1px solid rgba(0, 240, 255, 0.28)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 240, 255, 0.1)',
        }}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-xl w-full lg:w-auto overflow-x-auto"
            style={{
              backgroundColor: '#070514',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { key: 'PENDING', label: 'Pending', count: pendingCount, color: '#F59E0B' },
              { key: 'READY', label: 'Ready', count: readyCount, color: '#10B981' },
              { key: 'ALL', label: 'All Requests', count: allRequests.length, color: '#00F0FF' },
            ].map(({ key, label, count, color }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFilterChangeWithReset(key)}
                  className="px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
                  style={
                    isActive
                      ? {
                          backgroundColor: color,
                          color: key === 'READY' ? '#FFFFFF' : '#070514',
                          boxShadow: `0 0 16px ${color}55`,
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: '#9A91A8',
                        }
                  }
                >
                  {key === 'PENDING' && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isActive ? '#070514' : '#F59E0B',
                        boxShadow: isActive ? 'none' : '0 0 8px #F59E0B',
                      }}
                    />
                  )}
                  <span>{label}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold"
                    style={{
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                      color: isActive ? 'inherit' : '#9A91A8',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl w-full lg:w-72 transition-all"
              style={{
                backgroundColor: '#070514',
                border: '1px solid rgba(0, 240, 255, 0.28)',
              }}
            >
              <Search size={14} className="text-cyan-400 shrink-0" />
              <input
                type="text"
                placeholder="Search player, game, ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none p-0 border-none"
                style={{ fontFamily: 'Lexend, sans-serif' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer hover:scale-[1.03]"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(224, 38, 216, 0.15) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                color: '#00F0FF',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)',
                fontFamily: 'Lexend, sans-serif',
              }}
            >
              <RefreshCw size={13} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '72px 28px',
            textAlign: 'center',
            background: 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.12) 0%, rgba(7, 5, 20, 0.95) 75%)',
            borderRadius: '20px',
            border: '1.5px dashed rgba(0, 240, 255, 0.35)',
            boxShadow: 'inset 0 0 40px rgba(0, 240, 255, 0.06)',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(245, 158, 11, 0.2) 100%)',
              border: '1.5px solid rgba(0, 240, 255, 0.5)',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
            }}
          >
            <Gamepad2 size={34} color="#00F0FF" />
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 240, 255, 0.15)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              color: '#00F0FF',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '10px',
              fontFamily: 'Lexend, sans-serif',
            }}
          >
            All Clear · Zero Pending Backlog
          </div>
          <p style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '17px', fontWeight: 900, color: '#FFFFFF' }}>
            No Game Account Requests Found
          </p>
          <p style={{ margin: '8px auto 0 auto', maxWidth: '480px', fontSize: '13px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif', lineHeight: 1.6 }}>
            Incoming player credentials requests will ring and arrive here in real-time.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div
            className="hidden lg:block rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(0, 240, 255, 0.28)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 240, 255, 0.1)',
            }}
          >
            <table className="w-full text-left text-xs border-collapse" style={{ fontFamily: 'Lexend, sans-serif' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead style={{ backgroundColor: '#070514', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <tr>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Player</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Requested Game</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Issued Credentials</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedRequests.map((req) => {
                  const isPending = (req.status || '').toUpperCase() === 'PENDING';
                  const isCoinLoad = req.requestType === 'COIN_LOAD' || Number(req.transferAmount || 0) > 0;
                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors ${
                        isPending ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-black text-xs uppercase shadow ${
                            isCoinLoad
                              ? 'bg-gradient-to-tr from-[#00F0FF] to-emerald-400'
                              : 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white'
                          }`}>
                            {req.userName ? req.userName.charAt(0) : 'P'}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{req.userName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{req.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-black text-amber-400 text-sm">{req.gameTitle}</span>
                          {isCoinLoad && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#00F0FF] bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                              ⚡ Coin Load
                            </span>
                          )}
                        </div>
                        {Boolean(req.freeplayPending) && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm">
                              🎁 Freeplay: ${Number(req.freeplayAmount || 3).toFixed(2)} SC
                            </span>
                            {(req.freeplayScreenshot || req.screenshot) && (
                              <button
                                type="button"
                                onClick={() => setPreviewScreenshot(req.freeplayScreenshot || req.screenshot)}
                                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                View Proof
                              </button>
                            )}
                          </div>
                        )}
                        {Boolean(req.pendingCoinLoadAmount && Number(req.pendingCoinLoadAmount) > 0) && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/35 px-2 py-0.5 rounded-lg w-fit">
                              💳 Deposit Approved: ${Number(req.pendingCoinLoadAmount).toFixed(2)} SC
                              {Number(req.bonusSC || 0) > 0
                                ? ` ($${Number(req.depositAmount || 0).toFixed(0)} + $${Number(req.bonusSC).toFixed(0)} Bonus)`
                                : ''}
                            </span>
                            {isPending && (
                              <span className="text-[10px] font-bold text-cyan-400">
                                → Auto-moves to Coin Allotment after ID creation
                              </span>
                            )}
                          </div>
                        )}
                        {Boolean(req.transferAmount && req.transferAmount > 0) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              💰 Amount: ${Number(req.transferAmount).toFixed(2)} SC
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            PENDING
                          </span>
                        ) : req.status === 'READY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <Check size={11} strokeWidth={3} />
                            READY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                            {req.status}
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono">
                        {isCoinLoad ? (
                          <div className="p-2 rounded-xl bg-black/40 border border-cyan-500/20 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Game Account ID:</span>
                            <span className="text-cyan-300 font-black text-xs block font-mono">
                              {req.gameAccountUsername || req.userName}
                            </span>
                          </div>
                        ) : req.gameAccountUsername ? (
                          <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-cyan-300 font-black text-xs">U: {req.gameAccountUsername}</span>
                              <button
                                onClick={() => handleCopy(`${req.gameAccountUsername} / ${req.gameAccountPassword}`, req.id)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                                title="Copy credentials"
                              >
                                {copiedId === req.id ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <p className="text-gray-400 text-xs">P: {req.gameAccountPassword}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-xs">Not issued yet</span>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap text-gray-400 text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1">
                            <Clock size={11} />
                            {formatRelativeTime(req.createdAt)}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            {isCoinLoad ? (
                              <button
                                onClick={() => (onApproveCoinLoad ? onApproveCoinLoad(req) : onOpenApproveModal(req))}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
                                title="Approve Coin Load & Deduct SC"
                              >
                                <Check size={13} strokeWidth={3} />
                                <span>Approve Load (${Number(req.transferAmount || 0).toFixed(2)})</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onOpenApproveModal(req)}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
                              >
                                <Key size={13} />
                                <span>Issue Credentials</span>
                              </button>
                            )}
                            <button
                              onClick={() => onCancelRequest(req.id)}
                              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold transition active:scale-95 cursor-pointer"
                              title="Reject / Cancel Request"
                            >
                              <X size={14} />
                            </button>
                            {onDismissRequest && (
                              <button
                                onClick={() => onDismissRequest(req.id)}
                                className="p-2 rounded-xl bg-gray-500/15 hover:bg-red-600/30 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-300 font-bold transition active:scale-95 cursor-pointer"
                                title="Permanently Delete / Dismiss Request"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCoinLoad && (
                              <button
                                onClick={() => onOpenApproveModal(req)}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition"
                              >
                                Edit Credentials
                              </button>
                            )}
                            {onDismissRequest && (
                              <button
                                onClick={() => onDismissRequest(req.id)}
                                className="p-2 rounded-xl bg-gray-500/15 hover:bg-red-600/30 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-300 font-bold transition"
                                title="Permanently Delete / Dismiss Request"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE & TABLET CARDS */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {paginatedRequests.map((req) => {
              const isPending = (req.status || '').toUpperCase() === 'PENDING';
              const isCoinLoad = req.requestType === 'COIN_LOAD' || Number(req.transferAmount || 0) > 0;
              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition shadow-xl ${
                    isPending
                      ? isCoinLoad
                        ? 'bg-[#0E0A24] border-cyan-500/50 shadow-cyan-500/10'
                        : 'bg-[#0E0A24] border-amber-500/40 shadow-amber-500/10'
                      : 'bg-[#0E0A24] border-[#00F0FF]/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-black text-sm shadow ${
                        isCoinLoad
                          ? 'bg-gradient-to-tr from-[#00F0FF] to-emerald-400'
                          : 'bg-gradient-to-tr from-[#00F0FF] to-[#E026D8]'
                      }`}>
                        {req.userName ? req.userName.charAt(0) : 'P'}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm leading-tight">{req.userName}</h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{req.userEmail}</p>
                      </div>
                    </div>

                    {isPending ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border animate-pulse ${
                        isCoinLoad
                          ? 'bg-cyan-500/20 text-[#00F0FF] border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCoinLoad ? 'bg-[#00F0FF]' : 'bg-amber-400'}`} />
                        PENDING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {req.status}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[#140E33] rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Game Requested:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-black text-amber-400 text-sm">{req.gameTitle}</span>
                        {isCoinLoad && (
                          <span className="text-[9.5px] font-black text-[#00F0FF] bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.2 rounded">
                            ⚡ Load
                          </span>
                        )}
                      </div>
                    </div>

                    {Boolean(req.freeplayPending) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-300 font-bold">Freeplay Task:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                            ${Number(req.freeplayAmount || 3).toFixed(2)} SC
                          </span>
                          {(req.freeplayScreenshot || req.screenshot) && (
                            <button
                              type="button"
                              onClick={() => setPreviewScreenshot(req.freeplayScreenshot || req.screenshot)}
                              className="text-[10.5px] font-bold text-cyan-400 underline"
                            >
                              Proof
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {Boolean(req.pendingCoinLoadAmount && Number(req.pendingCoinLoadAmount) > 0) && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-300 font-bold">Approved Deposit + Bonus:</span>
                          <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                            ${Number(req.pendingCoinLoadAmount).toFixed(2)} SC
                          </span>
                        </div>
                        {isPending && (
                          <span className="text-[10px] font-bold text-cyan-400">
                            → Auto-moves to Coin Allotment after ID creation
                          </span>
                        )}
                      </div>
                    )}

                    {Boolean(req.transferAmount && req.transferAmount > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Coin Load Amount:</span>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                          ${Number(req.transferAmount).toFixed(2)} SC
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                      <span>Time:</span>
                      <span>{formatRelativeTime(req.createdAt)}</span>
                    </div>
                  </div>

                  {isCoinLoad ? (
                    <div className="p-3 bg-cyan-500/[0.06] rounded-xl border border-cyan-500/20">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Game Account ID:</span>
                      <p className="text-cyan-300 font-bold font-mono text-xs">{req.gameAccountUsername || req.userName}</p>
                    </div>
                  ) : req.gameAccountUsername ? (
                    <div className="p-3 bg-cyan-500/[0.06] rounded-xl border border-cyan-500/20 flex items-center justify-between">
                      <div className="font-mono text-xs">
                        <p className="text-cyan-300 font-bold">User: {req.gameAccountUsername}</p>
                        <p className="text-gray-400">Pass: {req.gameAccountPassword}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(`${req.gameAccountUsername} / ${req.gameAccountPassword}`, req.id)}
                        className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white"
                      >
                        {copiedId === req.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : null}

                  {isPending ? (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {isCoinLoad ? (
                        <button
                          onClick={() => (onApproveCoinLoad ? onApproveCoinLoad(req) : onOpenApproveModal(req))}
                          className="col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/25 active:scale-95"
                        >
                          <Check size={13} strokeWidth={3} />
                          <span>Approve Load (${Number(req.transferAmount || 0).toFixed(2)})</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenApproveModal(req)}
                          className="py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                          <Key size={13} />
                          <span>Issue</span>
                        </button>
                      )}
                      <button
                        onClick={() => onCancelRequest(req.id)}
                        className={`py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-xs flex items-center justify-center gap-1 active:scale-95 ${
                          isCoinLoad ? 'col-span-1' : ''
                        }`}
                      >
                        <X size={13} />
                        <span>Reject</span>
                      </button>
                      {onDismissRequest && !isCoinLoad && (
                        <button
                          onClick={() => onDismissRequest(req.id)}
                          className="py-2.5 rounded-xl bg-gray-500/15 hover:bg-red-600/30 border border-white/10 text-gray-400 hover:text-red-300 font-black text-xs flex items-center justify-center gap-1 active:scale-95"
                          title="Delete / Dismiss"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!isCoinLoad && (
                        <button
                          onClick={() => onOpenApproveModal(req)}
                          className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition"
                        >
                          Edit Credentials
                        </button>
                      )}
                      {onDismissRequest && (
                        <button
                          onClick={() => onDismissRequest(req.id)}
                          className="p-2 rounded-xl bg-gray-500/15 hover:bg-red-600/30 border border-white/10 text-gray-400 hover:text-red-300 font-bold transition"
                          title="Delete / Dismiss"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Responsive Cyberpunk Pagination */}
          {filtered.length > 0 && (
            <AdminPagination
              currentPage={safeCurrentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="mt-3"
            />
          )}
        </>
      )}

      {/* Screenshot Proof Preview Modal */}
      {previewScreenshot && (
        <div
          onClick={() => setPreviewScreenshot(null)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[#0E0A24] border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎁 Player Freeplay Task Inbox Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black border border-white/10 flex items-center justify-center p-2">
              <img
                src={previewScreenshot}
                alt="Freeplay Task Inbox Proof"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-black text-xs uppercase"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AccountRequestsView;
