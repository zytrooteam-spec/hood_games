'use client';

import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  CheckCircle2,
  ArrowUpRight,
  Copy,
  Check,
  Eye,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Percent,
  X,
  ExternalLink,
  Coins,
} from 'lucide-react';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  HoodAdminModal,
  HoodAdminModalHeader,
  HoodAdminModalActions,
  HoodAdminModalButton,
} from '@/components/admin/HoodAdminModal';

export default function AffiliateManagementHub({
  activeTab = 'affiliates',
  affiliates = [],
  summary = null,
  onRefresh,
  onOpenPlayerProfile,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(activeTab === 'affiliate_commissions' ? 'unpaid' : 'all');
  const [selectedNetworkPartner, setSelectedNetworkPartner] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compute live aggregates if summary is null
  const totalPartners = summary?.totalPartners ?? affiliates.length;
  const totalReferees = summary?.totalReferees ?? affiliates.reduce((sum, a) => sum + (a.totalReferrals || 0), 0);
  const totalEarned = summary?.totalEarned ?? affiliates.reduce((sum, a) => sum + (a.commissionsEarned || 0), 0);
  const totalUnpaid = summary?.totalUnpaid ?? affiliates.reduce((sum, a) => sum + (a.commissionsUnpaid || 0), 0);
  const totalVolume = summary?.totalVolume ?? affiliates.reduce((sum, a) => sum + (a.totalDepositsGenerated || 0), 0);

  // Filtered partners
  const filteredAffiliates = affiliates.filter((a) => {
    const matchesSearch =
      (a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.referralCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'unpaid') return Number(a.commissionsUnpaid || 0) > 0;
    if (filterType === 'active_network') return Number(a.totalReferrals || 0) > 0;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAffiliates.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedAffiliates = filteredAffiliates.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCopyCode = (code) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://hoodgaming.com';
      navigator.clipboard.writeText(`${origin}/ref/${code}`);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleSettleSingle = async (partner) => {
    if (Number(partner.commissionsUnpaid || 0) <= 0) return;
    if (!window.confirm(`Settle $${partner.commissionsUnpaid.toFixed(2)} SC commission for ${partner.username} directly into their playable balance?`)) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_payout', userId: partner.userId }),
      });
      const d = await res.json();
      if (d.success) {
        setStatusMessage({ type: 'success', text: d.message || `Commission settled for ${partner.username}!` });
        if (onRefresh) onRefresh();
      } else {
        setStatusMessage({ type: 'error', text: d.error || 'Failed to settle commission' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchPayout = async () => {
    if (totalUnpaid <= 0) {
      alert('There are no pending unpaid commissions to settle.');
      return;
    }
    if (!window.confirm(`Batch Settle All Pending Commissions? Total: $${totalUnpaid.toFixed(2)} SC across all partners with unpaid balances.`)) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/affiliates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_payout_all' }),
      });
      const d = await res.json();
      if (d.success) {
        setStatusMessage({ type: 'success', text: d.message });
        if (onRefresh) onRefresh();
      } else {
        setStatusMessage({ type: 'error', text: d.error || 'Batch payout failed' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Lexend, sans-serif' }}>
      {/* 1. Header with Live Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00F0FF', boxShadow: '0 0 12px #00F0FF' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {activeTab === 'affiliate_commissions'
                ? 'Affiliate Commission Settlement Desk'
                : 'Affiliate Partner Program & Referral Bonus Hub'}
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9A91A8' }}>
            {activeTab === 'affiliate_commissions'
              ? 'Review pending agent rewards and execute audited settlements directly to player wallets'
              : 'Recruited player networks, referral link tracking, deposit volume & real-time revenue share'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {totalUnpaid > 0 && (
            <button
              type="button"
              onClick={handleBatchPayout}
              disabled={isProcessing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Coins size={15} />
              <span>Settle All Pending (${totalUnpaid.toFixed(2)} SC)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '14px',
            backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusMessage.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Top 4 Sovereign Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Partners */}
        <div
          style={{
            backgroundColor: '#0E0A24',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '18px',
            padding: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8', letterSpacing: '0.05em' }}>
              Affiliate Partners
            </span>
            <Users size={15} color="#00F0FF" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px', fontFamily: 'monospace' }}>
            {totalPartners}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', fontSize: '10.5px', color: '#00F0FF' }}>
            <Sparkles size={11} />
            <span className="truncate">Referral Bonus Active</span>
          </div>
        </div>

        {/* Card 2: Recruited Players */}
        <div
          style={{
            backgroundColor: '#0E0A24',
            border: '1px solid rgba(224, 38, 216, 0.25)',
            borderRadius: '18px',
            padding: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8', letterSpacing: '0.05em' }}>
              Recruited Players
            </span>
            <Gift size={15} color="#E026D8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px', fontFamily: 'monospace' }}>
            {totalReferees}
          </div>
          <div style={{ fontSize: '10.5px', color: '#9A91A8', marginTop: '3px' }} className="truncate">
            Signed up via links
          </div>
        </div>

        {/* Card 3: Total Deposit Volume */}
        <div
          style={{
            backgroundColor: '#0E0A24',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '18px',
            padding: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8', letterSpacing: '0.05em' }}>
              Deposit Volume
            </span>
            <TrendingUp size={15} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#FBBF24', marginTop: '4px', fontFamily: 'monospace' }} className="truncate">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SC
          </div>
          <div style={{ fontSize: '10.5px', color: '#9A91A8', marginTop: '3px' }} className="truncate">
            Lifetime generated
          </div>
        </div>

        {/* Card 4: Unpaid Claimable Pool */}
        <div
          style={{
            backgroundColor: '#0E0A24',
            border: totalUnpaid > 0 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            padding: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8', letterSpacing: '0.05em' }}>
              Unpaid Pool
            </span>
            <DollarSign size={15} color={totalUnpaid > 0 ? '#10B981' : '#9A91A8'} />
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: totalUnpaid > 0 ? '#34D399' : '#FFFFFF',
              marginTop: '4px',
              fontFamily: 'monospace',
            }}
            className="truncate"
          >
            ${totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SC
          </div>
          <div style={{ fontSize: '10.5px', color: totalUnpaid > 0 ? '#34D399' : '#9A91A8', marginTop: '3px' }} className="truncate">
            {totalUnpaid > 0 ? 'Ready for payout' : 'Settled'}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { id: 'all', label: 'All Partners', count: affiliates.length },
            { id: 'unpaid', label: 'Pending Payouts', count: affiliates.filter(a => Number(a.commissionsUnpaid || 0) > 0).length },
            { id: 'active_network', label: 'With Recruits', count: affiliates.filter(a => Number(a.totalReferrals || 0) > 0).length },
          ].map((pill) => {
            const isSel = filterType === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterType(pill.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backgroundColor: isSel ? '#00F0FF' : '#0E0A24',
                  color: isSel ? '#070514' : '#C8C1D4',
                  border: isSel ? '1px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isSel ? '0 0 14px rgba(0, 240, 255, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 900,
                    backgroundColor: isSel ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: isSel ? '#000000' : '#FFFFFF',
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0E0A24',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '7px 14px',
            width: '280px',
            maxWidth: '100%',
            flex: '1 1 220px',
          }}
        >
          <Search size={14} color="#796E8A" />
          <input
            type="text"
            placeholder="Search username or referral code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontFamily: 'Lexend, sans-serif',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#9A91A8', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Affiliates Table */}
      <div
        style={{
          backgroundColor: '#0E0A24',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead
              style={{
                backgroundColor: '#070514',
                color: '#9A91A8',
                textTransform: 'uppercase',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <tr>
                <th style={{ padding: '14px 18px' }}>Partner / Agent</th>
                <th style={{ padding: '14px 18px' }}>Referral Code</th>
                <th style={{ padding: '14px 18px' }}>Recruited Network</th>
                <th style={{ padding: '14px 18px' }}>Deposit Volume</th>
                <th style={{ padding: '14px 18px' }}>Rev-Share</th>
                <th style={{ padding: '14px 18px' }}>Lifetime Earned</th>
                <th style={{ padding: '14px 18px' }}>Unpaid Claimable</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ divideY: '1px solid rgba(255, 255, 255, 0.04)' }}>
              {filteredAffiliates.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '48px 16px', textAlign: 'center', color: '#9A91A8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} color="#4A4160" />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>
                        No Affiliate Partners Found
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#9A91A8' }}>
                        {searchQuery ? 'Try matching another partner username or code' : 'New registered players will appear here automatically when they share links'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAffiliates.map((partner) => {
                  const hasUnpaid = Number(partner.commissionsUnpaid || 0) > 0;
                  const hasNetwork = Number(partner.totalReferrals || 0) > 0;

                  return (
                    <tr
                      key={partner.userId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-white/[0.02]"
                    >
                      {/* 1. Partner Identity */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(224, 38, 216, 0.2))',
                              border: '1px solid rgba(0, 240, 255, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '12px',
                              color: '#FFFFFF',
                              flexShrink: 0,
                            }}
                          >
                            {partner.username?.substring(0, 2).toUpperCase() || 'AP'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{partner.username}</span>
                              {onOpenPlayerProfile && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPlayerProfile(partner.userId)}
                                  style={{ background: 'none', border: 'none', color: '#00F0FF', cursor: 'pointer', padding: 0 }}
                                  title="Open Player Profile"
                                >
                                  <ExternalLink size={11} />
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'monospace' }}>
                              {partner.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Referral Code */}
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(partner.referralCode)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.25)',
                            color: '#00F0FF',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Click to copy full referral link"
                        >
                          {copiedCode === partner.referralCode ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          <span>{partner.referralCode}</span>
                        </button>
                      </td>

                      {/* 3. Recruited Network */}
                      <td style={{ padding: '14px 18px' }}>
                        {hasNetwork ? (
                          <button
                            type="button"
                            onClick={() => setSelectedNetworkPartner(partner)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(224, 38, 216, 0.12)',
                              border: '1px solid rgba(224, 38, 216, 0.3)',
                              color: '#E026D8',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                            title="View all referred players"
                          >
                            <Users size={12} />
                            <span>{partner.totalReferrals} Players</span>
                            <span style={{ fontSize: '10px', color: '#CBD5E1', marginLeft: '2px' }}>
                              ({partner.activeDepositors} Active)
                            </span>
                            <Eye size={11} />
                          </button>
                        ) : (
                          <span style={{ color: '#796E8A', fontSize: '11px' }}>0 Recruits</span>
                        )}
                      </td>

                      {/* 4. Deposit Volume */}
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 800, color: partner.totalDepositsGenerated > 0 ? '#FBBF24' : '#796E8A' }}>
                        ${Number(partner.totalDepositsGenerated || 0).toFixed(2)} SC
                      </td>

                      {/* 5. Rev-Share Rate */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 900,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Percent size={10} />
                          <span>{partner.commissionRate || 50}% REVENUE SHARE</span>
                        </span>
                      </td>

                      {/* 6. Lifetime Earned */}
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 900, color: '#34D399' }}>
                        +${Number(partner.commissionsEarned || 0).toFixed(2)} SC
                      </td>

                      {/* 7. Unpaid Claimable */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '13px',
                            color: hasUnpaid ? '#F43F5E' : '#796E8A',
                          }}
                        >
                          ${Number(partner.commissionsUnpaid || 0).toFixed(2)} SC
                        </span>
                      </td>

                      {/* 8. Action Buttons */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {hasUnpaid ? (
                            <button
                              type="button"
                              onClick={() => handleSettleSingle(partner)}
                              disabled={isProcessing}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                                color: '#10B981',
                                fontSize: '11px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Settle Payout</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Settled</span>
                          )}

                          {hasNetwork && (
                            <button
                              type="button"
                              onClick={() => setSelectedNetworkPartner(partner)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                              title="Inspect Network Details"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredAffiliates.length > 0 && (
          <div style={{ padding: '14px 16px' }}>
            <AdminPagination
              currentPage={safePage}
              totalItems={filteredAffiliates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              itemLabel="Partners"
            />
          </div>
        )}
      </div>

      {/* 5. Recruited Network Inspection Modal */}
      <HoodAdminModal
        open={Boolean(selectedNetworkPartner)}
        onClose={() => setSelectedNetworkPartner(null)}
        size="lg"
        zIndex={100000}
      >
        {selectedNetworkPartner ? (
          <>
            <HoodAdminModalHeader
              icon={<Users size={18} />}
              title={`Recruited network (${selectedNetworkPartner.totalReferrals})`}
              subtitle={`Partner ${selectedNetworkPartner.username} · code ${selectedNetworkPartner.referralCode}`}
              onClose={() => setSelectedNetworkPartner(null)}
            />

            {/* Network Table */}
            {(!selectedNetworkPartner.referees || selectedNetworkPartner.referees.length === 0) ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#9A91A8' }}>
                No active players recorded in this network.
              </div>
            ) : (
              <div style={{ backgroundColor: '#070514', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.06)', width: '100%' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#0A071E', color: '#9A91A8', textTransform: 'uppercase', fontSize: '10.5px', fontWeight: 800 }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Referred Player</th>
                      <th style={{ padding: '12px 16px' }}>Joined Date</th>
                      <th style={{ padding: '12px 16px' }}>Total Deposited</th>
                      <th style={{ padding: '12px 16px' }}>Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNetworkPartner.referees.map((ref) => (
                      <tr key={ref.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{ref.username}</span>
                            {ref.totalDeposited > 0 && (
                              <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
                                DEPOSITOR
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#9A91A8', fontSize: '11px' }}>
                          {ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: ref.totalDeposited > 0 ? '#FBBF24' : '#64748B' }}>
                          ${Number(ref.totalDeposited || 0).toFixed(2)} SC
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#00F0FF' }}>
                          ${Number(ref.balanceSC || 0).toFixed(2)} SC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            <HoodAdminModalActions>
              <HoodAdminModalButton type="button" variant="primary" onClick={() => setSelectedNetworkPartner(null)}>
                Close
              </HoodAdminModalButton>
            </HoodAdminModalActions>
          </>
        ) : null}
      </HoodAdminModal>
    </div>
  );
}
