'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, X, Check, Key } from 'lucide-react';
import AccountRequestsView from './AccountRequestsView';
import CoinOperationsDesk from './CoinOperationsDesk';
import AffiliateManagementHub from './AffiliateManagementHub';
import { diffSet } from '@/lib/fastDiff';
import { hoodAlert, hoodConfirm } from '@/lib/hoodAlert';
import { generateGameCredentialPair } from '@/lib/gameCredentials';

export function AccountRequestsDesk({ onMutate }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [refreshing, setRefreshing] = useState(false);
  const [approvalModal, setApprovalModal] = useState({ open: false, request: null, username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/account-requests?status=all', { cache: 'no-store' });
      const d = await res.json();
      if (d.success && Array.isArray(d.accountRequests)) {
        const creation = d.accountRequests.filter(
          (r) => r.requestType !== 'COIN_LOAD' && Number(r.transferAmount || 0) <= 0
        );
        diffSet(setRequests, creation);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 6000);
    return () => clearInterval(i);
  }, [load]);

  const openApprove = (req) => {
    const pair = generateGameCredentialPair(req.userName || req.userEmail?.split('@')[0] || 'player');
    setApprovalModal({
      open: true,
      request: req,
      username: pair.gameUsername,
      password: pair.gamePassword,
    });
  };

  const confirmApprove = async () => {
    if (!approvalModal.request || submitting) return;
    setSubmitting(true);
    try {
      const id = approvalModal.request.id || approvalModal.request._id;
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'approve',
          username: approvalModal.username,
          password: approvalModal.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success(data.message || 'Credentials issued', 'Account desk');
        setApprovalModal({ open: false, request: null, username: '', password: '' });
        load();
        onMutate?.();
      } else hoodAlert.error(data.error || data.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const freeplayWallet = async (req) => {
    const ok = await hoodConfirm({
      title: 'Credit Freeplay',
      message: `Credit $${Number(req.freeplayAmount || 0).toFixed(2)} SC to wallet?`,
      confirmLabel: 'Credit SC',
    });
    if (!ok) return;
    const res = await fetch('/api/account-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id || req._id, action: 'freeplay_wallet' }),
    });
    const data = await res.json();
    if (data.success) {
      hoodAlert.success(data.message, 'Freeplay');
      load();
      onMutate?.();
    } else hoodAlert.error(data.error || 'Failed');
  };

  const cancelReq = async (id) => {
    const values = await hoodConfirm({
      title: 'Reject request',
      message: 'Reject this player request?',
      confirmLabel: 'Reject',
    });
    if (!values) return;
    await fetch('/api/account-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'cancel', reason: 'Staff desk unavailable — contact support.' }),
    });
    load();
    onMutate?.();
  };

  const dismissReq = async (id) => {
    const ok = await hoodConfirm({ title: 'Dismiss', message: 'Remove from desk?', confirmLabel: 'Dismiss' });
    if (!ok) return;
    await fetch(`/api/account-requests?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#09142a] border border-[#1a3363]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#2cb64e]/15 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
            <Key size={26} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white m-0">Player Game Account Requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paradise-style desk — approve IDs, freeplay, coin-load handoff</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="btn-hood-green px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Sync Requests
        </button>
      </div>

      <AccountRequestsView
        requests={requests}
        filter={filter}
        onFilterChange={setFilter}
        onOpenApproveModal={openApprove}
        onApproveCoinLoad={() => {}}
        onCancelRequest={cancelReq}
        onDismissRequest={dismissReq}
        onRefresh={load}
        isRefreshing={refreshing}
      />

      {/* Freeplay quick actions injected via custom row handler in view - use parallel buttons in modal for freeplay */}
      {approvalModal.open && approvalModal.request && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#09142a] border-2 border-[#2cb64e]/40 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-white font-black text-lg m-0">Fulfill {approvalModal.request.gameTitle}</h3>
              <button type="button" onClick={() => setApprovalModal({ open: false, request: null, username: '', password: '' })} className="text-gray-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Player: <strong className="text-white">{approvalModal.request.userName}</strong>
            </p>
            {approvalModal.request.freeplayPending && (
              <button
                type="button"
                onClick={() => {
                  freeplayWallet(approvalModal.request);
                  setApprovalModal({ open: false, request: null, username: '', password: '' });
                }}
                className="w-full py-2 rounded-xl bg-pink-950/40 border border-pink-500/40 text-pink-200 text-xs font-bold"
              >
                Credit Freeplay SC only (${Number(approvalModal.request.freeplayAmount || 0).toFixed(2)})
              </button>
            )}
            <input
              className="hood-input w-full text-xs font-mono"
              value={approvalModal.username}
              onChange={(e) => setApprovalModal({ ...approvalModal, username: e.target.value })}
              placeholder="Game username"
            />
            <input
              className="hood-input w-full text-xs font-mono"
              value={approvalModal.password}
              onChange={(e) => setApprovalModal({ ...approvalModal, password: e.target.value })}
              placeholder="Game password"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={confirmApprove}
              className="w-full btn-hood-green py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              Confirm & Issue Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CoinAllotmentDesk({ sessionUser, onMutate }) {
  const [loads, setLoads] = useState([]);
  const [cashouts, setCashouts] = useState([]);

  const refresh = useCallback(() => {
    fetch('/api/account-requests?type=COIN_LOAD&status=all', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setLoads, d.accountRequests || []));
    fetch('/api/payments/withdraw?status=all&lightweight=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setCashouts, d.redemptions || []));
  }, []);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [refresh]);

  return (
    <CoinOperationsDesk
      sessionUser={sessionUser}
      initialLoads={loads}
      initialCashouts={cashouts}
      initialSection="loads"
      onMutate={() => {
        refresh();
        onMutate?.();
      }}
      onMutateSuccess={() => {
        refresh();
        onMutate?.();
      }}
    />
  );
}

export function AffiliatesDesk({ mode = 'affiliates', onRefresh }) {
  const [affiliates, setAffiliates] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = useCallback(() => {
    fetch('/api/affiliates?mode=admin', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          diffSet(setAffiliates, d.affiliates || []);
          setSummary({
            totalPartners: d.totals?.partners ?? 0,
            totalReferees: (d.affiliates || []).reduce((s, a) => s + (a.totalReferrals || 0), 0),
            totalEarned: d.totals?.earned ?? 0,
            totalUnpaid: d.totals?.unpaid ?? 0,
            totalVolume: (d.affiliates || []).reduce((s, a) => s + (a.totalDepositsGenerated || 0), 0),
          });
        }
      });
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [load]);

  return (
    <AffiliateManagementHub
      activeTab={mode}
      affiliates={affiliates}
      summary={summary}
      onRefresh={() => {
        load();
        onRefresh?.();
      }}
    />
  );
}
