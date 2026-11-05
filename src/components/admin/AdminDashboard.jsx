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
  Menu,
  Edit2,
  CreditCard,
  Coins,
  FileSpreadsheet,
  UserCheck,
  Eye
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, sanitizeGameTitle } from '@/lib/fastDiff';
import { GamesLibraryTab, GatewaysTab, GameLoadsTab, LedgerTab, StaffTab } from './AdminExtraTabs';
import AdminImageField from './AdminImageField';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const [newLabelInput, setNewLabelInput] = useState('');
  const [newNoteInput, setNewNoteInput] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [cashbackReport, setCashbackReport] = useState(null);
  const [disbursingCashback, setDisbursingCashback] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);

  // Player editing modal states
  const [selectedPlayerToEdit, setSelectedPlayerToEdit] = useState(null);
  const [editBalanceSC, setEditBalanceSC] = useState('');
  const [editBalanceGC, setEditBalanceGC] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editRole, setEditRole] = useState('player');
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Card editing states
  const [editingCards, setEditingCards] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Chat scroll refs
  const adminChatScrollRef = React.useRef(null);
  const prevAdminMessageCount = React.useRef(0);
  const lastActiveThreadUser = React.useRef(null);

  // Fetch all admin data (silent polling does not trigger loading indicator)
  const fetchAllData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [statsRes, depRes, redRes, reqRes, setRes, chatRes, usrRes, payRes, cbRes] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments/deposit').then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments/withdraw').then((r) => r.json()).catch(() => ({})),
        fetch('/api/account-requests').then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/settings').then((r) => r.json()).catch(() => ({})),
        fetch('/api/chat').then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/users').then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments/methods').then((r) => r.json()).catch(() => ({})),
        fetch('/api/cashback?adminReport=true').then((r) => r.json()).catch(() => ({})),
      ]);

      if (statsRes.success) diffSet(setStats, statsRes.stats);
      if (depRes.success && Array.isArray(depRes.deposits)) diffSet(setDeposits, depRes.deposits);
      if (redRes.success && Array.isArray(redRes.redemptions)) diffSet(setRedemptions, redRes.redemptions);
      if (reqRes.success && Array.isArray(reqRes.requests)) {
        const sanitizedRequests = reqRes.requests.map((r) => ({
          ...r,
          gameTitle: sanitizeGameTitle(r.gameTitle),
        }));
        diffSet(setAccountRequests, sanitizedRequests);
      }
      if (setRes.success && setRes.settings) {
        diffSet(setSettings, setRes.settings);
        setEditingCards((prev) => (prev && prev.length > 0 ? prev : (setRes.settings.quickActionCards || [])));
      }
      if (chatRes.success && Array.isArray(chatRes.threads)) diffSet(setChatThreads, chatRes.threads);
      if (usrRes.success && Array.isArray(usrRes.users)) diffSet(setUsersList, usrRes.users);
      if (payRes.success && Array.isArray(payRes.methods)) diffSet(setGateways, payRes.methods);
      if (cbRes.success) diffSet(setCashbackReport, cbRes);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(false);
    // Silent background poll every 5s so new deposits, cashouts, requests, & threads sync in real time
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch individual chat conversation (supports silent sync)
  const loadConversation = async (userId, isSilent = false) => {
    if (!isSilent) setSelectedThreadUser(userId);
    try {
      const res = await fetch(`/api/chat?userId=${userId}`);
      const data = await res.json();
      if (data?.success) {
        diffSet(setThreadMessages, data.messages || []);
        diffSet(setThreadMeta, data.threadMeta || { labels: [], staffNotes: [] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll conversation silently if a thread is open
  useEffect(() => {
    if (!selectedThreadUser) return;
    const interval = setInterval(() => {
      loadConversation(selectedThreadUser, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedThreadUser]);

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
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedThreadUser) return;
    const text = chatInput.trim();
    setChatInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId: selectedThreadUser }),
      });
      const data = await res.json();
      if (data?.success) {
        setThreadMessages((prev) => [...prev, data.message]);
        playTune('coin');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Label to player
  const handleAddLabel = async () => {
    if (!newLabelInput.trim() || !selectedThreadUser) return;
    const labelToAdd = newLabelInput.trim();
    setNewLabelInput('');

    try {
      const res = await fetch('/api/chat', {
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
      const res = await fetch('/api/chat', {
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
      const res = await fetch('/api/chat', {
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
      const res = await fetch('/api/chat', {
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
  const handleDepositAction = async (depositId, action) => {
    const reason = action === 'reject' ? prompt('Enter reason for rejection:') : null;
    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAllData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Error updating deposit');
    }
  };

  // Approve/Reject Redemption
  const handleRedemptionAction = async (redemptionId, action) => {
    const reason = action === 'reject' ? prompt('Enter reason for rejection:') : null;
    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAllData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Error updating redemption');
    }
  };

  // Approve Account Request
  const handleApproveAccountRequest = async (requestId) => {
    const gameUsername = prompt('Enter generated Game Username:');
    if (!gameUsername) return;
    const gamePassword = prompt('Enter generated Game Password:');
    if (!gamePassword) return;

    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'approve', gameUsername, gamePassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Credentials issued!');
        fetchAllData();
      }
    } catch (e) {
      alert('Error approving request');
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
        alert('System settings and 5 Action Cards saved successfully!');
        setSettings(data.settings);
      }
    } catch (e) {
      alert('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Disburse Sunday Cashback to all eligible players in 1-click
  const handleDisburseAllCashback = async () => {
    if (!confirm('Are you sure you want to disburse Sunday Cashback to all qualified players?')) return;
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
        alert(data.message);
        fetchAllData(true);
      } else {
        alert(data?.error || 'Failed to disburse cashback');
      }
    } catch {
      alert('Network error disbursing cashback');
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
        alert(`Player ${selectedPlayerToEdit.username} updated successfully!`);
        setSelectedPlayerToEdit(null);
        fetchAllData(true);
      } else {
        alert(data?.error || 'Failed to update player');
      }
    } catch {
      alert('Network error updating player');
    } finally {
      setSavingPlayer(false);
    }
  };

  // Nav Item click helper for auto-closing mobile menu
  const selectNavTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    playTune('click');
  };

  const siteLogo = settings?.logoUrl || '/logo.png';

  const renderLogo = (padClass) =>
    siteLogo.startsWith('data:image') ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={siteLogo} alt="Hood Games" className={`w-full h-full object-contain ${padClass}`} />
    ) : (
      <Image src={siteLogo} alt="Hood Games" fill className={`object-contain ${padClass}`} />
    );

  return (
    <div className="font-sans min-h-screen bg-[#070d1e] text-gray-100 flex flex-col md:flex-row relative">
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
        className={`fixed md:sticky top-0 bottom-0 z-50 w-72 md:w-64 bg-[#09142a] border-r border-[#1a3363] p-4 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen overflow-y-auto`}
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
              <span>Overview Desk</span>
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
              {(stats?.pendingDeposits > 0 || stats?.pendingRedemptions > 0) && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                  {(stats?.pendingDeposits || 0) + (stats?.pendingRedemptions || 0)}
                </span>
              )}
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
                <span>Game Credit Loads</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#2cb64e] text-[9px] font-black">
                Coins
              </span>
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
                <span>Game ID Requests</span>
              </div>
              {stats?.pendingAccountRequests > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                  {stats.pendingAccountRequests}
                </span>
              )}
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
              <span className="px-2 py-0.5 rounded-md bg-[#2cb64e]/20 text-[#2cb64e] text-[9px] font-black uppercase">
                Live
              </span>
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
              <span>Financial Ledger / TX</span>
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
              <span>Player Management</span>
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
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#1a3363]">
          <div>
            <h1 className="text-2xl font-black text-white capitalize">
              {{
                overview: 'Overview Desk',
                finance: 'Finance & Cashier Queue',
                gateways: 'Payment Gateways Management',
                game_loads: 'Game Credit Load Queue',
                requests: 'Player Game ID Requests',
                chat: 'Live VIP Support Desk (Labels & Notes)',
                cards: '5 Quick Action Cards Customizer',
                games_lib: 'Sweepstakes Games Library',
                settings: 'Sunday Cashback & System Settings',
                ledger: 'Master Financial Ledger & Audit',
                users: 'Player Management & Balance Control',
                staff: 'Staff & Role Access Control',
              }[activeTab] || `${activeTab} Management`}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Admin controls & real-time operations for Hood Games.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="p-2 rounded-xl bg-[#09142a] border border-[#1a3363] text-gray-300 hover:text-white"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {stats?.pendingAccountRequests || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Players requesting Orion, Kirin, or Panda logins.</p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. FINANCE TAB: DEPOSITS & CASHOUTS                      */}
        {/* ======================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-8 pt-6">
            {/* Deposits Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Wallet size={18} className="text-[#2cb64e]" />
                <span>Player Deposit Queue ({deposits.length})</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a]">
                <table className="w-full text-left text-xs">
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
                                onClick={() => handleDepositAction(d._id, 'approve')}
                                className="px-2.5 py-1 rounded bg-[#2cb64e] text-white font-bold text-[10px] hover:bg-emerald-600"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDepositAction(d._id, 'reject')}
                                className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700"
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
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ArrowUpRight size={18} className="text-blue-400" />
                <span>Player Redemption / Cashout Queue ({redemptions.length})</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a]">
                <table className="w-full text-left text-xs">
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
                        <td className="p-3 text-gray-300">{r.method}</td>
                        <td className="p-3 font-mono text-white select-all">{r.payoutAddress}</td>
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
                          {r.status === 'pending' && (
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
          <div className="h-[700px] grid grid-cols-1 lg:grid-cols-12 gap-4 pt-6">
            {/* Left 4 cols: Conversations List */}
            <div className="lg:col-span-4 rounded-2xl bg-[#09142a] border border-[#1a3363] flex flex-col overflow-hidden">
              <div className="p-3.5 bg-[#0c1b38] border-b border-[#1a3363]">
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  Support Threads ({chatThreads.length})
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#1a3363]">
                {chatThreads.map((t) => (
                  <div
                    key={t.userId}
                    onClick={() => loadConversation(t.userId)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedThreadUser === t.userId ? 'bg-[#12244c]' : 'hover:bg-[#0e2042]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{t.username}</span>
                      {t.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#2cb64e] text-black text-[9px] font-black">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{t.lastMessage}</p>

                    {/* Display Labels */}
                    {t.labels && t.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.labels.map((lbl, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-[#2cb64e]/20 text-[#2cb64e] text-[9px] font-bold"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Middle 5 cols: Conversation messages & reply */}
            <div className="lg:col-span-5 rounded-2xl bg-[#09142a] border border-[#1a3363] flex flex-col overflow-hidden">
              <div className="p-3.5 bg-[#0c1b38] border-b border-[#1a3363]">
                <h4 className="text-xs font-black text-white">
                  {selectedThreadUser ? `Live Chat with Player` : 'Select a thread to respond'}
                </h4>
              </div>

              <div ref={adminChatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d1e]/80">
                {threadMessages.map((m, idx) => {
                  const isStaff = m.senderRole === 'staff';
                  return (
                    <div
                      key={m._id || idx}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9.5px] text-gray-400 mb-0.5">
                        {m.username} ({m.senderRole})
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                          isStaff
                            ? 'btn-hood-green text-white rounded-br-none'
                            : 'bg-[#12244c] text-white border border-[#1a3363] rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedThreadUser && (
                <form onSubmit={handleSendReply} className="p-2.5 bg-[#0c1b38] border-t border-[#1a3363] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="hood-input flex-1 px-3 py-2 rounded-xl text-xs"
                    placeholder="Reply as Hood Staff..."
                  />
                  <button type="submit" className="btn-hood-green px-4 py-2 rounded-xl text-white text-xs font-bold">
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>

            {/* Right 3 cols: LABELS & STAFF NOTES (Requirement #9) */}
            <div className="lg:col-span-3 rounded-2xl bg-[#09142a] border border-[#1a3363] p-4 flex flex-col gap-5 overflow-y-auto">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Tag size={13} className="text-[#2cb64e]" />
                  <span>Player Labels / Tags</span>
                </h4>

                {/* Assigned Labels */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {threadMeta.labels?.length > 0 ? (
                    threadMeta.labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 text-xs font-bold"
                      >
                        <span>{lbl}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(lbl)}
                          className="hover:text-white"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-500">No labels assigned yet.</span>
                  )}
                </div>

                {/* Add Label */}
                {selectedThreadUser && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newLabelInput}
                      onChange={(e) => setNewLabelInput(e.target.value)}
                      placeholder="e.g. VIP, Risky, High Roller"
                      className="hood-input flex-1 px-2.5 py-1.5 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      className="px-2.5 py-1.5 rounded-lg bg-[#2cb64e] text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Staff Internal Notes */}
              <div className="border-t border-[#1a3363] pt-4 flex-1 flex flex-col">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <FileText size={13} className="text-amber-400" />
                  <span>Staff Internal Notes</span>
                </h4>

                <div className="space-y-2 flex-1 overflow-y-auto mb-3">
                  {threadMeta.staffNotes?.length > 0 ? (
                    threadMeta.staffNotes.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-xs relative group"
                      >
                        <p className="text-gray-200 text-[11px]">{n.text}</p>
                        <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                          <span>By {n.author || 'Staff'}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-500">No internal notes for this player.</span>
                  )}
                </div>

                {selectedThreadUser && (
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={2}
                      value={newNoteInput}
                      onChange={(e) => setNewNoteInput(e.target.value)}
                      placeholder="Add internal note (e.g. Verified Cash App)..."
                      className="hood-input w-full p-2 rounded-xl text-xs"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-[#12244c] hover:bg-[#1a3363] text-white text-xs font-bold"
                    >
                      Save Internal Note
                    </button>
                  </form>
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
        {/* ======================================================== */}
        {/* 5. CASHBACK & SYSTEM SETTINGS (REQUIREMENT #7)           */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-8 pt-6">
            {/* Sunday Cashback Operations Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 text-xs font-black uppercase">
                  <Coins size={14} />
                  <span>Sunday Cashback Operations Hub</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  Disburse Sunday Net Cashback
                </h3>
                <p className="text-xs text-gray-300 max-w-xl">
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

              <div className="overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a]">
                <table className="w-full text-left text-xs">
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
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4">
                <h4 className="text-sm font-black text-white font-heading">Site Branding &amp; Images</h4>
                <p className="text-xs text-gray-400">
                  Upload or paste image URLs — changes appear instantly across the player site (logo, hero, jackpot card).
                </p>
                <AdminImageField
                  label="Site Logo"
                  value={settings?.logoUrl || '/logo.png'}
                  onChange={(v) => setSettings({ ...settings, logoUrl: v })}
                  hint="Navbar, sidebar, admin header"
                  maxSize={512}
                />
                <AdminImageField
                  label="Hero Background"
                  value={settings?.heroBackgroundUrl || '/images/casino-hero-bg.jpg'}
                  onChange={(v) => setSettings({ ...settings, heroBackgroundUrl: v })}
                  maxSize={1200}
                  quality={0.55}
                />
                <AdminImageField
                  label="Jackpot Showcase Image"
                  value={settings?.jackpotBannerUrl || '/images/jackpot-banner.jpg'}
                  onChange={(v) => setSettings({ ...settings, jackpotBannerUrl: v })}
                  maxSize={600}
                />
              </div>

              {/* Cashback Percentage Setting */}
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#2cb64e]/40 space-y-4">
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
              <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4">
                <h4 className="text-sm font-black text-white">Deposit & Match Bonuses</h4>

                <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-4 pt-6">
            <h3 className="text-base font-black text-white">
              Player Game Credentials Requests ({accountRequests.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3">Game Platform</th>
                    <th className="p-3">Load Coins</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3363]">
                  {accountRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-[#0e2042]/50">
                      <td className="p-3 font-bold text-white">{req.username}</td>
                      <td className="p-3 text-[#2cb64e] font-bold">{req.gameTitle}</td>
                      <td className="p-3 font-mono">${req.transferAmount || 0}</td>
                      <td className="p-3 text-gray-400">{req.notes || 'None'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApproveAccountRequest(req._id)}
                            className="btn-hood-green px-3 py-1 rounded text-white text-[10px] font-bold"
                          >
                            Issue Login & PIN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. PLAYER MANAGEMENT                                     */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 pt-6">
            <h3 className="text-base font-black text-white">Registered Players ({usersList.length})</h3>
            <div className="overflow-x-auto rounded-2xl border border-[#1a3363] bg-[#09142a]">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-[#0c1b38] text-gray-300 border-b border-[#1a3363]">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Sweeps Balance</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3363]">
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
                      <td className="p-3 text-right">
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
                          <span>Adjust Balance</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Direct Player Balance & Account Modal */}
            {selectedPlayerToEdit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-md rounded-3xl bg-[#09142a] border-2 border-[#1a3363] p-6 space-y-5 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-[#1a3363] pb-3">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>Manage Player Balance</span>
                      </h3>
                      <p className="text-xs text-gray-400 font-mono">
                        {selectedPlayerToEdit.username} ({selectedPlayerToEdit.email})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerToEdit(null)}
                      className="p-1.5 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePlayerUpdates} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">
                        Sweeps Coins Balance ($ SC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editBalanceSC}
                        onChange={(e) => setEditBalanceSC(e.target.value)}
                        className="hood-input w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">
                        Gold Coins Balance (GC)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={editBalanceGC}
                        onChange={(e) => setEditBalanceGC(e.target.value)}
                        className="hood-input w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">Account Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="hood-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">System Role</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="hood-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
                        >
                          <option value="player">Player</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerToEdit(null)}
                        className="w-1/2 py-2.5 rounded-xl bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingPlayer}
                        className="w-1/2 btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
                      >
                        {savingPlayer ? 'Saving...' : 'SAVE PLAYER'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. PAYMENT GATEWAYS                                      */}
        {/* ======================================================== */}
        {activeTab === 'gateways' && <GatewaysTab />}

        {/* ======================================================== */}
        {/* 9. GAME CREDIT LOADS                                     */}
        {/* ======================================================== */}
        {activeTab === 'game_loads' && <GameLoadsTab />}

        {/* ======================================================== */}
        {/* 10. GAMES LIBRARY                                        */}
        {/* ======================================================== */}
        {activeTab === 'games_lib' && <GamesLibraryTab />}

        {/* ======================================================== */}
        {/* 11. FINANCIAL LEDGER / TX AUDIT                          */}
        {/* ======================================================== */}
        {activeTab === 'ledger' && <LedgerTab />}

        {/* ======================================================== */}
        {/* 12. STAFF MANAGEMENT                                     */}
        {/* ======================================================== */}
        {activeTab === 'staff' && <StaffTab currentUser={user} />}

        {/* ======================================================== */}
        {/* LIGHTBOX / DEPOSIT PROOF IMAGE VIEWER MODAL              */}
        {/* ======================================================== */}
        {viewingProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="relative max-w-2xl max-h-[85vh] w-full bg-[#09142a] border-2 border-[#1a3363] rounded-3xl p-5 flex flex-col items-center overflow-hidden shadow-2xl">
              <button
                type="button"
                onClick={() => setViewingProof(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-300 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all z-10"
              >
                <X size={18} />
              </button>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Eye size={16} className="text-[#2cb64e]" />
                <span>Player Deposit Proof / Receipt</span>
              </h4>
              <div className="overflow-auto max-h-[65vh] w-full flex items-center justify-center rounded-2xl border border-[#1a3363] bg-[#070d1e] p-2">
                <img
                  src={viewingProof}
                  alt="Deposit Proof"
                  className="max-w-full max-h-[60vh] object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
