/** Maps SSE payloads to in-app sync events (poll stays as backup). */

import { REALTIME_TYPES } from '@/lib/realtimePublish';
import { broadcastAdminDeskPulse } from '@/lib/adminCrossTab';

const ADMIN_PULSE_TYPES = new Set([
  REALTIME_TYPES.ACCOUNT_REQUEST_CREATED,
  REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED,
  REALTIME_TYPES.CHAT_MESSAGE,
  REALTIME_TYPES.DESK_SYNC,
  REALTIME_TYPES.FINANCE_DEPOSIT,
  REALTIME_TYPES.FINANCE_WITHDRAW,
  REALTIME_TYPES.COIN_DESK,
  REALTIME_TYPES.ADMIN_STATS,
]);

const PLAYER_PULSE_TYPES = new Set([
  REALTIME_TYPES.ACCOUNT_REQUEST_CREATED,
  REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED,
  REALTIME_TYPES.CHAT_MESSAGE,
  REALTIME_TYPES.FINANCE_DEPOSIT,
  REALTIME_TYPES.FINANCE_WITHDRAW,
  REALTIME_TYPES.WALLET,
]);

export function buildRealtimeUrl() {
  if (typeof window === 'undefined') return '/api/realtime';
  const params = new URLSearchParams();
  try {
    const guestId = (localStorage.getItem('hood_guest_chat_id') || '').trim();
    if (guestId) params.set('guestId', guestId);
  } catch {}
  const qs = params.toString();
  return qs ? `/api/realtime?${qs}` : '/api/realtime';
}

function adminDeskPulse(event) {
  window.dispatchEvent(new CustomEvent('hood-admin-desk-sync', { detail: event }));
}

function playerInstantPulse() {
  window.dispatchEvent(new CustomEvent('balanceUpdate'));
  window.dispatchEvent(new CustomEvent('hood-cashier-refresh'));
  window.dispatchEvent(new CustomEvent('hood-instant-sync'));
}

export function applyRealtimeEvent(event) {
  if (!event || typeof window === 'undefined') return;
  if (event.type === 'CONNECTED' || event.type === REALTIME_TYPES.SSE_CONNECTED) {
    window.dispatchEvent(new CustomEvent('hood-sse-status', { detail: { connected: true, t: event.t } }));
    window.dispatchEvent(new CustomEvent('hood-realtime', { detail: event }));
    return;
  }

  window.dispatchEvent(new CustomEvent('hood-realtime', { detail: event }));

  if (event.type === REALTIME_TYPES.ADMIN_STATS && event.stats) {
    window.dispatchEvent(new CustomEvent('hood-admin-stats', { detail: event.stats }));
  }

  switch (event.type) {
    case REALTIME_TYPES.ACCOUNT_REQUEST_CREATED: {
      const req = event.request || {};
      const isLoad = req.requestType === 'COIN_LOAD' || Number(req.transferAmount || 0) > 0;
      window.dispatchEvent(
        new CustomEvent('hood_staff_event_local', {
          detail: {
            type: isLoad ? 'NEW_COIN_LOAD' : 'NEW_GAME_ID_REQUEST',
            request: req,
            userEmail: event.userEmail,
            timestamp: event.t,
          },
        })
      );
      window.dispatchEvent(new CustomEvent('hood-game-accounts-refresh', { detail: event }));
      break;
    }
    case REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED:
      window.dispatchEvent(new CustomEvent('hood-game-accounts-refresh', { detail: event }));
      break;
    case REALTIME_TYPES.CHAT_MESSAGE: {
      if (event.senderRole === 'staff') {
        try {
          const ch = new BroadcastChannel('hood_player_chat_sync');
          ch.postMessage({
            type: 'STAFF_CHAT_REPLY',
            userId: event.conversationId,
            time: event.t,
          });
          ch.close();
        } catch {}
        break;
      }
      const msg = event.message || {};
      const uid = event.conversationId || event.userId;
      window.dispatchEvent(
        new CustomEvent('hood_staff_event_local', {
          detail: {
            type: 'NEW_CHAT_MESSAGE',
            userId: uid,
            conversationId: uid,
            text: msg.text || '',
            username: msg.username || 'Player',
            message: { ...msg, id: msg.id || msg._id },
            senderRole: event.senderRole,
            timestamp: event.t,
          },
        })
      );
      break;
    }
    case REALTIME_TYPES.FINANCE_DEPOSIT:
      if (event.action === 'created' || event.status === 'pending') {
        window.dispatchEvent(
          new CustomEvent('hood_staff_event_local', {
            detail: {
              type: 'NEW_DEPOSIT',
              depositId: event.depositId,
              amount: event.amount,
              username: event.username,
              timestamp: event.t,
            },
          })
        );
      }
      break;
    case REALTIME_TYPES.FINANCE_WITHDRAW:
      if (event.action === 'created' || event.status === 'pending') {
        window.dispatchEvent(
          new CustomEvent('hood_staff_event_local', {
            detail: {
              type: 'NEW_WITHDRAW',
              redemptionId: event.redemptionId,
              amount: event.amount,
              username: event.username,
              timestamp: event.t,
            },
          })
        );
      }
      break;
    case REALTIME_TYPES.COIN_DESK:
      window.dispatchEvent(new CustomEvent('hood-coin-desk-refresh', { detail: event }));
      break;
  default:
      break;
  }

  if (ADMIN_PULSE_TYPES.has(event.type)) {
    adminDeskPulse(event);
    broadcastAdminDeskPulse();
  }

  if (event.type === REALTIME_TYPES.WALLET) {
    window.dispatchEvent(new CustomEvent('hood-wallet-sync', { detail: event }));
  }

  if (PLAYER_PULSE_TYPES.has(event.type)) {
    playerInstantPulse();
  }
}
