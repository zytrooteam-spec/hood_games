'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Check, Key } from 'lucide-react';
import AccountRequestsView from './AccountRequestsView';
import CoinOperationsDesk from './CoinOperationsDesk';
import AffiliateManagementHub from './AffiliateManagementHub';
import { diffSet } from '@/lib/fastDiff';
import { staffApiFetch } from '@/lib/staffApiFetch';
import { startSseBackedPoll } from '@/lib/sseBackedPoll';
import { hoodAlert, hoodConfirm } from '@/lib/hoodAlert';
import { generateGameCredentialPair } from '@/lib/gameCredentials';
import {
  isClosedAccountRequestStatus,
  mergeAccountRequestListFromServer,
  mergeAccountRequestListsPreferLocalClosed,
  mergeAccountRequestRowFromServer,
} from '@/lib/accountRequestDeskMerge';
import {
  recordStaffAccountClose,
  hydratePatchMapFromStaffCloses,
  clearStaffAccountClose,
} from '@/lib/accountRequestStaffClose';
import {
  filterOutCompletedRows,
  markRequestCompletedHidden,
  clearRequestCompletedHidden,
  readCompletedRequestIds,
} from '@/lib/accountRequestOptimistic';
import useAdminCachedFetch from '@/hooks/useAdminCachedFetch';
import { HOOD_ADMIN_POLL } from '@/lib/adminPollingConfig';
import { HOOD_ADMIN_REQUESTS_CACHE, readJson } from '@/lib/clientCache';
import {
  HoodAdminModal,
  HoodAdminModalHeader,
  HoodAdminModalBody,
  HoodAdminModalSummary,
  HoodAdminModalSummaryRow,
  HoodAdminModalField,
  HoodAdminModalActions,
  HoodAdminModalButton,
} from './HoodAdminModal';

function gameIdDeskRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (r) =>
      r.requestType !== 'COIN_LOAD' &&
      String(r.requestType || '').toUpperCase() !== 'COIN_LOAD' &&
      Number(r.transferAmount || 0) <= 0
  );
}

export function AccountRequestsDesk({
  onMutate,
  initialRequests = [],
  deskActive = true,
  pendingNavCount = 0,
}) {
  const cachedReq = readJson(HOOD_ADMIN_REQUESTS_CACHE);
  const [requests, setRequests] = useState(() =>
    gameIdDeskRows(cachedReq?.accountRequests?.length ? cachedReq.accountRequests : initialRequests)
  );
  const [hiddenIds, setHiddenIds] = useState(() => readCompletedRequestIds());
  const [filter, setFilter] = useState('PENDING');
  const [refreshing, setRefreshing] = useState(false);
  const [approvalModal, setApprovalModal] = useState({ open: false, request: null, username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const skipParentSeedUntilRef = useRef(0);
  const closedRequestPatchesRef = useRef(new Map());

  const markLocalMutation = (ms = 120_000) => {
    skipParentSeedUntilRef.current = Date.now() + ms;
  };

  const recordClosedPatch = (id, status, patch = {}) => {
    const key = String(id || '');
    if (!key || !status) return;
    closedRequestPatchesRef.current.set(key, {
      status,
      patch,
      until: Date.now() + 86400000,
    });
    recordStaffAccountClose(key, status, patch);
  };

  useEffect(() => {
    hydratePatchMapFromStaffCloses(closedRequestPatchesRef.current);
  }, []);

  const patchRequest = (id, patch) => {
    markLocalMutation();
    const key = String(id);
    if (patch?.status && isClosedAccountRequestStatus(patch.status)) {
      recordClosedPatch(key, patch.status, patch);
    }
    setRequests((prev) =>
      prev.map((r) => (String(r.id || r._id) === key ? { ...r, ...patch } : r))
    );
  };

  const removeRequest = (id) => {
    markLocalMutation();
    const key = String(id);
    setRequests((prev) => prev.filter((r) => String(r.id || r._id) !== key));
  };

  const hideFromDesk = (id) => {
    const key = String(id || '');
    if (!key) return;
    markRequestCompletedHidden(key);
    setHiddenIds(readCompletedRequestIds());
    removeRequest(key);
  };

  const { data: pollData, loading: pollLoading, mutate: mutateRequests } = useAdminCachedFetch(
    deskActive ? '/api/account-requests?status=all&limit=80&page=1' : null,
    {
      cacheKey: HOOD_ADMIN_REQUESTS_CACHE,
      pollMs: HOOD_ADMIN_POLL.QUEUES,
      enabled: deskActive,
    }
  );

  useEffect(() => {
    if (!pollData?.success) return;
    const rows = pollData.accountRequests || pollData.requests || [];
    if (!Array.isArray(rows)) return;
    const gameRows = gameIdDeskRows(rows);
    const merged = mergeAccountRequestListFromServer(gameRows, closedRequestPatchesRef.current);
    diffSet(setRequests, merged);
  }, [pollData]);

  useEffect(() => {
    if (pollLoading) setRefreshing(true);
    else setRefreshing(false);
  }, [pollLoading]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      await mutateRequests(false);
      if (!silent) setRefreshing(false);
    },
    [mutateRequests]
  );

  const mergeParentIntoDesk = useCallback((parentRows, prev) => {
    const parent = gameIdDeskRows(parentRows);
    if (!parent.length) return prev;
    if (!prev.length) {
      return mergeAccountRequestListFromServer(parent, closedRequestPatchesRef.current);
    }
    if (Date.now() < skipParentSeedUntilRef.current) {
      const byId = new Map(prev.map((r) => [String(r.id || r._id), r]));
      const merged = parent.map((row) => {
        const key = String(row.id || row._id);
        const local = byId.get(key);
        if (!local) return mergeAccountRequestRowFromServer(row, closedRequestPatchesRef.current);
        return mergeAccountRequestListsPreferLocalClosed([row], [local])[0];
      });
      const seen = new Set(merged.map((r) => String(r.id || r._id)));
      prev.forEach((r) => {
        const key = String(r.id || r._id);
        if (!seen.has(key)) merged.push(r);
      });
      return mergeAccountRequestListFromServer(merged, closedRequestPatchesRef.current);
    }
    const merged = mergeAccountRequestListsPreferLocalClosed(parent, prev);
    return mergeAccountRequestListFromServer(merged, closedRequestPatchesRef.current);
  }, []);

  useEffect(() => {
    if (!initialRequests?.length) return;
    setRequests((prev) => mergeParentIntoDesk(initialRequests, prev));
  }, [initialRequests, mergeParentIntoDesk]);

  const displayRequests = useMemo(() => {
    const parent = gameIdDeskRows(initialRequests);
    let base = requests;
    if (requests.length === 0 && parent.length > 0) {
      base = mergeAccountRequestListFromServer(parent, closedRequestPatchesRef.current);
    }
    return filterOutCompletedRows(base, hiddenIds);
  }, [requests, initialRequests, hiddenIds]);

  const scheduleReconcile = () => {
    window.setTimeout(() => {
      load(true);
    }, 4000);
  };

  useEffect(() => {
    if (!deskActive) return;
    const onInstant = () => {
      if (deskActive) load(true);
    };
    window.addEventListener('hood-admin-desk-sync', onInstant);
    window.addEventListener('hood-admin-refresh', onInstant);
    window.addEventListener('hood_staff_event_local', onInstant);
    const onStorage = (e) => {
      if (e.key === 'hood_staff_event') onInstant();
    };
    window.addEventListener('storage', onStorage);
    let bc;
    try {
      bc = new BroadcastChannel('hood_staff_alerts');
      bc.onmessage = (ev) => {
        const t = ev?.data?.type;
        if (!t || t === 'NEW_GAME_ID_REQUEST' || t === 'NEW_COIN_LOAD' || t === 'FREEPLAY') onInstant();
      };
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener('hood-admin-desk-sync', onInstant);
      window.removeEventListener('hood-admin-refresh', onInstant);
      window.removeEventListener('hood_staff_event_local', onInstant);
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
    };
  }, [deskActive, initialRequests?.length, load]);

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
    const req = approvalModal.request;
    const id = req.id || req._id;
    const gameUsername = approvalModal.username?.trim();
    const gamePassword = approvalModal.password?.trim();
    if (!gameUsername || !gamePassword) {
      hoodAlert.warning('Enter game username and password');
      return;
    }

    setSubmitting(true);
    setApprovalModal({ open: false, request: null, username: '', password: '' });
    patchRequest(id, {
      status: 'READY',
      gameAccountUsername: gameUsername,
      gameUsername,
      gameAccountPassword: gamePassword,
      gamePassword,
    });
    onMutate?.({ id, status: 'READY', patch: { gameUsername, gamePassword } });

    try {
      const res = await staffApiFetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'approve',
          gameUsername,
          gamePassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        hideFromDesk(id);
        hoodAlert.success(data.message || 'Credentials issued', 'Account desk');
        scheduleReconcile();
      } else {
        hoodAlert.error(data.error || data.message || 'Failed');
        skipParentSeedUntilRef.current = 0;
        load(true);
      }
    } catch {
      hoodAlert.error('Network error');
      skipParentSeedUntilRef.current = 0;
      load(true);
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
    const rid = req.id || req._id;
    patchRequest(rid, { status: 'READY' });
    onMutate?.({ id: rid, status: 'READY' });
    const res = await staffApiFetch('/api/account-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: rid, action: 'freeplay_wallet' }),
    });
    const data = await res.json();
    if (data.success) {
      hideFromDesk(rid);
      hoodAlert.success(data.message, 'Freeplay');
      scheduleReconcile();
    } else {
      hoodAlert.error(data.error || 'Failed');
      skipParentSeedUntilRef.current = 0;
      load(true);
    }
  };

  const cancelReq = async (id) => {
    const values = await hoodConfirm({
      title: 'Reject request',
      message: 'Reject this player request?',
      confirmLabel: 'Reject',
    });
    if (!values) return;
    const reason = 'Staff desk unavailable — contact support.';
    patchRequest(id, { status: 'REJECTED', rejectionReason: reason });
    onMutate?.({ id, status: 'REJECTED', patch: { rejectionReason: reason } });
    try {
      const res = await staffApiFetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'reject',
          reason,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        hoodAlert.error(data.error || data.message || 'Reject failed');
        closedRequestPatchesRef.current.delete(String(id));
        clearStaffAccountClose(id);
        clearRequestCompletedHidden(id);
        skipParentSeedUntilRef.current = 0;
        load(true);
      } else {
        const srv = data.request;
        const status = srv?.status ? String(srv.status).toUpperCase() : 'REJECTED';
        recordClosedPatch(id, status, {
          rejectionReason: srv?.rejectionReason || reason,
          ...(srv || {}),
        });
        hideFromDesk(id);
        onMutate?.({ id, status: 'REJECTED', patch: { rejectionReason: reason } });
        scheduleReconcile();
      }
    } catch {
      hoodAlert.error('Network error');
      skipParentSeedUntilRef.current = 0;
      load(true);
    }
  };

  const dismissReq = async (id) => {
    const ok = await hoodConfirm({ title: 'Dismiss', message: 'Remove from desk?', confirmLabel: 'Dismiss' });
    if (!ok) return;
    removeRequest(id);
    onMutate?.({ id, remove: true });
    try {
      const res = await fetch(`/api/account-requests?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (data.success === false) {
        hoodAlert.error(data.message || 'Could not dismiss');
        skipParentSeedUntilRef.current = 0;
        load(true);
      } else {
        scheduleReconcile();
      }
    } catch {
      skipParentSeedUntilRef.current = 0;
      load(true);
    }
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
        requests={displayRequests}
        pendingNavCount={pendingNavCount}
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
      <HoodAdminModal
        open={Boolean(approvalModal.open && approvalModal.request)}
        onClose={() => setApprovalModal({ open: false, request: null, username: '', password: '' })}
        size="sm"
      >
        {approvalModal.request ? (
          <>
            <HoodAdminModalHeader
              icon={<Key size={20} strokeWidth={2.5} />}
              title={`Fulfill ${approvalModal.request.gameTitle}`}
              subtitle="Issue portal username & password to the player"
              onClose={() => setApprovalModal({ open: false, request: null, username: '', password: '' })}
            />
            <HoodAdminModalBody>
              <HoodAdminModalSummary>
                <HoodAdminModalSummaryRow label="Player" value={approvalModal.request.userName} />
                <HoodAdminModalSummaryRow
                  label="Platform"
                  value={approvalModal.request.gameTitle}
                  valueClassName="text-[#7ee08f]"
                />
                {approvalModal.request.freeplayPending ? (
                  <HoodAdminModalSummaryRow
                    label="Freeplay pending"
                    value={`$${Number(approvalModal.request.freeplayAmount || 0).toFixed(2)} SC`}
                    valueClassName="text-pink-300"
                  />
                ) : null}
              </HoodAdminModalSummary>

              {approvalModal.request.freeplayPending ? (
                <HoodAdminModalButton
                  type="button"
                  variant="secondary"
                  className="w-full !normal-case !font-bold !tracking-normal border-pink-500/35 text-pink-200 hover:border-pink-400/50"
                  onClick={() => {
                    freeplayWallet(approvalModal.request);
                    setApprovalModal({ open: false, request: null, username: '', password: '' });
                  }}
                >
                  Credit freeplay SC only (skip game ID)
                </HoodAdminModalButton>
              ) : null}

              <HoodAdminModalField label="Game username / ID" required>
                <input
                  className="hood-input w-full font-mono font-bold"
                  value={approvalModal.username}
                  onChange={(e) => setApprovalModal({ ...approvalModal, username: e.target.value })}
                  placeholder="e.g. player12345"
                  autoComplete="off"
                />
              </HoodAdminModalField>
              <HoodAdminModalField label="Game password / PIN" required>
                <input
                  className="hood-input w-full font-mono font-bold"
                  value={approvalModal.password}
                  onChange={(e) => setApprovalModal({ ...approvalModal, password: e.target.value })}
                  placeholder="Auto-generated — edit if needed"
                  autoComplete="off"
                />
              </HoodAdminModalField>

              <HoodAdminModalActions>
                <HoodAdminModalButton
                  type="button"
                  variant="ghost"
                  onClick={() => setApprovalModal({ open: false, request: null, username: '', password: '' })}
                >
                  Cancel
                </HoodAdminModalButton>
                <HoodAdminModalButton type="button" variant="primary" disabled={submitting} onClick={confirmApprove}>
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                  Confirm &amp; issue
                </HoodAdminModalButton>
              </HoodAdminModalActions>
            </HoodAdminModalBody>
          </>
        ) : null}
      </HoodAdminModal>
    </div>
  );
}

export function CoinAllotmentDesk({ sessionUser, onMutate }) {
  const [loads, setLoads] = useState([]);
  const [cashouts, setCashouts] = useState([]);

  const refresh = useCallback(() => {
    staffApiFetch('/api/account-requests?type=COIN_LOAD&status=all')
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setLoads, d.accountRequests || []));
    fetch('/api/payments/withdraw?status=all&lightweight=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.success && diffSet(setCashouts, d.redemptions || []));
  }, []);

  useEffect(() => {
    refresh();
    const stop = startSseBackedPoll(refresh, {
      whenDisconnected: 40_000,
      whenConnected: 240_000,
      runOnStart: false,
    });
    const onDesk = () => refresh();
    window.addEventListener('hood-coin-desk-refresh', onDesk);
    window.addEventListener('hood-admin-desk-sync', onDesk);
    return () => {
      stop();
      window.removeEventListener('hood-coin-desk-refresh', onDesk);
      window.removeEventListener('hood-admin-desk-sync', onDesk);
    };
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
    return startSseBackedPoll(load, {
      whenDisconnected: 60_000,
      whenConnected: 300_000,
      runOnStart: false,
    });
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
