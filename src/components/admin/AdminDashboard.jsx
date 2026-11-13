'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Wallet,
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  Settings,
  Users,
  Gamepad2,
  Key,
  Check,
  X,
  Plus,
  Trash2,
  Send,
  Tag,
  FileText,
  DollarSign,
  Clock,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Search,
  Inbox,
  User,
  Mail,
  Menu,
  Edit2,
  CreditCard,
  Coins,
  FileSpreadsheet,
  UserCheck,
  Eye,
  Paperclip,
  RefreshCw as RefreshIcon,
  Megaphone,
  Gift,
  Link2,
  Smartphone,
  ChevronLeft,
  PanelRight,
  Crown,
} from 'lucide-react';
import { compressImageFile } from '@/lib/imageCompress';
import HoodChatMessageBubble from '@/components/chat/HoodChatMessageBubble';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  playTune,
  unlockAudioContext,
  updateFaviconBadge,
  sendDesktopNotification,
  requestDesktopNotificationPermission,
  AVAILABLE_TUNES,
  setPlayerTouchTune,
} from '@/lib/soundAlerts';
import { hoodAlert, hoodConfirm, hoodPromptForm } from '@/lib/hoodAlert';
import {
  generateGameCredentialPair,
  generateGamePassword,
  generateGameUsername,
} from '@/lib/gameCredentials';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import {
  mergeChatThreadsPreservingUnread,
  createChatInboxDedup,
  applyInboundChatThreadBump,
  dedupeChatMessagesById,
  threadKey,
} from '@/lib/hoodAdminChatInbox';
import {
  GamesLibraryTab,
  GatewaysTab,
  LedgerTab,
  StaffTab,
  PromosTab,
} from './AdminExtraTabs';
import { AccountRequestsDesk, CoinAllotmentDesk, AffiliatesDesk } from './HoodAdminDesks';
import AdminImageField from './AdminImageField';
import AdminDailySpinTab from './AdminDailySpinTab';
import AdminVipTab from './AdminVipTab';
import {
  HoodAdminModal,
  HoodAdminModalHeader,
  HoodAdminModalBody,
  HoodAdminModalField,
  HoodAdminModalActions,
  HoodAdminModalButton,
} from './HoodAdminModal';
import Player360ProfileModal from './Player360ProfileModal';
import { HOOD_ADMIN_BOOTSTRAP, readJson, writeJson } from '@/lib/clientCache';
import { staffApiFetch } from '@/lib/staffApiFetch';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const cached = readJson(HOOD_ADMIN_BOOTSTRAP);
    return !cached?.data?.success;
  });

  // Data states
  const [deposits, setDeposits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [accountRequests, setAccountRequests] = useState([]);
  const [settings, setSettings] = useState(null);
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedThreadUser, setSelectedThreadUser] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState({ labels: [], staffNotes: [] });
  const [chatInput, setChatInput] = useState('');
  const [chatAttachImage, setChatAttachImage] = useState(null);
  const [chatAttachUploading, setChatAttachUploading] = useState(false);
  const adminChatFileRef = React.useRef(null);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [newNoteInput, setNewNoteInput] = useState('');
  const [chatThreadQuery, setChatThreadQuery] = useState('');
  /** Mobile/tablet chat: inbox → conversation → crm (desktop xl+ shows all columns). */
  const [chatDeskPane, setChatDeskPane] = useState('inbox');
  const [threadPlayerDetail, setThreadPlayerDetail] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [usersListTotal, setUsersListTotal] = useState(0);
  const [playerDirectoryPage, setPlayerDirectoryPage] = useState(1);
  const [playerDirectoryPageSize, setPlayerDirectoryPageSize] = useState(10);
  const [gateways, setGateways] = useState([]);
  const [cashbackReport, setCashbackReport] = useState(null);
  const [disbursingCashback, setDisbursingCashback] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);
  // Player editing modal states
  const [selectedPlayerToEdit, setSelectedPlayerToEdit] = useState(null);
  const [player360Id, setPlayer360Id] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [usersListLoading, setUsersListLoading] = useState(false);
  const [editBalanceSC, setEditBalanceSC] = useState('');
  const [editBalanceGC, setEditBalanceGC] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editRole, setEditRole] = useState('player');
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [unbindingDevice, setUnbindingDevice] = useState(false);

  // Card editing states
  const [editingCards, setEditingCards] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Chat scroll refs
  const adminChatScrollRef = React.useRef(null);
  const prevAdminMessageCount = React.useRef(0);
  const lastActiveThreadUser = React.useRef(null);

  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [alertTune, setAlertTune] = useState('chaching');
  const [alertVolume, setAlertVolume] = useState(0.75);
  const [desktopNotifPerm, setDesktopNotifPerm] = useState('default');
  const alertsInitializedRef = React.useRef(false);
  const seenDepositIdsRef = React.useRef(new Set());
  const seenRedemptionIdsRef = React.useRef(new Set());
  const seenGameIdReqRef = React.useRef(new Set());
  const seenLoadReqRef = React.useRef(new Set());
  const seenFreeplayReqRef = React.useRef(new Set());
  const seenChatKeysRef = React.useRef(new Set());
  const activeTabRef = React.useRef(activeTab);
  const selectedThreadUserRef = React.useRef(selectedThreadUser);
  const claimChatInboxAlertRef = React.useRef(createChatInboxDedup());
  const chatInboxRefreshTimerRef = React.useRef(null);
  const adminLightSyncTimerRef = React.useRef(null);
  const fetchInFlightRef = React.useRef(false);
  const adminFullHydratedRef = React.useRef(false);
  /** Prevent bootstrap poll from resurrecting PENDING after desk reject/approve. */
  const recentAccountRequestPatchesRef = React.useRef(new Map());
  const conversationReqIdRef = React.useRef(0);
  const conversationCacheRef = React.useRef(new Map());
  const [conversationLoading, setConversationLoading] = useState(false);
  const processingDepositIdsRef = React.useRef(new Set());
  const [processingDepositIds, setProcessingDepositIds] = useState(() => new Set());

  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  React.useEffect(() => {
    selectedThreadUserRef.current = selectedThreadUser;
  }, [selectedThreadUser]);

  const refreshChatInbox = React.useCallback(async () => {
    try {
      const chatRes = await staffApiFetch(`/api/chat?limit=80&_t=${Date.now()}`);
      const data = await chatRes.json();
      if (data?.success && Array.isArray(data.threads)) {
        setChatThreads((prev) =>
          mergeChatThreadsPreservingUnread(prev, data.threads, {
            exceptUserId: selectedThreadUserRef.current,
          })
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const scheduleChatInboxRefresh = React.useCallback(() => {
    if (chatInboxRefreshTimerRef.current) clearTimeout(chatInboxRefreshTimerRef.current);
    chatInboxRefreshTimerRef.current = setTimeout(() => {
      refreshChatInbox();
    }, 180);
  }, [refreshChatInbox]);

  const isPendingReq = (r) => String(r?.status || '').toUpperCase() === 'PENDING';

  const recordAccountRequestDeskPatch = React.useCallback((id, status, patch = {}) => {
    const key = String(id || '');
    if (!key || !status) return;
    recentAccountRequestPatchesRef.current.set(key, {
      status,
      patch,
      until: Date.now() + 45000,
    });
  }, []);

  const mergeAccountRequestFromServer = React.useCallback((r) => {
    const base = { ...r, gameTitle: sanitizeGameTitle(r.gameTitle) };
    const key = String(r.id || r._id || '');
    if (!key) return base;
    const hold = recentAccountRequestPatchesRef.current.get(key);
    if (!hold || Date.now() > hold.until) return base;
    const incoming = String(r.status || '').toUpperCase();
    const held = String(hold.status || '').toUpperCase();
    if (incoming === 'PENDING' && held !== 'PENDING') {
      return { ...base, ...hold.patch, status: hold.status };
    }
    if (held !== 'PENDING' && incoming !== held) {
      return { ...base, ...hold.patch, status: hold.status };
    }
    return base;
  }, []);

  const patchAccountRequestInNav = React.useCallback((id, patch) => {
    const key = String(id || '');
    if (!key) return;
    setAccountRequests((prev) =>
      (prev || []).map((r) => (String(r.id || r._id) === key ? { ...r, ...patch } : r))
    );
  }, []);

  const removeAccountRequestFromNav = React.useCallback((id) => {
    const key = String(id || '');
    if (!key) return;
    setAccountRequests((prev) => (prev || []).filter((r) => String(r.id || r._id) !== key));
  }, []);

  const playAdminChime = React.useCallback(
    (overrideTune = null) => {
      if (!audioAlertsEnabled || typeof window === 'undefined') return;
      unlockAudioContext();
      playTune(overrideTune || alertTune, alertVolume);
    },
    [audioAlertsEnabled, alertTune, alertVolume]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enabled = localStorage.getItem('hood_admin_alert_enabled');
    if (enabled !== null) setAudioAlertsEnabled(enabled !== 'false');
    const tune = localStorage.getItem('hood_admin_alert_tune');
    if (tune) setAlertTune(tune);
    const vol = localStorage.getItem('hood_admin_alert_volume');
    if (vol) setAlertVolume(parseFloat(vol) || 0.75);
    if ('Notification' in window) setDesktopNotifPerm(Notification.permission);

    const onUnlock = () => unlockAudioContext();
    window.addEventListener('click', onUnlock, { capture: true });
    window.addEventListener('keydown', onUnlock, { capture: true });

    let bc;
    try {
      bc = new BroadcastChannel('hood_staff_alerts');
      bc.onmessage = (ev) => {
        if (ev?.data?.silent) return;
        playAdminChime(ev?.data?.tune);
        if (ev?.data?.type === 'NEW_GAME_ID_REQUEST' || ev?.data?.type === 'NEW_COIN_LOAD') {
          window.dispatchEvent(new CustomEvent('hood-admin-refresh'));
        }
      };
    } catch {
      bc = null;
    }

    const onStorage = (e) => {
      if (e.key === 'hood_staff_event' && e.newValue) {
        try {
          const p = JSON.parse(e.newValue);
          if (!p?.silent) playAdminChime(p?.tune);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('click', onUnlock, { capture: true });
      window.removeEventListener('keydown', onUnlock, { capture: true });
      window.removeEventListener('storage', onStorage);
      bc?.close();
    };
  }, [playAdminChime]);

  const syncAdminAlerts = React.useCallback(
    (depList, redList, reqList, threadList) => {
      const pendingDeps = (depList || []).filter((d) => (d.status || '').toLowerCase() === 'pending');
      const pendingReds = (redList || []).filter((r) => (r.status || '').toLowerCase() === 'pending');
      const pendingReqs = (reqList || []).filter(isPendingReq);
      const pendingFreeplay = pendingReqs.filter((r) => r.freeplayPending);
      const pendingLoads = pendingReqs.filter((r) => !r.freeplayPending && Number(r.transferAmount || 0) > 0);
      const pendingGameIds = pendingReqs.filter((r) => !r.freeplayPending && Number(r.transferAmount || 0) <= 0);
      const unreadChat = (threadList || []).reduce((s, t) => s + Number(t.unreadCount || 0), 0);

      const totalPending =
        pendingDeps.length +
        pendingReds.length +
        pendingReqs.length +
        unreadChat;

      updateFaviconBadge(totalPending);
      if (typeof document !== 'undefined') {
        document.title =
          totalPending > 0 ? `(${totalPending > 99 ? '99+' : totalPending}) Hood Admin` : 'Hood Games Admin';
      }

      const broadcast = (payload) => {
        try {
          const ch = new BroadcastChannel('hood_staff_alerts');
          ch.postMessage(payload);
          ch.close();
        } catch {
          /* ignore */
        }
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hood_staff_event', JSON.stringify({ ...payload, t: Date.now() }));
          }
        } catch {
          /* ignore */
        }
      };

      const notifyNew = (title, body, tab, tune = 'chaching') => {
        playAdminChime(tune);
        sendDesktopNotification(title, body, '/admin');
        broadcast({ title, tune });
      };

      const track = (items, seenSet, onNew) => {
        items.forEach((item) => {
          const id = String(item._id || item.id || item.userId || '');
          if (!id) return;
          if (!seenSet.has(id)) {
            seenSet.add(id);
            if (alertsInitializedRef.current) onNew(item);
          }
        });
      };

      if (!alertsInitializedRef.current) {
        pendingDeps.forEach((d) => seenDepositIdsRef.current.add(String(d._id)));
        pendingReds.forEach((r) => seenRedemptionIdsRef.current.add(String(r._id)));
        pendingGameIds.forEach((r) => seenGameIdReqRef.current.add(String(r._id)));
        pendingLoads.forEach((r) => seenLoadReqRef.current.add(String(r._id)));
        pendingFreeplay.forEach((r) => seenFreeplayReqRef.current.add(String(r._id)));
        (threadList || []).forEach((t) => {
          if (Number(t.unreadCount || 0) > 0) {
            seenChatKeysRef.current.add(`${t.userId}:${t.lastMessage?.createdAt || t.updatedAt || ''}`);
          }
        });
        alertsInitializedRef.current = true;
        return;
      }

      track(pendingDeps, seenDepositIdsRef.current, (d) =>
        notifyNew('💰 New Deposit', `$${Number(d.amount || 0).toFixed(2)} from ${d.username || 'player'}`, 'finance', 'chaching')
      );
      track(pendingReds, seenRedemptionIdsRef.current, (r) =>
        notifyNew('💸 Cashout Request', `$${Number(r.amount || 0).toFixed(2)} — review in Finance`, 'finance', 'bell')
      );
      track(pendingGameIds, seenGameIdReqRef.current, (r) =>
        notifyNew('🎮 Game ID Request', `${r.username || 'Player'} — ${r.gameTitle || 'platform'}`, 'requests', 'marimba')
      );
      track(pendingLoads, seenLoadReqRef.current, (r) =>
        notifyNew('🪙 Coin Load', `${r.username || r.userName} loaded $${Number(r.transferAmount || 0).toFixed(2)}`, 'game_loads', 'arcade')
      );
      track(pendingFreeplay, seenFreeplayReqRef.current, (r) =>
        notifyNew(
          '🎁 Freeplay Task',
          `${r.userName || r.username || 'Player'} — $${Number(r.freeplayAmount || 0).toFixed(2)} on ${r.gameTitle || 'game'}`,
          'requests',
          'marimba'
        )
      );

      (threadList || []).forEach((t) => {
        if (Number(t.unreadCount || 0) <= 0) return;
        const key = `${t.userId}:${t.lastMessage?.createdAt || t.updatedAt || Date.now()}`;
        if (!seenChatKeysRef.current.has(key)) {
          seenChatKeysRef.current.add(key);
          notifyNew('💬 Live Chat', `New message from ${t.username || 'player'}`, 'chat', 'bell');
        }
      });
    },
    [playAdminChime]
  );

  const enableDesktopNotifications = async () => {
    unlockAudioContext();
    const perm = await requestDesktopNotificationPermission();
    setDesktopNotifPerm(perm);
    if (perm === 'granted') {
      playAdminChime('bell');
      sendDesktopNotification(
        '🔔 Hood Admin Alerts On',
        'Sound + badge alerts for deposits, cashouts, game requests & chat.',
        '/admin'
      );
    }
  };

  const pendingFinanceCount =
    (deposits || []).filter((d) => (d.status || '').toLowerCase() === 'pending').length +
    (redemptions || []).filter((r) => (r.status || '').toLowerCase() === 'pending').length;
  const pendingFreeplayCount = (accountRequests || []).filter((r) => isPendingReq(r) && r.freeplayPending).length;
  const pendingGameIdCount = (accountRequests || []).filter(
    (r) => isPendingReq(r) && !r.freeplayPending && Number(r.transferAmount || 0) <= 0
  ).length;
  const pendingLoadCountListed = (accountRequests || []).filter(
    (r) => isPendingReq(r) && !r.freeplayPending && Number(r.transferAmount || 0) > 0
  ).length;
  const pendingLoadCount =
    pendingLoadCountListed > 0 ? pendingLoadCountListed : Number(stats?.pendingCoinLoads || 0);
  const pendingAccountDeskCount = pendingGameIdCount + pendingFreeplayCount;
  const unreadChatCount = (chatThreads || []).reduce((s, t) => s + Number(t.unreadCount || 0), 0);

  const filteredChatThreads = React.useMemo(() => {
    const q = chatThreadQuery.trim().toLowerCase();
    if (!q) return chatThreads;
    return (chatThreads || []).filter((t) => {
      const name = (t.username || '').toLowerCase();
      const email = (t.userEmail || '').toLowerCase();
      const last = (t.lastMessage || '').toLowerCase();
      return name.includes(q) || email.includes(q) || last.includes(q);
    });
  }, [chatThreads, chatThreadQuery]);

  const formatThreadTime = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const NavCountBadge = ({ count, tone = 'amber' }) => {
    if (!count || count <= 0) return null;
    const tones = {
      amber: 'bg-amber-500 text-black',
      blue: 'bg-blue-500 text-white',
      green: 'bg-[#2cb64e] text-black',
      rose: 'bg-rose-500 text-white',
    };
    return (
      <span
        className={`min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center ${tones[tone] || tones.amber}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const applyBootstrapPayload = React.useCallback((data) => {
    if (!data?.success) return;
    if (data.stats) diffSet(setStats, data.stats);
    if (Array.isArray(data.deposits)) diffSet(setDeposits, data.deposits);
    if (Array.isArray(data.redemptions)) diffSet(setRedemptions, data.redemptions);
    const reqRows = data.requests || data.accountRequests;
    if (Array.isArray(reqRows)) {
      diffSet(setAccountRequests, reqRows.map((r) => mergeAccountRequestFromServer(r)));
    }
    if (data.settings) {
      diffSet(setSettings, data.settings);
      setEditingCards((prev) => (prev && prev.length > 0 ? prev : (data.settings.quickActionCards || [])));
      const deskTune = data.settings.adminDefaultAlertTune;
      if (deskTune && typeof window !== 'undefined' && !localStorage.getItem('hood_admin_alert_tune')) {
        setAlertTune(deskTune);
      }
      if (data.settings.playerTouchTune) setPlayerTouchTune(data.settings.playerTouchTune);
    }
    if (Array.isArray(data.threads)) {
      setChatThreads((prev) =>
        mergeChatThreadsPreservingUnread(prev, data.threads, {
          exceptUserId: selectedThreadUserRef.current,
        })
      );
    }
    if (Array.isArray(data.methods)) diffSet(setGateways, data.methods);

    const depList = Array.isArray(data.deposits) ? data.deposits : [];
    const redList = Array.isArray(data.redemptions) ? data.redemptions : [];
    const reqList = Array.isArray(reqRows) ? reqRows.map((r) => mergeAccountRequestFromServer(r)) : [];
    const threadList = Array.isArray(data.threads) ? data.threads : [];
    syncAdminAlerts(depList, redList, reqList, threadList);
  }, [mergeAccountRequestFromServer, syncAdminAlerts]);

  const loadCashbackReport = React.useCallback(async () => {
    try {
      const cbRes = await fetch('/api/cashback?adminReport=true', { cache: 'no-store' }).then((r) => r.json());
      if (cbRes?.success) diffSet(setCashbackReport, cbRes);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAdminPayload = React.useCallback(
    async (isSilent = false, { lite = false } = {}) => {
      if (fetchInFlightRef.current && isSilent) return;
      fetchInFlightRef.current = true;
      if (!isSilent && !lite) setLoading(true);
      try {
        const url = lite ? '/api/admin/bootstrap?lite=1' : '/api/admin/bootstrap';
        const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        applyBootstrapPayload(data);
        if (data?.success && !data.lite) {
          adminFullHydratedRef.current = true;
          writeJson(HOOD_ADMIN_BOOTSTRAP, { data, t: Date.now() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        fetchInFlightRef.current = false;
        if (!isSilent && !lite) setLoading(false);
      }
    },
    [applyBootstrapPayload]
  );

  const fetchAllData = (isSilent = false) => fetchAdminPayload(isSilent, { full: true });

  const fetchAdminLite = React.useCallback(
    (isSilent = true) => fetchAdminPayload(isSilent, { lite: true }),
    [fetchAdminPayload]
  );

  const refreshAdminStatsOnly = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data?.success && data.stats) diffSet(setStats, data.stats);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshFinanceQueue = React.useCallback(async () => {
    try {
      const [depRes, redRes] = await Promise.all([
        fetch('/api/payments/deposit', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments/withdraw', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (depRes.success && Array.isArray(depRes.deposits)) diffSet(setDeposits, depRes.deposits);
      if (redRes.success && Array.isArray(redRes.redemptions)) diffSet(setRedemptions, redRes.redemptions);
      const depList = depRes.success && Array.isArray(depRes.deposits) ? depRes.deposits : [];
      const redList = redRes.success && Array.isArray(redRes.redemptions) ? redRes.redemptions : [];
      syncAdminAlerts(depList, redList, accountRequests, chatThreads);
    } catch {
      /* ignore */
    }
  }, [accountRequests, chatThreads, syncAdminAlerts]);

  const refreshDeskQueues = React.useCallback(async () => {
    try {
      const [depRes, redRes, reqRes] = await Promise.all([
        fetch('/api/payments/deposit', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments/withdraw', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/account-requests?status=all', { credentials: 'include', cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({})),
      ]);
      if (depRes.success && Array.isArray(depRes.deposits)) diffSet(setDeposits, depRes.deposits);
      if (redRes.success && Array.isArray(redRes.redemptions)) diffSet(setRedemptions, redRes.redemptions);
      const reqRows = reqRes.requests || reqRes.accountRequests;
      if (reqRes.success && Array.isArray(reqRows)) {
        diffSet(setAccountRequests, reqRows.map((r) => mergeAccountRequestFromServer(r)));
      }
      const depList = depRes.success && Array.isArray(depRes.deposits) ? depRes.deposits : [];
      const redList = redRes.success && Array.isArray(redRes.redemptions) ? redRes.redemptions : [];
      const reqList =
        reqRes.success && Array.isArray(reqRows) ? reqRows.map((r) => mergeAccountRequestFromServer(r)) : [];
      syncAdminAlerts(depList, redList, reqList, chatThreads);
    } catch {
      /* ignore */
    }
  }, [chatThreads, mergeAccountRequestFromServer, syncAdminAlerts]);

  const handleAccountRequestsDeskMutate = React.useCallback(
    (evt) => {
      if (evt?.id) {
        if (evt.remove) {
          recordAccountRequestDeskPatch(evt.id, 'DISMISSED', {});
          removeAccountRequestFromNav(evt.id);
        } else if (evt.status) {
          const patch = { status: evt.status, ...(evt.patch || {}) };
          recordAccountRequestDeskPatch(evt.id, evt.status, evt.patch || {});
          patchAccountRequestInNav(evt.id, patch);
          const closed = String(evt.status).toUpperCase();
          if (closed === 'REJECTED' || closed === 'READY' || closed === 'DISMISSED') {
            setStats((s) =>
              s
                ? {
                    ...s,
                    pendingAccountRequests: Math.max(0, Number(s.pendingAccountRequests || 0) - 1),
                  }
                : s
            );
          }
        }
      }
      refreshAdminStatsOnly();
      window.setTimeout(() => {
        refreshAdminStatsOnly();
        refreshDeskQueues();
      }, 1200);
    },
    [
      patchAccountRequestInNav,
      removeAccountRequestFromNav,
      recordAccountRequestDeskPatch,
      refreshAdminStatsOnly,
      refreshDeskQueues,
    ]
  );

  const scheduleLightAdminSync = React.useCallback(() => {
    if (adminLightSyncTimerRef.current) clearTimeout(adminLightSyncTimerRef.current);
    adminLightSyncTimerRef.current = setTimeout(() => {
      refreshDeskQueues();
    }, 350);
  }, [refreshDeskQueues]);

  useEffect(() => {
    const cached = readJson(HOOD_ADMIN_BOOTSTRAP);
    const hadCache = Boolean(cached?.data?.success);
    if (hadCache) {
      applyBootstrapPayload(cached.data);
      adminFullHydratedRef.current = true;
      setLoading(false);
    }
    void (async () => {
      await fetchAdminLite(true);
      setLoading(false);
      if (!adminFullHydratedRef.current) {
        window.setTimeout(() => fetchAllData(true), 100);
      }
    })();
    const onRefresh = () => scheduleLightAdminSync();
    window.addEventListener('hood-admin-refresh', onRefresh);
  }, [applyBootstrapPayload, fetchAdminLite, scheduleLightAdminSync]);

  useEffect(() => {
    const liteInterval = setInterval(() => {
      if (!document.hidden) fetchAdminLite(true);
    }, 45000);
    const fullInterval = setInterval(() => {
      if (!document.hidden) fetchAllData(true);
    }, 180000);
    return () => {
      clearInterval(liteInterval);
      clearInterval(fullInterval);
    };
  }, [fetchAdminLite]);

  useEffect(() => {
    if (activeTab === 'finance' && !deposits.length && !redemptions.length) {
      refreshFinanceQueue();
    }
    if ((activeTab === 'requests' || activeTab === 'game_loads') && !accountRequests.length) {
      refreshDeskQueues();
    }
  }, [activeTab, accountRequests.length, deposits.length, redemptions.length, refreshDeskQueues, refreshFinanceQueue]);

  useEffect(() => {
    if (activeTab === 'settings' && !cashbackReport) {
      loadCashbackReport();
    }
  }, [activeTab, cashbackReport, loadCashbackReport]);

  const loadPlayerDirectory = React.useCallback(
    async (search = '', page = 1, pageSize = 10) => {
      setUsersListLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          page: String(page),
        });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/users?${params}`, { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          diffSet(setUsersList, data.users);
          setUsersListTotal(Number(data.total) || data.users.length);
        }
      } catch {
        /* ignore */
      } finally {
        setUsersListLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPlayerDirectoryPage(1);
  }, [playerSearch]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    const delay = playerSearch.trim() ? 350 : 0;
    const t = setTimeout(
      () => loadPlayerDirectory(playerSearch, playerDirectoryPage, playerDirectoryPageSize),
      delay
    );
    return () => clearTimeout(t);
  }, [activeTab, playerSearch, playerDirectoryPage, playerDirectoryPageSize, loadPlayerDirectory]);

  useEffect(() => {
    const bumpCtx = { activeTabRef, selectedThreadUserRef };
    const claim = claimChatInboxAlertRef.current;

    const onStaffInstant = (payload) => {
      if (!payload?.type) return;
      if (payload.type === 'NEW_CHAT_MESSAGE') {
        const uid = String(payload.userId || payload.conversationId || '').trim();
        const msgId = String(payload.message?.id || payload.message?._id || '').trim();
        const tsNum = Number(payload.timestamp || payload.time || Date.now());
        const dedupKey = msgId ? `inbound:${uid}:${msgId}` : `inbound:${uid}:${Math.floor(tsNum / 3000)}`;
        if (claim(dedupKey)) {
          applyInboundChatThreadBump(setChatThreads, payload, bumpCtx);
          playAdminChime('bell');
        }
        scheduleChatInboxRefresh();
        return;
      }
      if (
        payload.type === 'NEW_DEPOSIT' ||
        payload.type === 'NEW_WITHDRAW' ||
        payload.type === 'NEW_COIN_LOAD' ||
        payload.type === 'NEW_GAME_ID_REQUEST'
      ) {
        refreshDeskQueues();
      }
    };

    const onDesk = () => scheduleLightAdminSync();
    const onStaffEv = (e) => onStaffInstant(e.detail);
    window.addEventListener('hood-admin-desk-sync', onDesk);
    window.addEventListener('hood_staff_event_local', onStaffEv);

    return () => {
      window.removeEventListener('hood-admin-desk-sync', onDesk);
      window.removeEventListener('hood_staff_event_local', onStaffEv);
      if (chatInboxRefreshTimerRef.current) clearTimeout(chatInboxRefreshTimerRef.current);
    };
  }, [playAdminChime, scheduleChatInboxRefresh, refreshDeskQueues, scheduleLightAdminSync]);

  const loadConversation = async (userId, isSilent = false) => {
    const uid = String(userId || '');
    if (!uid) return;

    let requestId = conversationReqIdRef.current;
    if (!isSilent) {
      requestId = ++conversationReqIdRef.current;
      setSelectedThreadUser(uid);
      setChatDeskPane('conversation');
      const cached = conversationCacheRef.current.get(uid);
      const threadHint = (chatThreads || []).find((t) => String(t.userId) === uid);
      if (cached) {
        setThreadMessages(cached.messages);
        setThreadMeta(cached.threadMeta);
        setThreadPlayerDetail(cached.player);
      } else {
        setThreadMessages([]);
        setThreadMeta({ labels: [], staffNotes: [] });
        setThreadPlayerDetail(
          threadHint
            ? { id: uid, username: threadHint.username, email: threadHint.userEmail }
            : null
        );
      }
      setConversationLoading(true);
    } else if (String(selectedThreadUserRef.current) !== uid) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await staffApiFetch(`/api/chat?userId=${encodeURIComponent(uid)}&_t=${Date.now()}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (String(selectedThreadUserRef.current) !== uid) return;
      if (!isSilent && requestId !== conversationReqIdRef.current) return;
      if (!data?.success) {
        if (!isSilent) hoodAlert.error(data?.error || 'Could not load chat', 'Chat');
        return;
      }
      const messages = dedupeChatMessagesById(data.messages || []);
      const threadMeta = data.threadMeta || { labels: [], staffNotes: [] };
      const player =
        data.player ||
        (() => {
          const hint = (chatThreads || []).find((t) => String(t.userId) === uid);
          return hint ? { id: uid, username: hint.username, email: hint.userEmail } : null;
        })();
      conversationCacheRef.current.set(uid, { messages, threadMeta, player });
      setThreadMessages(messages);
      setThreadMeta(threadMeta);
      if (player) setThreadPlayerDetail(player);
      setChatThreads((prev) =>
        prev.map((t) => (threadKey(t) === uid ? { ...t, unreadCount: 0 } : t))
      );
    } catch (e) {
      console.error(e);
      if (!isSilent && String(selectedThreadUserRef.current) === uid) {
        hoodAlert.error('Chat load timed out or failed. Tap refresh or pick the thread again.', 'Chat');
      }
    } finally {
      clearTimeout(timeout);
      if (!isSilent && String(selectedThreadUserRef.current) === uid) {
        setConversationLoading(false);
      }
    }
  };

  // Poll conversation silently if a thread is open
  useEffect(() => {
    if (!selectedThreadUser) return;
    const interval = setInterval(() => {
      if (!document.hidden) loadConversation(selectedThreadUser, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedThreadUser]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    refreshChatInbox();
    const interval = setInterval(() => {
      if (!document.hidden) refreshChatInbox();
    }, 22000);
    return () => clearInterval(interval);
  }, [activeTab, refreshChatInbox]);

  // Stabilize admin chat scroll: only scroll when switching thread or new messages arrive
  useEffect(() => {
    if (!adminChatScrollRef.current) return;
    const userChanged = lastActiveThreadUser.current !== selectedThreadUser;
    const newMessagesArrived = threadMessages.length > prevAdminMessageCount.current;

    if (userChanged || newMessagesArrived) {
      adminChatScrollRef.current.scrollTop = adminChatScrollRef.current.scrollHeight;
      prevAdminMessageCount.current = threadMessages.length;
      lastActiveThreadUser.current = selectedThreadUser;
    }
  }, [threadMessages, selectedThreadUser]);

  // Staff sends reply in chat
  const handleStaffChatFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatAttachUploading(true);
    try {
      const dataUrl = await compressImageFile(file, { maxSize: 1200, quality: 0.65, maxChars: 140000 });
      setChatAttachImage(dataUrl);
    } catch (err) {
      hoodAlert.error(err?.message || 'Upload failed', 'Upload failed');
    } finally {
      setChatAttachUploading(false);
      e.target.value = '';
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachImage) || !selectedThreadUser) return;
    const text = chatInput.trim();
    const imageUrl = chatAttachImage;
    setChatInput('');
    setChatAttachImage(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      _id: optimisticId,
      text,
      imageUrl,
      senderRole: 'staff',
      username: user?.username || 'Staff',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setThreadMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await staffApiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageUrl, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === optimisticId || m._id === optimisticId ? data.message : m))
        );
        playTune('coin');
        refreshChatInbox();
      } else {
        setThreadMessages((prev) => prev.filter((m) => m.id !== optimisticId && m._id !== optimisticId));
        hoodAlert.error(data.error || 'Failed to send reply', 'Reply failed');
        setChatInput(text);
        setChatAttachImage(imageUrl);
      }
    } catch (e) {
      setThreadMessages((prev) => prev.filter((m) => m.id !== optimisticId && m._id !== optimisticId));
      console.error(e);
    }
  };

  // Add Label to player
  const handleAddLabel = async () => {
    if (!newLabelInput.trim() || !selectedThreadUser) return;
    const labelToAdd = newLabelInput.trim();
    setNewLabelInput('');

    try {
      const res = await staffApiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_label', label: labelToAdd, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMeta((prev) => ({ ...prev, labels: data.labels }));
        // Refresh thread list badge
        setChatThreads((prev) =>
          prev.map((t) => (t.userId === selectedThreadUser ? { ...t, labels: data.labels } : t))
        );
      }
    } catch (e) {}
  };

  // Remove Label
  const handleRemoveLabel = async (lbl) => {
    if (!selectedThreadUser) return;
    try {
      const res = await staffApiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_label', label: lbl, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMeta((prev) => ({ ...prev, labels: data.labels }));
        setChatThreads((prev) =>
          prev.map((t) => (t.userId === selectedThreadUser ? { ...t, labels: data.labels } : t))
        );
      }
    } catch (e) {}
  };

  // Add Staff Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteInput.trim() || !selectedThreadUser) return;
    const noteText = newNoteInput.trim();
    setNewNoteInput('');

    try {
      const res = await staffApiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', note: noteText, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMeta((prev) => ({ ...prev, staffNotes: data.staffNotes }));
      }
    } catch (e) {}
  };

  // Delete Staff Note
  const handleDeleteNote = async (noteId) => {
    if (!selectedThreadUser) return;
    try {
      const res = await staffApiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_note', noteId, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMeta((prev) => ({ ...prev, staffNotes: data.staffNotes }));
      }
    } catch (e) {}
  };

  // Approve/Reject Deposit
  const markDepositProcessing = (id, on) => {
    const key = String(id);
    const next = new Set(processingDepositIdsRef.current);
    if (on) next.add(key);
    else next.delete(key);
    processingDepositIdsRef.current = next;
    setProcessingDepositIds(new Set(next));
  };

  const handleDepositAction = async (depositId, action) => {
    const idKey = String(depositId);
    if (processingDepositIdsRef.current.has(idKey)) return;

    let reason = null;
    if (action === 'reject') {
      const values = await hoodPromptForm({
        title: 'Reject deposit',
        message: 'Add a short reason the player will see on their wallet.',
        variant: 'warning',
        confirmLabel: 'Reject deposit',
        pill: 'FINANCE DESK',
        fields: [
          {
            name: 'reason',
            label: 'Rejection reason',
            placeholder: 'e.g. Payment screenshot unclear',
            required: true,
          },
        ],
      });
      if (!values?.reason) return;
      reason = values.reason;
    }

    markDepositProcessing(idKey, true);
    const optimisticStatus = action === 'approve' ? 'approved' : 'rejected';
    setDeposits((prev) =>
      prev.map((d) => (String(d._id) === idKey ? { ...d, status: optimisticStatus } : d))
    );

    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId: idKey, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success(data.message, 'Deposit updated');
        setDeposits((prev) =>
          prev.map((d) => (String(d._id) === idKey ? { ...d, status: data.deposit?.status || optimisticStatus } : d))
        );
        refreshFinanceQueue();
      } else {
        setDeposits((prev) =>
          prev.map((d) => (String(d._id) === idKey ? { ...d, status: 'pending' } : d))
        );
        hoodAlert.error(data.error, 'Deposit update failed');
        refreshFinanceQueue();
      }
    } catch (e) {
      setDeposits((prev) =>
        prev.map((d) => (String(d._id) === idKey ? { ...d, status: 'pending' } : d))
      );
      hoodAlert.error('Error updating deposit');
    } finally {
      markDepositProcessing(idKey, false);
    }
  };

  // Approve/Reject Redemption
  const handleRedemptionAction = async (redemptionId, action) => {
    let reason = null;
    if (action === 'reject') {
      const values = await hoodPromptForm({
        title: 'Reject cashout',
        message: 'Tell the player why this redemption was returned.',
        variant: 'warning',
        confirmLabel: 'Reject cashout',
        pill: 'FINANCE DESK',
        fields: [
          {
            name: 'reason',
            label: 'Rejection reason',
            placeholder: 'e.g. Invalid payout address',
            required: true,
          },
        ],
      });
      if (!values?.reason) return;
      reason = values.reason;
    }
    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success(data.message, 'Redemption updated');
        fetchAllData();
      } else {
        hoodAlert.error(data.error, 'Redemption update failed');
      }
    } catch (e) {
      hoodAlert.error('Error updating redemption');
    }
  };

  // Approve Account Request
  const handleApproveAccountRequest = async (requestId) => {
    const req = accountRequests.find((r) => r._id === requestId);
    const playerUsername = req?.username || '';
    const makePair = () => generateGameCredentialPair(playerUsername);
    const initial = makePair();

    const values = await hoodPromptForm({
      title: 'Issue game login & PIN',
      message:
        'Suggested credentials are filled in automatically — edit them or tap “Generate new” before sending.',
      variant: 'success',
      confirmLabel: 'Issue login & PIN',
      pill: 'GAME ID DESK',
      regenerate: () => makePair(),
      regenerateLabel: 'Generate new username & PIN',
      fields: [
        {
          name: 'gameUsername',
          label: 'Game username',
          placeholder: 'Platform login ID',
          icon: 'user',
          required: true,
          defaultValue: initial.gameUsername,
          regenerate: () => generateGameUsername(playerUsername),
        },
        {
          name: 'gamePassword',
          label: 'Game password / PIN',
          placeholder: 'Platform password',
          icon: 'lock',
          required: true,
          defaultValue: initial.gamePassword,
          regenerate: () => generateGamePassword(),
        },
      ],
    });
    if (!values?.gameUsername || !values?.gamePassword) return;

    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'approve',
          gameUsername: values.gameUsername,
          gamePassword: values.gamePassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success('Credentials issued!', 'Request approved');
        fetchAllData();
      }
    } catch (e) {
      hoodAlert.error('Error approving request');
    }
  };

  const handleFreeplayWalletCredit = async (requestId, amount) => {
    const ok = await hoodConfirm({
      title: 'Credit Freeplay to wallet',
      message: `Credit $${Number(amount || 0).toFixed(2)} SC to player wallet after screenshot verification?`,
      confirmLabel: 'Credit SC',
      pill: 'FREEPLAY DESK',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'freeplay_wallet' }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success(data.message, 'Freeplay approved');
        fetchAllData();
      } else hoodAlert.error(data.error || 'Failed');
    } catch {
      hoodAlert.error('Error crediting freeplay');
    }
  };

  const handleRejectAccountRequest = async (requestId) => {
    const values = await hoodPromptForm({
      title: 'Reject request',
      message: 'Reason shown to the player.',
      variant: 'warning',
      confirmLabel: 'Reject',
      fields: [{ name: 'reason', label: 'Reason', required: true, placeholder: 'e.g. Screenshot unclear' }],
    });
    if (!values?.reason) return;
    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'reject', rejectionReason: values.reason }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success('Request rejected', 'Game ID desk');
        fetchAllData();
      } else hoodAlert.error(data.error || 'Failed');
    } catch {
      hoodAlert.error('Error rejecting request');
    }
  };

  // Save Settings & 5 Action Cards
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          quickActionCards: editingCards,
        }),
      });
      const data = await res.json();
      if (data.success) {
        hoodAlert.success('System settings and 5 Action Cards saved successfully!', 'Settings saved');
        setSettings(data.settings);
        if (data.settings?.adminDefaultAlertTune) {
          setAlertTune(data.settings.adminDefaultAlertTune);
          localStorage.setItem('hood_admin_alert_tune', data.settings.adminDefaultAlertTune);
        }
        if (data.settings?.playerTouchTune) setPlayerTouchTune(data.settings.playerTouchTune);
      }
    } catch (e) {
      hoodAlert.error('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Disburse Sunday Cashback to all eligible players in 1-click
  const handleDisburseAllCashback = async () => {
    const ok = await hoodConfirm({
      title: 'Disburse Sunday Cashback',
      message: 'Are you sure you want to disburse Sunday Cashback to all qualified players? This cannot be undone in one click.',
      confirmLabel: 'Yes, disburse now',
      cancelLabel: 'Not yet',
    });
    if (!ok) return;
    setDisbursingCashback(true);
    playTune('coin');
    try {
      const res = await fetch('/api/cashback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_disburse_all' }),
      });
      const data = await res.json();
      if (data?.success) {
        hoodAlert.success(data.message, 'Cashback disbursed');
        fetchAllData(true);
      } else {
        hoodAlert.error(data?.error || 'Failed to disburse cashback');
      }
    } catch {
      hoodAlert.error('Network error disbursing cashback');
    } finally {
      setDisbursingCashback(false);
    }
  };

  // Direct Player Balance & Account Management Handler
  const handleSavePlayerUpdates = async (e) => {
    e.preventDefault();
    if (!selectedPlayerToEdit) return;
    setSavingPlayer(true);
    playTune('click');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedPlayerToEdit._id,
          balanceSC: Number(editBalanceSC),
          balanceGC: Number(editBalanceGC),
          status: editStatus,
          role: editRole,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        hoodAlert.success(`Player ${selectedPlayerToEdit.username} updated successfully!`, 'Player updated');
        setSelectedPlayerToEdit(null);
        fetchAllData(true);
      } else {
        hoodAlert.error(data?.error || 'Failed to update player');
      }
    } catch {
      hoodAlert.error('Network error updating player');
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleUnbindPlayerDevice = async () => {
    if (!selectedPlayerToEdit) return;
    const bound =
      selectedPlayerToEdit.deviceId ||
      (Array.isArray(selectedPlayerToEdit.boundDevices) && selectedPlayerToEdit.boundDevices[0]);
    if (!bound) {
      hoodAlert.info('This player has no device linked.', 'Device');
      return;
    }
    const ok = await hoodConfirm(
      `Unbind device for ${selectedPlayerToEdit.username}? Another account will be able to use this phone after unbind.`,
      'Unbind device'
    );
    if (!ok) return;
    setUnbindingDevice(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedPlayerToEdit._id, unbindDevice: true }),
      });
      const data = await res.json();
      if (data?.success) {
        hoodAlert.success('Device unbound. Player can re-link on next login.', 'Device unbound');
        setSelectedPlayerToEdit(null);
        fetchAllData(true);
      } else {
        hoodAlert.error(data?.error || 'Could not unbind device');
      }
    } catch {
      hoodAlert.error('Network error unbinding device');
    } finally {
      setUnbindingDevice(false);
    }
  };

  // Nav Item click helper for auto-closing mobile menu
  const selectNavTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    playTune('click');
    if (tab === 'chat') {
      setChatDeskPane(selectedThreadUser ? 'conversation' : 'inbox');
      refreshChatInbox();
    } else {
      setChatDeskPane('inbox');
    }
    if (tab === 'requests') {
      refreshDeskQueues();
      window.dispatchEvent(new CustomEvent('hood-admin-desk-sync'));
    }
  };

  const chatPanelVisibility = (pane) =>
    `${chatDeskPane === pane ? 'flex' : 'hidden'} xl:flex`;

  const siteLogo = settings?.logoUrl || '/logo.png';

  const renderLogo = (padClass) =>
    siteLogo.startsWith('data:image') ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={siteLogo} alt="Hood Games" className={`w-full h-full object-contain ${padClass}`} />
    ) : (
      <Image src={siteLogo} alt="Hood Games" fill className={`object-contain ${padClass}`} />
    );

  return (
    <div className="font-sans h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#070d1e] text-gray-100 flex flex-col md:flex-row relative">
      {/* 1. Mobile Topbar (Strictly visible on screens < md) */}
      <div className="md:hidden sticky top-0 z-40 bg-[#09142a]/95 backdrop-blur-xl border-b border-[#1a3363] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#2cb64e]/50 bg-[#070d1e] flex items-center justify-center">
            {renderLogo('p-0.5')}
          </div>
          <div>
            <h2 className="font-heading text-xs font-black text-white">
              HOOD <span className="text-[#2cb64e]">ADMIN</span>
            </h2>
            <span className="text-[9px] text-[#2cb64e] font-mono font-bold uppercase tracking-wider">
              {activeTab}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-300 hover:text-white"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 2. Responsive Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-in fade-in"
        />
      )}

      {/* 3. Admin Sidebar (Permanent on Desktop, Drawer on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#09142a] border-r border-[#1a3363] p-4 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain`}
      >
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#2cb64e]/50 bg-[#070d1e] flex items-center justify-center">
                {renderLogo('p-1')}
              </div>
              <div>
                <h2 className="font-heading text-sm font-black text-white">
                  HOOD <span className="text-[#2cb64e]">ADMIN</span>
                </h2>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Concierge Master
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => selectNavTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Command Center</span>
            </button>

            <button
              onClick={() => selectNavTab('finance')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'finance'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet size={16} />
                <span>Finance & Cashier</span>
              </div>
              <NavCountBadge count={pendingFinanceCount} tone="amber" />
            </button>

            <button
              onClick={() => selectNavTab('gateways')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'gateways'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <CreditCard size={16} />
              <span>Payment Gateways</span>
            </button>

            <button
              onClick={() => selectNavTab('game_loads')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'game_loads'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Coins size={16} />
                <span>Coins Allotment</span>
              </div>
              <NavCountBadge count={pendingLoadCount} tone="green" />
            </button>

            <button
              onClick={() => selectNavTab('requests')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'requests'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key size={16} />
                <span>Account Requests</span>
              </div>
              <NavCountBadge count={pendingAccountDeskCount} tone="blue" />
            </button>

            <button
              onClick={() => selectNavTab('chat')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} />
                <span>Support (Labels/Notes)</span>
              </div>
              {unreadChatCount > 0 ? (
                <NavCountBadge count={unreadChatCount} tone="rose" />
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[#2cb64e]/20 text-[#2cb64e] text-[9px] font-black uppercase">
                  Live
                </span>
              )}
            </button>

            <button
              onClick={() => selectNavTab('cards')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cards'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Sparkles size={16} />
              <span>5 Action Cards</span>
            </button>

            <button
              onClick={() => selectNavTab('games_lib')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'games_lib'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Gamepad2 size={16} />
              <span>Games Library</span>
            </button>

            <button
              onClick={() => selectNavTab('daily_spin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'daily_spin'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Sparkles size={16} />
              <span>Daily Spin Wheel</span>
            </button>

            <button
              onClick={() => selectNavTab('vip_privilege')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'vip_privilege'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Crown size={16} />
              <span>VIP Privilege Page</span>
            </button>

            <button
              onClick={() => selectNavTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Settings size={16} />
              <span>Cashback & Settings</span>
            </button>

            <button
              onClick={() => selectNavTab('ledger')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ledger'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <FileSpreadsheet size={16} />
              <span>Transaction Logs</span>
            </button>

            <button
              onClick={() => selectNavTab('promos')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'promos'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Megaphone size={16} />
              <span>Promotions</span>
            </button>

            <button
              onClick={() => selectNavTab('affiliates')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'affiliates'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Link2 size={16} />
              <span>Affiliates 50%</span>
            </button>

            <button
              onClick={() => selectNavTab('affiliate_commissions')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'affiliate_commissions'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <DollarSign size={16} />
              <span>Affiliate Commissions</span>
            </button>

            <button
              onClick={() => selectNavTab('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <Users size={16} />
              <span>Player Accounts</span>
            </button>

            <button
              onClick={() => selectNavTab('staff')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'staff'
                  ? 'btn-hood-green text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#0e2042]'
              }`}
            >
              <UserCheck size={16} />
              <span>Staff Management</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Station */}
        <div className="pt-4 border-t border-[#1a3363] space-y-2">
          <button
            type="button"
            onClick={enableDesktopNotifications}
            className="w-full py-2 rounded-xl bg-[#12244c] text-[10px] font-black uppercase text-cyan-300 hover:text-white border border-cyan-500/30 flex items-center justify-center gap-1.5"
          >
            🔔 {desktopNotifPerm === 'granted' ? 'Alerts Enabled' : 'Enable Sound & Desktop Alerts'}
          </button>
          <div className="flex items-center gap-2 px-1">
            <label className="text-[10px] text-gray-400 font-bold shrink-0">Alert sound</label>
            <select
              value={alertTune}
              onChange={(e) => {
                setAlertTune(e.target.value);
                localStorage.setItem('hood_admin_alert_tune', e.target.value);
                playAdminChime(e.target.value);
              }}
              className="hood-input flex-1 py-1 px-2 rounded-lg text-[10px] font-bold"
            >
              {AVAILABLE_TUNES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/"
            className="w-full py-2 rounded-xl bg-[#070d1e] text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-1.5 border border-[#1a3363]"
          >
            <span>Return to Site</span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 rounded-xl bg-rose-950/30 text-rose-300 text-xs font-bold hover:bg-rose-900/50 flex items-center justify-center gap-1.5 transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex flex-col flex-1 min-h-0 min-w-0 w-full p-3 sm:p-6 lg:p-8 overflow-y-auto overscroll-contain md:ml-64">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-4 sm:pb-6 border-b border-[#1a3363]">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-tight">
              {{
                overview: 'Overview Desk',
                finance: 'Finance & Cashier Queue',
                gateways: 'Payment Gateways',
                game_loads: 'Game Credit Load Queue',
                requests: 'Game ID Requests',
                chat: 'Live VIP Support',
                cards: 'Quick Action Cards',
                games_lib: 'Games Library',
                settings: 'Cashback & Settings',
                ledger: 'Financial Ledger',
                users: 'Player Management',
                staff: 'Staff & Access',
                promos: 'Promotions',
                affiliates: 'Affiliates',
                daily_spin: 'Daily Spin Wheel',
                vip_privilege: 'VIP Privilege Page',
                coins: 'Coins Allotment',
              }[activeTab] || activeTab}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
              Admin controls & real-time operations for Hood Games.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="p-2.5 rounded-xl bg-[#09142a] border border-[#1a3363] text-gray-300 hover:text-white shrink-0 mt-0.5"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 1. OVERVIEW TAB                                          */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363]">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Players</span>
                <span className="text-3xl font-black text-white font-mono">{stats?.totalUsers || 0}</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363]">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Approved Deposits</span>
                <span className="text-3xl font-black text-[#2cb64e] font-mono">
                  ${Number(stats?.totalDepositVol || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363]">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Cashouts</span>
                <span className="text-3xl font-black text-blue-400 font-mono">
                  ${Number(stats?.totalRedeemVol || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363]">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Net Revenue</span>
                <span className="text-3xl font-black text-amber-300 font-mono">
                  ${Number(stats?.netRevenue || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Pending Queues */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('finance')}
                className="p-5 rounded-2xl bg-[#09142a] border border-amber-500/40 hover:border-amber-400 cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Pending Deposits</h4>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {stats?.pendingDeposits || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Awaiting payment verification & match crediting.</p>
              </div>

              <div
                onClick={() => setActiveTab('finance')}
                className="p-5 rounded-2xl bg-[#09142a] border border-blue-500/40 hover:border-blue-400 cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Pending Cashouts</h4>
                  <span className="text-xl font-black text-blue-400 font-mono">
                    {stats?.pendingRedemptions || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Players waiting for Cashtag / Zelle settlement.</p>
              </div>

              <div
                onClick={() => setActiveTab('requests')}
                className="p-5 rounded-2xl bg-[#09142a] border border-purple-500/40 hover:border-purple-400 cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Game ID Requests</h4>
                  <span className="text-xl font-black text-purple-400 font-mono">
                    {pendingAccountDeskCount}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Players requesting Orion, Kirin, or Panda logins.</p>
              </div>

              <div
                onClick={() => setActiveTab('game_loads')}
                className="p-5 rounded-2xl bg-[#09142a] border border-[#2cb64e]/40 hover:border-[#2cb64e] cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Coin Load Queue</h4>
                  <span className="text-xl font-black text-[#2cb64e] font-mono">{pendingLoadCount}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Approved deposits waiting for in-game SC allotment.</p>
              </div>

              <div
                onClick={() => setActiveTab('requests')}
                className="p-5 rounded-2xl bg-[#09142a] border border-pink-500/40 hover:border-pink-400 cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Freeplay Verifications</h4>
                  <span className="text-xl font-black text-pink-300 font-mono">{pendingFreeplayCount}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Inbox screenshot tasks — credit welcome SC from Game ID desk.</p>
              </div>

              <div
                onClick={() => setActiveTab('chat')}
                className="p-5 rounded-2xl bg-[#09142a] border border-rose-500/40 hover:border-rose-400 cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">Unread Live Chat</h4>
                  <span className="text-xl font-black text-rose-300 font-mono">{unreadChatCount}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Support threads with labels & staff notes (Hood layout).</p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. FINANCE TAB: DEPOSITS & CASHOUTS                      */}
        {/* ======================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-6 sm:space-y-8 pt-4 sm:pt-6">
            {/* Deposits Section */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-black text-white flex flex-wrap items-center gap-2">
                <Wallet size={18} className="text-[#2cb64e] shrink-0" />
                <span>Player Deposit Queue ({deposits.length})</span>
              </h3>
              <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a] touch-pan-x">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Bonus Match</th>
                      <th className="p-3">Total Credited</th>
                      <th className="p-3">Gateway</th>
                      <th className="p-3">Sender Cashtag</th>
                      <th className="p-3">Receipt</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a3363]">
                    {deposits.map((d) => (
                      <tr key={d._id} className="hover:bg-[#0e2042]/50">
                        <td className="p-3 font-bold text-white">{d.username}</td>
                        <td className="p-3 font-mono font-bold text-white">${d.amount}</td>
                        <td className="p-3 text-amber-300 font-mono">+${d.bonusAmount} ({d.bonusPercent}%)</td>
                        <td className="p-3 font-mono font-black text-[#2cb64e]">${d.totalExpectedSC} SC</td>
                        <td className="p-3 text-gray-300">{d.method}</td>
                        <td className="p-3 font-mono text-cyan-300 select-all">{d.senderTag || 'N/A'}</td>
                        <td className="p-3">
                          {d.proofImage || d.receiptImage || d.hasProof ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingProof(
                                  d.proofImage || `/api/payments/deposit/proof?id=${d._id}`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0c1b38] hover:bg-[#12244c] border border-cyan-500/40 text-cyan-300 text-[10px] font-bold transition-all shadow-sm"
                            >
                              <Eye size={12} />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-gray-500 text-[10px]">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              d.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : d.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {d.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={processingDepositIds.has(String(d._id))}
                                onClick={() => handleDepositAction(d._id, 'approve')}
                                className="px-2.5 py-1 rounded bg-[#2cb64e] text-white font-bold text-[10px] hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                              >
                                {processingDepositIds.has(String(d._id)) ? '…' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={processingDepositIds.has(String(d._id))}
                                onClick={() => handleDepositAction(d._id, 'reject')}
                                className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Redemptions Section */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-black text-white flex flex-wrap items-center gap-2">
                <ArrowUpRight size={18} className="text-blue-400 shrink-0" />
                <span>Player Redemption / Cashout Queue ({redemptions.length})</span>
              </h3>
              <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a] touch-pan-x">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Redeem Amount</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Destination Tag / Address</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a3363]">
                    {redemptions.map((r) => (
                      <tr key={r._id} className="hover:bg-[#0e2042]/50">
                        <td className="p-3 font-bold text-white">{r.username}</td>
                        <td className="p-3 font-mono font-black text-blue-300">${r.amount} SC</td>
                        <td className="p-3 text-gray-300">{r.payoutMethod || r.method}</td>
                        <td className="p-3 font-mono text-white select-all">
                          {r.destinationTag || r.payoutAddress}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : r.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {r.status === 'pending' &&
                            (r.stage === 'finance_payout' || !r.stage) &&
                            r.status !== 'pending_coin' && (
                            <>
                              <button
                                onClick={() => handleRedemptionAction(r._id, 'approve')}
                                className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleRedemptionAction(r._id, 'reject')}
                                className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700"
                              >
                                Reject & Refund
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. CHAT SUPPORT WITH LABELS & NOTES (KEY REQUIREMENT #9) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="pt-4 sm:pt-6 space-y-3 sm:space-y-4 flex flex-col min-h-0 flex-1">
            <div className="rounded-2xl sm:rounded-3xl border border-[#2cb64e]/25 bg-gradient-to-r from-[#0c1b38]/95 via-[#09142a] to-[#070d1e] p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)] shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2cb64e]/15 border border-[#2cb64e]/35 text-[#2cb64e] text-[10px] font-black uppercase tracking-wider">
                    <MessageSquare size={14} />
                    <span>VIP Concierge Desk</span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-2xl font-black text-white tracking-tight">Support chat</h3>
                  <p className="text-[11px] sm:text-xs text-gray-400 max-w-xl leading-relaxed sm:hidden">
                    Pick a thread, reply in the center, then open CRM for labels &amp; staff notes.
                  </p>
                  <p className="hidden sm:block text-xs text-gray-400 max-w-xl leading-relaxed">
                    Left: inbox (unread badge). Center: live thread — green bubbles = staff, gray = player. Right:
                    internal CRM — labels players see in chat; notes are staff-only.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {unreadChatCount > 0 && (
                    <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-[11px] font-bold">
                      {unreadChatCount} unread player message{unreadChatCount === 1 ? '' : 's'}
                    </span>
                  )}
                  <span className="px-3 py-1.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-300 text-[11px] font-bold">
                    {chatThreads.length} thread{chatThreads.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="flex xl:hidden gap-1.5 mt-3 p-1 rounded-xl bg-[#070d1e]/80 border border-[#1a3363]">
                {[
                  { id: 'inbox', label: 'Inbox', icon: Inbox },
                  { id: 'conversation', label: 'Chat', icon: MessageSquare, disabled: !selectedThreadUser },
                  { id: 'crm', label: 'CRM', icon: Tag, disabled: !selectedThreadUser },
                ].map(({ id, label, icon: Icon, disabled }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setChatDeskPane(id)}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-black uppercase transition-colors ${
                      chatDeskPane === id
                        ? 'bg-[#2cb64e] text-black'
                        : disabled
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 gap-3 sm:gap-4 xl:grid xl:grid-cols-12 xl:min-h-[min(700px,calc(100dvh-12rem))]">
              {/* Left: inbox */}
              <div
                className={`xl:col-span-3 rounded-2xl bg-[#09142a] border border-[#1a3363] flex-col overflow-hidden shadow-lg min-h-0 max-xl:flex-1 ${chatPanelVisibility('inbox')}`}
              >
                <div className="p-3 bg-[#0c1b38] border-b border-[#1a3363] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Inbox size={14} className="text-[#2cb64e]" />
                      Inbox
                    </h4>
                    {unreadChatCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#2cb64e] text-black text-[9px] font-black">{unreadChatCount}</span>
                    )}
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="search"
                      value={chatThreadQuery}
                      onChange={(e) => setChatThreadQuery(e.target.value)}
                      placeholder="Search name, email, message..."
                      className="hood-input w-full pl-8 pr-2 py-2 rounded-xl text-[11px]"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#1a3363]">
                  {filteredChatThreads.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-gray-500">
                      {chatThreads.length === 0 ? 'No conversations yet.' : 'No threads match your search.'}
                    </div>
                  ) : (
                    filteredChatThreads.map((t) => (
                      <button
                        key={t.userId}
                        type="button"
                        onClick={() => loadConversation(t.userId)}
                        className={`w-full text-left p-3 transition-colors ${
                          selectedThreadUser === t.userId ? 'bg-[#12244c] ring-1 ring-inset ring-[#2cb64e]/35' : 'hover:bg-[#0e2042]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{t.username}</span>
                              {t.unreadCount > 0 && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-[#2cb64e] text-black text-[9px] font-black">
                                  {t.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{t.userEmail || '—'}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-1">{t.lastMessage || '…'}</p>
                            {t.labels && t.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {t.labels.slice(0, 3).map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded bg-[#2cb64e]/20 text-[#2cb64e] text-[9px] font-bold"
                                  >
                                    {lbl}
                                  </span>
                                ))}
                                {t.labels.length > 3 && (
                                  <span className="text-[9px] text-gray-500">+{t.labels.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-500 shrink-0">{formatThreadTime(t.lastMessageAt)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Center: conversation */}
              <div
                className={`xl:col-span-6 rounded-2xl bg-[#09142a] border border-[#1a3363] flex-col overflow-hidden shadow-lg min-h-0 max-xl:flex-1 min-h-[min(420px,55dvh)] xl:min-h-[480px] ${chatPanelVisibility('conversation')}`}
              >
                <div className="p-3 sm:p-3.5 bg-[#0c1b38] border-b border-[#1a3363] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2 w-full">
                    <button
                      type="button"
                      className="xl:hidden shrink-0 p-2 rounded-lg bg-[#070d1e] border border-[#1a3363] text-gray-300 hover:text-white"
                      onClick={() => setChatDeskPane('inbox')}
                      aria-label="Back to inbox"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-white truncate">
                      {selectedThreadUser ? threadPlayerDetail?.username || 'Player' : 'Pick a thread'}
                    </h4>
                    {selectedThreadUser && threadPlayerDetail?.email && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                        <Mail size={11} className="shrink-0 text-gray-500" />
                        {threadPlayerDetail.email}
                      </p>
                    )}
                    </div>
                    {selectedThreadUser && (
                      <button
                        type="button"
                        className="xl:hidden shrink-0 p-2 rounded-lg bg-[#070d1e] border border-[#2cb64e]/40 text-[#2cb64e]"
                        onClick={() => setChatDeskPane('crm')}
                        aria-label="Labels and notes"
                      >
                        <PanelRight size={18} />
                      </button>
                    )}
                  </div>
                  {selectedThreadUser && threadPlayerDetail && (
                    <div className="flex flex-wrap gap-2 text-[10px] w-full sm:w-auto items-center">
                      <button
                        type="button"
                        onClick={() => setPlayer360Id(String(threadPlayerDetail.id || selectedThreadUser))}
                        className="px-2 py-1 rounded-lg border border-[#2cb64e]/45 text-[#2cb64e] font-black uppercase tracking-wide hover:bg-[#2cb64e]/10"
                      >
                        360° Profile
                      </button>
                      <span className="px-2 py-1 rounded-lg bg-[#070d1e] border border-[#1a3363] text-gray-300 font-mono font-bold">
                        SC ${Number(threadPlayerDetail.balanceSC ?? 0).toFixed(2)}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-[#070d1e] border border-[#1a3363] text-gray-300 font-mono font-bold">
                        GC {Number(threadPlayerDetail.balanceGC ?? 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div ref={adminChatScrollRef} className="flex-1 p-3 sm:p-4 overflow-y-auto overscroll-contain space-y-3 bg-gradient-to-b from-[#070d1e]/90 to-[#070d1e] min-h-[200px]">
                  {!selectedThreadUser ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-12 text-gray-500">
                      <MessageSquare size={40} className="text-[#2cb64e]/40 mb-3" />
                      <p className="text-sm font-bold text-gray-400">
                        <span className="xl:hidden">Open Inbox and tap a player</span>
                        <span className="hidden xl:inline">Select a player on the left</span>
                      </p>
                      <p className="text-[11px] mt-1 max-w-xs">
                        Unread counts show how many player messages need a reply. Attach screenshots with the paperclip.
                      </p>
                    </div>
                  ) : conversationLoading && threadMessages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">Loading messages…</div>
                  ) : threadMessages.length === 0 ? (
                    <p className="text-center text-[11px] text-gray-500 py-8">No messages in this thread yet.</p>
                  ) : (
                    threadMessages.map((m, idx) => (
                      <HoodChatMessageBubble key={m._id || idx} message={m} isMine={m.senderRole === 'staff'} />
                    ))
                  )}
                </div>

                {selectedThreadUser && (
                  <>
                    {chatAttachImage ? (
                      <div className="px-3 py-2 border-t border-[#1a3363] bg-[#0c1b38] flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={chatAttachImage}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover border border-[#2cb64e]/40"
                        />
                        <span className="text-[10px] text-gray-400 flex-1">Image attached — player will see this in chat</span>
                        <button
                          type="button"
                          onClick={() => setChatAttachImage(null)}
                          className="text-rose-400 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <form onSubmit={handleSendReply} className="p-2 sm:p-3 bg-[#0c1b38] border-t border-[#1a3363] flex items-center gap-2 min-w-0">
                      <input
                        ref={adminChatFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleStaffChatFile}
                      />
                      <button
                        type="button"
                        onClick={() => adminChatFileRef.current?.click()}
                        disabled={chatAttachUploading}
                        className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-300 hover:text-[#2cb64e] shrink-0"
                        title="Attach image"
                      >
                        {chatAttachUploading ? <RefreshIcon size={15} className="animate-spin" /> : <Paperclip size={15} />}
                      </button>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="hood-input flex-1 px-3 py-2.5 rounded-xl text-xs min-h-[44px]"
                        placeholder="Type reply… (player sees this)"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() && !chatAttachImage}
                        className="btn-hood-green px-5 py-2.5 rounded-xl text-white text-xs font-black disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                      >
                        <Send size={15} />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Right: labels + notes */}
              <div
                className={`xl:col-span-3 rounded-2xl bg-[#09142a] border border-[#1a3363] p-3 sm:p-4 flex-col gap-4 sm:gap-5 overflow-y-auto overscroll-contain shadow-lg min-h-0 max-xl:flex-1 min-h-[min(380px,50dvh)] xl:min-h-[320px] ${chatPanelVisibility('crm')}`}
              >
                <div className="flex items-center gap-2 xl:hidden shrink-0">
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-[#070d1e] border border-[#1a3363] text-gray-300 hover:text-white"
                    onClick={() => setChatDeskPane('conversation')}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-black text-white">Back to chat</span>
                </div>
                <div className="rounded-xl bg-[#070d1e]/80 border border-[#1a3363] p-3">
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    <strong className="text-[#2cb64e]">Labels</strong> help you filter VIP / risk — they can appear on the player
                    thread. <strong className="text-amber-300">Notes</strong> are internal only (player never sees them).
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                    <Tag size={13} className="text-[#2cb64e]" />
                    <span>Player labels</span>
                  </h4>

                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
                    {threadMeta.labels?.length > 0 ? (
                      threadMeta.labels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 text-xs font-bold"
                        >
                          <span>{lbl}</span>
                          <button type="button" onClick={() => handleRemoveLabel(lbl)} className="hover:text-white">
                            <X size={11} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-500">No labels yet — add below.</span>
                    )}
                  </div>

                  {selectedThreadUser && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newLabelInput}
                        onChange={(e) => setNewLabelInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                        placeholder="VIP, High roller…"
                        className="hood-input flex-1 px-2.5 py-2 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddLabel}
                        className="px-3 py-2 rounded-lg bg-[#2cb64e] text-white text-xs font-black shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#1a3363] pt-4 flex-1 flex flex-col min-h-0">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                    <FileText size={13} className="text-amber-400" />
                    <span>Staff-only notes</span>
                  </h4>

                  <div className="space-y-2 flex-1 overflow-y-auto mb-3 max-h-[220px] xl:max-h-none">
                    {threadMeta.staffNotes?.length > 0 ? (
                      threadMeta.staffNotes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs relative group"
                        >
                          <p className="text-gray-200 text-[11px] leading-relaxed">{n.text}</p>
                          <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                            <span>By {n.author || 'Staff'}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-rose-400 hover:text-rose-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-500">No notes — use for verification &amp; risk context.</span>
                    )}
                  </div>

                  {selectedThreadUser && (
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        rows={3}
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        placeholder="e.g. Matched Cash App $50 — OK to load Panda"
                        className="hood-input w-full p-2.5 rounded-xl text-xs resize-y min-h-[72px]"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 rounded-xl bg-[#12244c] hover:bg-[#1a3363] text-white text-xs font-bold border border-[#1a3363]"
                      >
                        Save note
                      </button>
                    </form>
                  )}
                </div>

                {selectedThreadUser && threadPlayerDetail && (
                  <div className="rounded-xl bg-[#0e2042]/40 border border-[#1a3363] p-3 flex items-center gap-2 text-[10px] text-gray-400">
                    <User size={14} className="text-gray-500 shrink-0" />
                    <span>
                      Player ID: <code className="text-gray-300 font-mono">{String(threadPlayerDetail.id || selectedThreadUser)}</code>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. 5 ACTION CARDS MANAGER (REQUIREMENT #6)                */}
        {/* ======================================================== */}
        {activeTab === 'cards' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 pt-6">
            <div className="p-4 rounded-2xl bg-[#09142a] border border-[#1a3363]">
              <p className="text-xs text-gray-300">
                These are the <strong>5 Quick Action boxes</strong> displayed directly under the Winning of Random Clients ticker. You can edit each card’s title, subtitle, badge, and action tab.
              </p>
            </div>

            <div className="space-y-4">
              {editingCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2cb64e] uppercase">
                      Box #{idx + 1} ({card.id})
                    </span>
                    <span className="text-[10px] text-gray-400">Target Tab: {card.tab}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">Title</label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const updated = [...editingCards];
                          updated[idx].title = e.target.value;
                          setEditingCards(updated);
                        }}
                        className="hood-input w-full px-3 py-1.5 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={card.subtitle}
                        onChange={(e) => {
                          const updated = [...editingCards];
                          updated[idx].subtitle = e.target.value;
                          setEditingCards(updated);
                        }}
                        className="hood-input w-full px-3 py-1.5 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 block mb-1">Badge</label>
                      <input
                        type="text"
                        value={card.badge}
                        onChange={(e) => {
                          const updated = [...editingCards];
                          updated[idx].badge = e.target.value;
                          setEditingCards(updated);
                        }}
                        className="hood-input w-full px-3 py-1.5 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="btn-hood-green px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              {savingSettings ? 'Saving Changes...' : 'SAVE 5 ACTION CARDS TO DATABASE'}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* 5. CASHBACK & SYSTEM SETTINGS (REQUIREMENT #7)           */}
        {/* ======================================================== */}
        {activeTab === 'daily_spin' && (
          <form onSubmit={handleSaveSettings} className="w-full max-w-5xl space-y-6">
            <AdminDailySpinTab settings={settings} setSettings={setSettings} />
            <button
              type="submit"
              disabled={savingSettings}
              className="btn-hood-green px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              {savingSettings ? 'Saving…' : 'Save wheel to database'}
            </button>
          </form>
        )}

        {activeTab === 'vip_privilege' && (
          <form onSubmit={handleSaveSettings} className="w-full max-w-5xl space-y-6">
            <AdminVipTab settings={settings} setSettings={setSettings} />
            <button
              type="submit"
              disabled={savingSettings}
              className="btn-hood-green px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              {savingSettings ? 'Saving…' : 'Save VIP page to database'}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* 5. CASHBACK & SYSTEM SETTINGS (REQUIREMENT #7)           */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 sm:space-y-8 pt-4 sm:pt-6">
            {/* Sunday Cashback Operations Banner */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 text-xs font-black uppercase">
                  <Coins size={14} />
                  <span>Sunday Cashback Operations Hub</span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-white">
                  Disburse Sunday Net Cashback
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-300 max-w-xl">
                  Disburses weekly cashback directly to all qualified players’ balances with 0x wagering.
                  Calculated automatically as (Total Weekly Deposits − Total Weekly Cashouts) × {settings?.cashbackPercent || 10}%.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="p-3.5 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-center min-w-[130px]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Pending Pool</span>
                  <span className="text-xl font-black text-[#2cb64e] font-mono">
                    ${Number(cashbackReport?.totalPool || 0).toFixed(2)} SC
                  </span>
                </div>

                <button
                  type="button"
                  disabled={disbursingCashback}
                  onClick={handleDisburseAllCashback}
                  className="btn-hood-green px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_25px_rgba(44,182,78,0.4)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  <Coins size={16} />
                  <span>{disbursingCashback ? 'Disbursing Cashback...' : 'DISBURSE TO ALL QUALIFIED PLAYERS'}</span>
                </button>
              </div>
            </div>

            {/* Live Player Cashback Audit Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#2cb64e]" />
                  <span>Current Week Player Audit & Qualifications</span>
                </h4>
                <span className="text-xs text-gray-400">
                  Week of {cashbackReport?.weekKey || 'Current'}
                </span>
              </div>

              <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a] touch-pan-x">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Current Balance</th>
                      <th className="p-3">Week Deposits</th>
                      <th className="p-3">Week Cashouts</th>
                      <th className="p-3">Net Loss</th>
                      <th className="p-3">Rate</th>
                      <th className="p-3">Cashback Reward</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a3363]">
                    {cashbackReport?.playerReports && cashbackReport.playerReports.length > 0 ? (
                      cashbackReport.playerReports.map((p) => (
                        <tr key={p.userId} className="hover:bg-[#0c1b38]/50 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-white block">{p.username}</span>
                            <span className="text-[10px] text-gray-400">{p.email}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-200">
                            ${p.balanceSC.toFixed(2)} SC
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
                            ${p.totalDeposit.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-300">
                            ${p.totalCashout.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#2cb64e]">
                            ${p.netLoss.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-gray-300">
                            {p.cashbackPercent}%
                          </td>
                          <td className="p-3 font-mono font-black text-base text-[#2cb64e]">
                            ${p.cashbackAmount.toFixed(2)} SC
                          </td>
                          <td className="p-3">
                            {p.isClaimed ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#2cb64e] border border-emerald-500/40 text-[10px] font-black uppercase">
                                Claimed
                              </span>
                            ) : p.isEligible ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
                                Qualified
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500">
                                {p.totalDeposit < 20 ? 'Min $20 req' : 'No net loss'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-400">
                          No players registered yet or no transactions recorded this week.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settings Form */}
            <form onSubmit={handleSaveSettings} className="w-full space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4 h-full">
                <h4 className="text-sm font-black text-white font-heading">Site Logo</h4>
                <p className="text-xs text-gray-400">Navbar, sidebar, and admin header only.</p>
                <AdminImageField
                  label="Site Logo"
                  value={settings?.logoUrl || '/logo.png'}
                  onChange={(v) => setSettings({ ...settings, logoUrl: v })}
                  hint="Navbar, sidebar, admin header"
                  maxSize={512}
                />
              </div>

              {/* Cashback Percentage Setting */}
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#2cb64e]/40 space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">Sunday Cashback Percentage</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Adjust the weekly Sunday net cashback percentage (5% to 20%).
                    </p>
                  </div>
                  <span className="text-2xl font-black text-[#2cb64e] font-mono">
                    {settings?.cashbackPercent || 10}%
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={settings?.cashbackPercent || 10}
                  onChange={(e) =>
                    setSettings({ ...settings, cashbackPercent: Number(e.target.value) })
                  }
                  className="w-full accent-[#2cb64e] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>5% (Minimum)</span>
                  <span>10% (Default)</span>
                  <span>15%</span>
                  <span>20% (Maximum)</span>
                </div>
              </div>

              {/* Other Bonus Settings */}
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4 h-full">
                <h4 className="text-sm font-black text-white">Deposit & Match Bonuses</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      First Deposit Match Bonus (%)
                    </label>
                    <input
                      type="number"
                      value={settings?.welcomeBonusPercent || 300}
                      onChange={(e) =>
                        setSettings({ ...settings, welcomeBonusPercent: Number(e.target.value) })
                      }
                      className="hood-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Regular Reload Bonus (%)
                    </label>
                    <input
                      type="number"
                      value={settings?.regularBonusPercent || 50}
                      onChange={(e) =>
                        setSettings({ ...settings, regularBonusPercent: Number(e.target.value) })
                      }
                      className="hood-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Minimum Redemption ($ SC)
                    </label>
                    <input
                      type="number"
                      value={settings?.minRedemptionSC || 50}
                      onChange={(e) =>
                        setSettings({ ...settings, minRedemptionSC: Number(e.target.value) })
                      }
                      className="hood-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#09142a] border border-cyan-500/30 space-y-4 h-full sm:col-span-2">
                <h4 className="text-sm font-black text-white">Sound preferences (site-wide)</h4>
                <p className="text-[10px] text-gray-400 m-0">
                  Desk alert = new deposit/chat on admin. Touch sound = player UI taps (buttons, nav).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Default admin desk alert</label>
                    <select
                      className="hood-input w-full py-2 px-2 rounded-lg text-xs font-bold"
                      value={settings?.adminDefaultAlertTune || alertTune}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSettings({ ...settings, adminDefaultAlertTune: v });
                        setAlertTune(v);
                        localStorage.setItem('hood_admin_alert_tune', v);
                        playAdminChime(v);
                      }}
                    >
                      {AVAILABLE_TUNES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Player touch / click sound</label>
                    <select
                      className="hood-input w-full py-2 px-2 rounded-lg text-xs font-bold"
                      value={settings?.playerTouchTune || 'marimba'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSettings({ ...settings, playerTouchTune: v });
                        setPlayerTouchTune(v);
                        playTune('click');
                      }}
                    >
                      {AVAILABLE_TUNES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4 h-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white">Lobby Freeplay (Players Paradise workflow)</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        freeplayActive: prev?.freeplayActive === false ? true : false,
                      }))
                    }
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      settings?.freeplayActive !== false
                        ? 'bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {settings?.freeplayActive !== false ? '● Active' : '✕ Hidden'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Freeplay amount ($ SC)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings?.freeplayAmountSC ?? 5}
                    onChange={(e) =>
                      setSettings({ ...settings, freeplayAmountSC: Number(e.target.value) })
                    }
                    className="hood-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">
                    Signup starts at 0 SC — player claims once via GET FREEPLAY task (email + screenshot proof, staff approves in Game ID desk).
                  </p>
                </div>
              </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="btn-hood-green px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                {savingSettings ? 'Saving...' : 'SAVE SETTINGS'}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. GAME ID REQUESTS                                      */}
        {/* ======================================================== */}
        {activeTab === 'requests' && (
          <AccountRequestsDesk
            deskActive={activeTab === 'requests'}
            initialRequests={accountRequests}
            onMutate={handleAccountRequestsDeskMutate}
          />
        )}

        {/* ======================================================== */}
        {/* 7. PLAYER MANAGEMENT                                     */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Registered Players ({usersListLoading && !usersList.length ? '…' : usersListTotal})
                {usersListLoading ? (
                  <RefreshCw size={14} className="animate-spin text-gray-500" aria-label="Loading" />
                ) : null}
              </h3>
              <p className="text-[10px] text-gray-500 max-w-md">
                Same as Player Paradise: open <strong className="text-[#2cb64e]">360° Profile</strong> for deposits, cashouts, game IDs, referrals &amp; ledger — loaded only when you click (fast desk).
              </p>
              <input
                type="search"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search username, email, referral…"
                className="hood-input w-full sm:w-72 text-sm"
              />
            </div>
            <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a] touch-pan-x">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Sweeps Balance</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Device</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3363]">
                  {usersListLoading && usersList.length === 0
                    ? Array.from({ length: playerDirectoryPageSize }).map((_, i) => (
                        <tr key={`sk-${i}`} className="animate-pulse">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <td key={j} className="p-3">
                              <div className="h-3 bg-[#1a3363]/60 rounded w-full max-w-[120px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : null}
                  {!usersListLoading && usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                        No players found.
                      </td>
                    </tr>
                  ) : null}
                  {usersList.map((u) => (
                    <tr key={u._id} className="hover:bg-[#0e2042]/50">
                      <td className="p-3 font-bold text-white">{u.username}</td>
                      <td className="p-3 text-gray-300">{u.email}</td>
                      <td className="p-3 font-mono font-bold text-[#2cb64e]">
                        ${Number(u.balanceSC || 0).toFixed(2)} SC
                      </td>
                      <td className="p-3 uppercase font-bold text-gray-400 text-[10px]">{u.role}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-[10px] max-w-[120px] truncate" title={u.deviceId || ''}>
                        {u.deviceId
                          ? `${String(u.deviceId).slice(0, 14)}…`
                          : Array.isArray(u.boundDevices) && u.boundDevices.length
                            ? `${String(u.boundDevices[0]).slice(0, 14)}…`
                            : '—'}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setPlayer360Id(String(u._id || u.id))}
                          className="px-3 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 border border-[#2cb64e]/50 text-[#2cb64e] hover:bg-[#2cb64e]/10"
                        >
                          <Eye size={11} />
                          <span>360° Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlayerToEdit(u);
                            setEditBalanceSC(u.balanceSC ?? 0);
                            setEditBalanceGC(u.balanceGC ?? 0);
                            setEditStatus(u.status || 'active');
                            setEditRole(u.role || 'player');
                          }}
                          className="btn-hood-green px-3 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-sm"
                        >
                          <Edit2 size={11} />
                          <span className="hidden sm:inline">Quick edit</span>
                          <span className="sm:hidden">Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={playerDirectoryPage}
              totalItems={usersListTotal}
              pageSize={playerDirectoryPageSize}
              onPageChange={setPlayerDirectoryPage}
              onPageSizeChange={(size) => {
                setPlayerDirectoryPageSize(size);
                setPlayerDirectoryPage(1);
              }}
              itemLabel="players"
            />

            {/* Direct Player Balance & Account Modal */}
            <HoodAdminModal
              open={Boolean(selectedPlayerToEdit)}
              onClose={() => setSelectedPlayerToEdit(null)}
              size="sm"
              zIndex={50000}
            >
              {selectedPlayerToEdit ? (
                <>
                  <HoodAdminModalHeader
                    icon={<Users size={18} />}
                    title="Manage player balance"
                    subtitle={`${selectedPlayerToEdit.username} · ${selectedPlayerToEdit.email}`}
                    onClose={() => setSelectedPlayerToEdit(null)}
                  />
                  <HoodAdminModalBody>
                    <form onSubmit={handleSavePlayerUpdates} className="space-y-4">
                      <HoodAdminModalField label="Sweeps balance (SC)">
                        <input
                          type="number"
                          step="0.01"
                          value={editBalanceSC}
                          onChange={(e) => setEditBalanceSC(e.target.value)}
                          className="hood-input w-full font-mono font-bold"
                          required
                        />
                      </HoodAdminModalField>
                      <HoodAdminModalField label="Gold coins (GC)">
                        <input
                          type="number"
                          step="1"
                          value={editBalanceGC}
                          onChange={(e) => setEditBalanceGC(e.target.value)}
                          className="hood-input w-full font-mono font-bold"
                          required
                        />
                      </HoodAdminModalField>
                      <div className="grid grid-cols-2 gap-3">
                        <HoodAdminModalField label="Status">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="hood-input w-full font-bold"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                          </select>
                        </HoodAdminModalField>
                        <HoodAdminModalField label="Role">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="hood-input w-full font-bold"
                          >
                            <option value="player">Player</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </HoodAdminModalField>
                      </div>
                      <div className="rounded-xl border border-[#1a3363] bg-[#050a14] p-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Smartphone size={12} />
                          Device binding (1 account per phone)
                        </p>
                        <p className="text-xs text-gray-300 font-mono break-all">
                          {selectedPlayerToEdit.deviceId ||
                            (Array.isArray(selectedPlayerToEdit.boundDevices) &&
                            selectedPlayerToEdit.boundDevices.length
                              ? selectedPlayerToEdit.boundDevices.join(', ')
                              : 'No device linked yet')}
                        </p>
                        <HoodAdminModalButton
                          type="button"
                          variant="ghost"
                          disabled={unbindingDevice || savingPlayer}
                          onClick={handleUnbindPlayerDevice}
                        >
                          {unbindingDevice ? 'Unbinding…' : 'Unbind device'}
                        </HoodAdminModalButton>
                      </div>
                      <HoodAdminModalActions>
                        <HoodAdminModalButton type="button" variant="ghost" onClick={() => setSelectedPlayerToEdit(null)}>
                          Cancel
                        </HoodAdminModalButton>
                        <HoodAdminModalButton type="submit" variant="primary" disabled={savingPlayer}>
                          {savingPlayer ? 'Saving…' : 'Save player'}
                        </HoodAdminModalButton>
                      </HoodAdminModalActions>
                    </form>
                  </HoodAdminModalBody>
                </>
              ) : null}
            </HoodAdminModal>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. PAYMENT GATEWAYS                                      */}
        {/* ======================================================== */}
        {activeTab === 'gateways' && <GatewaysTab />}

        {/* ======================================================== */}
        {/* 9. GAME CREDIT LOADS                                     */}
        {/* ======================================================== */}
        {activeTab === 'game_loads' && <CoinAllotmentDesk sessionUser={user} onMutate={() => fetchAllData(true)} />}

        {/* ======================================================== */}
        {/* 10. GAMES LIBRARY                                        */}
        {/* ======================================================== */}
        {activeTab === 'games_lib' && <GamesLibraryTab />}

        {/* ======================================================== */}
        {/* 11. FINANCIAL LEDGER / TX AUDIT                          */}
        {/* ======================================================== */}
        {activeTab === 'ledger' && <LedgerTab />}

        {activeTab === 'promos' && <PromosTab />}

        {activeTab === 'affiliates' && <AffiliatesDesk mode="affiliates" onRefresh={() => fetchAllData(true)} />}
        {activeTab === 'affiliate_commissions' && (
          <AffiliatesDesk mode="affiliate_commissions" onRefresh={() => fetchAllData(true)} />
        )}

        {/* ======================================================== */}
        {/* 12. STAFF MANAGEMENT                                     */}
        {/* ======================================================== */}
        {activeTab === 'staff' && <StaffTab currentUser={user} />}

        {/* ======================================================== */}
        {/* LIGHTBOX / DEPOSIT PROOF IMAGE VIEWER MODAL              */}
        {/* ======================================================== */}
        <HoodAdminModal open={Boolean(viewingProof)} onClose={() => setViewingProof(null)} size="lg" zIndex={50000}>
          <HoodAdminModalHeader
            icon={<Eye size={18} />}
            title="Deposit / freeplay proof"
            subtitle="Full-size screenshot review"
            onClose={() => setViewingProof(null)}
          />
          <div className="overflow-auto max-h-[70vh] w-full flex items-center justify-center rounded-xl border border-[#1a3363] bg-[#050a14] p-3">
            {viewingProof ? (
              <img src={viewingProof} alt="Deposit proof" className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            ) : null}
          </div>
          <HoodAdminModalActions>
            <HoodAdminModalButton type="button" variant="primary" onClick={() => setViewingProof(null)}>
              Close preview
            </HoodAdminModalButton>
          </HoodAdminModalActions>
        </HoodAdminModal>

        {player360Id && (
          <Player360ProfileModal
            userId={player360Id}
            onClose={() => setPlayer360Id(null)}
            onUserUpdated={() => {
              loadPlayerDirectory(playerSearch, playerDirectoryPage, playerDirectoryPageSize);
              if (selectedThreadUser) loadConversation(selectedThreadUser, true);
            }}
            onOpenChat={(p) => {
              if (!p?.id) return;
              setActiveTab('chat');
              loadConversation(String(p.id), false);
            }}
          />
        )}
      </main>
    </div>
  );
}
