import {
  getRealtimeHub,
  staffChannel,
  playerEmailChannel,
  playerIdChannel,
  guestChannel,
  conversationChannels,
  playerBroadcastChannel,
} from '@/lib/realtimeHub';

export const REALTIME_TYPES = {
  ACCOUNT_REQUEST_CREATED: 'ACCOUNT_REQUEST_CREATED',
  ACCOUNT_REQUEST_UPDATED: 'ACCOUNT_REQUEST_UPDATED',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  DESK_SYNC: 'DESK_SYNC',
  FINANCE_DEPOSIT: 'FINANCE_DEPOSIT',
  FINANCE_WITHDRAW: 'FINANCE_WITHDRAW',
  WALLET: 'WALLET',
  COIN_DESK: 'COIN_DESK',
  ADMIN_STATS: 'ADMIN_STATS',
  SSE_CONNECTED: 'CONNECTED',
};

function resolveChannels(targets = {}) {
  const channels = [];
  if (targets.staff) channels.push(staffChannel());
  if (targets.broadcast) channels.push(playerBroadcastChannel());
  if (targets.userEmail) {
    const ch = playerEmailChannel(targets.userEmail);
    if (ch) channels.push(ch);
  }
  if (targets.userId) {
    const ch = playerIdChannel(targets.userId);
    if (ch) channels.push(ch);
  }
  if (targets.guestId) {
    const ch = guestChannel(targets.guestId);
    if (ch) channels.push(ch);
  }
  if (targets.conversationId) {
    channels.push(...conversationChannels(targets.conversationId));
  }
  return [...new Set(channels)];
}

export function publishRealtimeEvent(opts) {
  const { type, targets = {}, ...rest } = opts;
  const channels = resolveChannels(targets);
  if (channels.length === 0) return;
  getRealtimeHub().publish(channels, { type, ...rest });
}

export function publishStaffPlayerSync(type, fields = {}) {
  const { userEmail, userId, staff = true, guestId, conversationId, ...rest } = fields;
  publishRealtimeEvent({
    type,
    userEmail,
    userId,
    ...rest,
    targets: { staff, userEmail, userId, guestId, conversationId },
  });
}

export function publishChatRealtime({ conversationId, senderRole, message, userEmail, userId }) {
  publishRealtimeEvent({
    type: REALTIME_TYPES.CHAT_MESSAGE,
    conversationId,
    senderRole,
    message,
    targets: {
      staff: true,
      userEmail,
      userId,
      conversationId,
    },
  });
}

export function publishFinanceDeposit(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.FINANCE_DEPOSIT, fields);
}

export function publishFinanceWithdraw(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.FINANCE_WITHDRAW, fields);
}

export function publishAccountRequestCreated({ request, userEmail, userId }) {
  publishStaffPlayerSync(REALTIME_TYPES.ACCOUNT_REQUEST_CREATED, {
    request,
    userEmail,
    userId,
    status: 'pending',
  });
}

export function publishDeskSync(payload = {}) {
  publishRealtimeEvent({
    type: REALTIME_TYPES.DESK_SYNC,
    ...payload,
    targets: { staff: true },
  });
}

/** scope: stats | finance | requests | chat | all */
export function publishStaffDeskPulse(scope = 'all', extra = {}) {
  publishDeskSync({ scope, ...extra });
}

export function publishAccountRequestUpdated(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED, {
    ...fields,
    staff: true,
  });
  publishStaffDeskPulse('requests');
}

export function publishAdminStatsSnapshot(stats) {
  if (!stats) return;
  publishRealtimeEvent({
    type: REALTIME_TYPES.ADMIN_STATS,
    stats,
    targets: { staff: true },
  });
}
