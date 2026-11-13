import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady, ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { sanitizeGameTitle } from '@/lib/fastDiff';
import { mapAccountRequest } from '@/lib/mapAccountRequest';
import { resolvePlayerDbUser } from '@/lib/resolvePlayerDbUser';
import { getFreeplayAmountSC } from '@/lib/freeplayConfig.server';
import {
  publishAccountRequestCreated,
  publishAccountRequestUpdated,
  publishCoinDeskPulse,
} from '@/lib/realtimePublish';
import { pulseStaffStatsAsync, pulseStaffScope } from '@/lib/staffDeskPulse.server';
import {
  invalidateAccountRequestsCache,
  invalidateAuthCache,
  invalidateGameAccountsCache,
} from '@/lib/authCache';
import {
  dedupeStaffPendingGameIdRequests,
  autoCloseDuplicatePendingInDb,
  annotateRepeatPendingFlags,
} from '@/lib/accountRequestDedupe.server';

function bustStaffRequestCaches({ userEmail, userId } = {}) {
  invalidateAccountRequestsCache();
  if (userEmail) invalidateGameAccountsCache(userEmail);
  if (userId) invalidateAuthCache(String(userId));
}

const STAFF_LIST_PROJECTION = {
  userId: 1,
  userEmail: 1,
  userName: 1,
  username: 1,
  gameTitle: 1,
  gameId: 1,
  status: 1,
  requestType: 1,
  transferAmount: 1,
  pendingCoinLoadAmount: 1,
  createdAt: 1,
  updatedAt: 1,
  freeplayPending: 1,
  freeplayAmount: 1,
  gameAccountUsername: 1,
  gameAccountPassword: 1,
  gameUsername: 1,
  gamePassword: 1,
  rejectionReason: 1,
  notes: 1,
  coinLoadQueued: 1,
  depositAmount: 1,
};

function buildStaffQuery(searchParams) {
  const query = {};
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const email = searchParams.get('email');

  if (email) query.userEmail = email.toLowerCase().trim();
  if (status && status !== 'all') {
    const s = status.toUpperCase();
    if (s === 'PENDING') query.status = { $in: ['pending', 'PENDING', 'Pending'] };
    else if (s === 'READY') query.status = { $in: ['approved', 'READY', 'ready'] };
    else if (s === 'REJECTED') query.status = { $in: ['rejected', 'REJECTED', 'cancelled'] };
    else query.status = s;
  }

  if (type === 'ACCOUNT_CREATION') {
    query.$and = [
      {
        $or: [
          { requestType: 'ACCOUNT_CREATION' },
          {
            $and: [
              { requestType: { $ne: 'COIN_LOAD' } },
              { $or: [{ transferAmount: { $lte: 0 } }, { transferAmount: { $exists: false } }] },
            ],
          },
        ],
      },
    ];
  } else if (type === 'COIN_LOAD') {
    query.$and = [
      {
        $or: [
          { requestType: 'COIN_LOAD' },
          { transferAmount: { $gt: 0 } },
        ],
      },
    ];
  }
  return query;
}

export async function GET(req) {
  try {
    await ensureDbReady();
    const admin = await getSessionUser(req, 'admin');
    const player = await getSessionUser(req, 'player');

    const isStaff = Boolean(admin && isStaffRole(admin.role));
    const user = isStaff ? admin : player;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);

    let requests;
    let totalCount = 0;
    if (isStaff) {
      const query = buildStaffQuery(searchParams);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const staffLimit = Math.min(120, Math.max(1, parseInt(searchParams.get('limit') || '60', 10) || 60));
      const skip = (page - 1) * staffLimit;
      const cursor = db
        .collection('accountRequests')
        .find(query)
        .project(STAFF_LIST_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(staffLimit);
      const [rows, count] = await Promise.all([cursor.toArray(), db.collection('accountRequests').countDocuments(query)]);
      const dupClosed = await autoCloseDuplicatePendingInDb(db, rows);
      if (dupClosed > 0) {
        invalidateAccountRequestsCache();
        pulseStaffStatsAsync();
      }
      requests = rows;
      totalCount = count;
    } else {
      const usersCol = db.collection('users');
      const dbUser = await resolvePlayerDbUser(user, usersCol);
      const uid = dbUser?._id?.toString() || user.userId || user.id || user._id?.toString?.() || '';
      const email = (dbUser?.email || user.email || '').toLowerCase().trim();
      const playerFilter = [{ userId: uid }];
      if (email) playerFilter.push({ userEmail: email });
      requests = await db
        .collection('accountRequests')
        .find({ $or: playerFilter })
        .sort({ createdAt: -1 })
        .toArray();
    }

    let mapped = requests.map((r) => mapAccountRequest(r));
    if (isStaff) {
      mapped = dedupeStaffPendingGameIdRequests(mapped);
      mapped = annotateRepeatPendingFlags(mapped);
    }
    const payload = {
      success: true,
      requests: mapped,
      accountRequests: mapped,
      totalCount: isStaff ? totalCount : mapped.length,
    };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const session = await getSessionUser(req, 'player');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue.' }, { status: 401 });
    }

    const body = await req.json();
    const cleanGameTitle = sanitizeGameTitle(body.gameTitle);
    if (!cleanGameTitle) {
      return NextResponse.json({ success: false, error: 'Game title required' }, { status: 400 });
    }

    const transferAmount = Math.max(0, Number(body.transferAmount || 0));
    const requestType =
      body.requestType === 'COIN_LOAD' || transferAmount > 0 ? 'COIN_LOAD' : 'ACCOUNT_CREATION';
    const gameAccountUsername = String(body.gameAccountUsername || '').trim();

    const db = await getDb();
    const usersCol = db.collection('users');
    const dbUser = await resolvePlayerDbUser(session, usersCol);
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired or account missing. Please log out and sign in again.',
          code: 'USER_NOT_RESOLVED',
        },
        { status: 401 }
      );
    }

    const currentSC = Number(dbUser.balanceSC || 0);
    const frozen = Math.max(0, Number(dbUser.frozenBalance || 0));
    const available = Math.max(0, Number((currentSC - frozen).toFixed(2)));

    if (requestType === 'COIN_LOAD') {
      if (transferAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Specify a coin amount greater than $0.' },
          { status: 400 }
        );
      }
      if (transferAmount > available) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot load $${transferAmount.toFixed(2)} SC. Available: $${available.toFixed(2)} (${frozen.toFixed(2)} in escrow).`,
          },
          { status: 400 }
        );
      }
    } else {
      const existingAcc = await db.collection('game_accounts').findOne({
        userId: dbUser._id.toString(),
        gameTitle: cleanGameTitle,
      });
      if (existingAcc) {
        return NextResponse.json(
          {
            success: false,
            alreadyHasAccount: true,
            error: `You already have credentials for ${cleanGameTitle}.`,
          },
          { status: 400 }
        );
      }
    }

    const pendingQuery = {
      userId: dbUser._id.toString(),
      gameTitle: cleanGameTitle,
      status: { $in: ['pending', 'PENDING', 'Pending'] },
    };
  if (requestType === 'COIN_LOAD') {
      pendingQuery.$or = [{ requestType: 'COIN_LOAD' }, { transferAmount: { $gt: 0 } }];
    }
    const existingPending = await db.collection('accountRequests').findOne(pendingQuery);
    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          isPending: true,
          error: `You already have a pending ${requestType === 'COIN_LOAD' ? 'coin load' : 'ID'} request for ${cleanGameTitle}.`,
        },
        { status: 400 }
      );
    }

    if (requestType !== 'COIN_LOAD') {
      const cooldownMs = 12 * 60 * 60 * 1000;
      const recentReject = await db.collection('accountRequests').findOne(
        {
          userId: dbUser._id.toString(),
          gameTitle: cleanGameTitle,
          status: { $in: ['rejected', 'REJECTED', 'cancelled'] },
          rejectedAt: { $gte: new Date(Date.now() - cooldownMs) },
          $or: [
            { requestType: { $ne: 'COIN_LOAD' } },
            { transferAmount: { $lte: 0 } },
            { transferAmount: { $exists: false } },
          ],
        },
        { sort: { rejectedAt: -1 } }
      );
      if (recentReject) {
        return NextResponse.json(
          {
            success: false,
            recentlyRejected: true,
            error: `Your ${cleanGameTitle} request was recently reviewed. Please wait up to 12 hours or contact support chat before submitting again.`,
          },
          { status: 400 }
        );
      }
    }

    if (requestType === 'COIN_LOAD' && transferAmount > 0) {
      await usersCol.updateOne(toIdQuery(dbUser._id), {
        $inc: { frozenBalance: transferAmount },
        $set: { updatedAt: new Date() },
      });
      await db.collection('ledger').insertOne({
        userId: dbUser._id.toString(),
        username: dbUser.username,
        type: 'game_load_freeze',
        currency: 'SC',
        amount: transferAmount,
        balanceBefore: currentSC,
        balanceAfter: currentSC,
        frozenAmount: transferAmount,
        performedBy: 'player',
        referenceId: cleanGameTitle,
        notes: `Escrow $${transferAmount.toFixed(2)} SC for ${cleanGameTitle} load`,
        createdAt: new Date(),
      });
    }

    const reqDoc = {
      userId: dbUser._id.toString(),
      username: dbUser.username,
      userName: dbUser.username,
      userEmail: (dbUser.email || session.email || '').toLowerCase(),
      gameId: body.gameId || cleanGameTitle.toLowerCase().replace(/\s+/g, '-'),
      gameTitle: cleanGameTitle,
      gameAccountUsername: gameAccountUsername || '',
      requestType,
      transferAmount,
      notes: body.notes || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('accountRequests').insertOne(reqDoc);

    notifyStaff({
      title:
        requestType === 'COIN_LOAD'
          ? `⚡ Coin load: $${transferAmount.toFixed(2)} → ${cleanGameTitle}`
          : `🎮 New Game ID: ${cleanGameTitle}`,
      message: `Player ${dbUser.username} — ${requestType === 'COIN_LOAD' ? 'load coins' : 'request credentials'}.`,
      type: requestType === 'COIN_LOAD' ? 'coin_load' : 'account_request',
      data: { requestId: res.insertedId.toString() },
    });

    publishAccountRequestCreated({
      request: {
        ...reqDoc,
        _id: res.insertedId,
        id: res.insertedId.toString(),
        gameTitle: cleanGameTitle,
      },
      userEmail: dbUser.email,
      userId: dbUser._id.toString(),
    });
    pulseStaffStatsAsync();
    pulseStaffScope('requests');
    if (requestType === 'COIN_LOAD') publishCoinDeskPulse({ requestId: res.insertedId.toString() });

    invalidateAccountRequestsCache();
    invalidateAuthCache(dbUser._id.toString());

    return NextResponse.json({
      success: true,
      requestId: res.insertedId.toString(),
      request: { ...reqDoc, _id: res.insertedId, id: res.insertedId.toString() },
      message:
        requestType === 'COIN_LOAD'
          ? `Load request submitted! $${transferAmount.toFixed(2)} SC held in escrow until staff approves.`
          : `Request for ${cleanGameTitle} submitted! Staff will issue credentials shortly.`,
    });
  } catch (err) {
    console.error('Account request error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Staff approval / provisioning
export async function PUT(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required' }, { status: 403 });
    }

    const body = await req.json();
    let action = body.action;
  const requestId = body.requestId || body.id;
    let gameUsername = body.gameUsername || body.username;
    let gamePassword = body.gamePassword || body.password;
    const loginUrl = body.loginUrl || '';
    const rejectionReason = body.rejectionReason || body.reason;

    if (action === 'cancel') action = 'reject';
    if (!requestId || !action) {
      return NextResponse.json({ success: false, message: 'Request ID and action required' }, { status: 400 });
    }

    const db = await getDb();
    const reqDoc = await db.collection('accountRequests').findOne(toIdQuery(requestId));
    if (!reqDoc) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    const finishFreeplaySideEffects = async (reqDoc, staffUsername, gameTitle) => {
      await db.collection('users').updateOne(toIdQuery(reqDoc.userId), {
        $set: {
          freeplayClaimed: true,
          freeplayClaimedAt: new Date(),
          freeplayGameTitle: gameTitle || reqDoc.gameTitle,
          updatedAt: new Date(),
        },
      });
      await db.collection('freeplay_tasks').updateMany(
        {
          $or: [
            { userId: reqDoc.userId },
            { email: reqDoc.userEmail },
          ],
          status: 'pending',
        },
        {
          $set: {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: staffUsername,
          },
        }
      );
    };

    if (action === 'freeplay_wallet') {
      const configured = await getFreeplayAmountSC(db);
      const amount = configured > 0 ? configured : Number(reqDoc.freeplayAmount || 0);
      if (amount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid freeplay amount on request' }, { status: 400 });
      }
      const player = await db.collection('users').findOne(toIdQuery(reqDoc.userId));
      if (!player) {
        return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
      }
      const before = Number(player.balanceSC || 0);
      const after = Number((before + amount).toFixed(2));

      await db.collection('users').updateOne(toIdQuery(reqDoc.userId), {
        $inc: { balanceSC: amount },
        $set: { updatedAt: new Date() },
      });

      await db.collection('ledger').insertOne({
        userId: reqDoc.userId,
        username: player.username || reqDoc.username || reqDoc.userName,
        type: 'freeplay_credit',
        currency: 'SC',
        amount,
        balanceBefore: before,
        balanceAfter: after,
        performedBy: user.username,
        referenceId: String(reqDoc._id),
        notes: `Freeplay welcome bonus $${amount.toFixed(2)} SC — task ${reqDoc.freeplayTaskId || 'n/a'}`,
        createdAt: new Date(),
      });

      await db.collection('accountRequests').updateOne(toIdQuery(requestId), {
        $set: {
          status: 'approved',
          approvedBy: user.username,
          approvedAt: new Date(),
          updatedAt: new Date(),
          freeplayCredited: true,
        },
      });

      await finishFreeplaySideEffects(reqDoc, user.username, reqDoc.gameTitle);

      notifyPlayer({
        userId: reqDoc.userId,
        title: '🎁 Freeplay Bonus Credited!',
        message: `Your $${amount.toFixed(2)} SC Freeplay has been added to your Hood wallet. Enjoy ${reqDoc.gameTitle || 'the games'}!`,
        type: 'freeplay_approved',
      });

      bustStaffRequestCaches({ userEmail: reqDoc.userEmail, userId: reqDoc.userId });
      return NextResponse.json({ success: true, message: `Credited $${amount.toFixed(2)} SC freeplay to player wallet.` });
    }

    const isCoinLoad =
      reqDoc.requestType === 'COIN_LOAD' || Number(reqDoc.transferAmount || 0) > 0;

    if (action === 'approve' && isCoinLoad && (!gameUsername || !gamePassword)) {
      const loadAmt = Number(body.transferAmount ?? reqDoc.transferAmount ?? 0);
      const originalFrozen = Number(reqDoc.transferAmount || 0);
      const finalAmt = loadAmt > 0 ? loadAmt : originalFrozen;
      const player = await db.collection('users').findOne(toIdQuery(reqDoc.userId));
      if (player && finalAmt > 0) {
        const oldSC = Number(player.balanceSC || 0);
        const newSC = Math.max(0, Number((oldSC - finalAmt).toFixed(2)));
        const oldFrozen = Math.max(0, Number(player.frozenBalance || 0));
        const newFrozen = Math.max(0, Number((oldFrozen - originalFrozen).toFixed(2)));
        await db.collection('users').updateOne(toIdQuery(reqDoc.userId), {
          $set: { balanceSC: newSC, frozenBalance: newFrozen, updatedAt: new Date() },
        });
        await db.collection('ledger').insertOne({
          userId: reqDoc.userId,
          username: player.username,
          type: 'game_transfer',
          currency: 'SC',
          amount: -finalAmt,
          balanceBefore: oldSC,
          balanceAfter: newSC,
          performedBy: user.username,
          referenceId: String(reqDoc._id),
          notes: `Coin load into ${reqDoc.gameTitle} (${reqDoc.gameAccountUsername || 'player ID'})`,
          createdAt: new Date(),
        });
      }
      await db.collection('accountRequests').updateOne(toIdQuery(requestId), {
        $set: {
          status: 'approved',
          approvedBy: user.username,
          approvedAt: new Date(),
          updatedAt: new Date(),
          transferAmount: finalAmt,
        },
      });
      notifyPlayer({
        userId: reqDoc.userId,
        title: `⚡ ${reqDoc.gameTitle} Coin Load Approved`,
        message: `$${finalAmt.toFixed(2)} SC transferred into your ${reqDoc.gameTitle} account.`,
        type: 'coin_load_approved',
      });
      bustStaffRequestCaches({ userEmail: reqDoc.userEmail, userId: reqDoc.userId });
      return NextResponse.json({
        success: true,
        message: `Coin load for ${reqDoc.gameTitle} approved ($${finalAmt.toFixed(2)} SC).`,
      });
    }

    if (action === 'approve') {
      if (!gameUsername || !gamePassword) {
        return NextResponse.json({ success: false, error: 'Game username and password required' }, { status: 400 });
      }

      // 1. Create or update game account for player
      await db.collection('game_accounts').updateOne(
        { userId: reqDoc.userId, gameTitle: reqDoc.gameTitle },
        {
          $set: {
            userId: reqDoc.userId,
            username: reqDoc.username,
            gameId: reqDoc.gameId,
            gameTitle: reqDoc.gameTitle,
            gameUsername,
            gamePassword,
            loginUrl: loginUrl || '',
            provisionedBy: user.username,
            provisionedAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // 2. Mark request approved
      await db.collection('accountRequests').updateOne(
        toIdQuery(requestId),
        {
          $set: {
            status: 'approved',
            gameUsername,
            gamePassword,
            approvedBy: user.username,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      if (reqDoc.freeplayPending) {
        const configured = await getFreeplayAmountSC(db);
        const fpAmt = configured > 0 ? configured : Number(reqDoc.freeplayAmount || 0);
        if (fpAmt > 0) {
          const player = await db.collection('users').findOne(toIdQuery(reqDoc.userId));
          if (player) {
            await db.collection('users').updateOne(toIdQuery(reqDoc.userId), {
              $inc: { balanceSC: fpAmt },
              $set: { updatedAt: new Date() },
            });
            await db.collection('ledger').insertOne({
              userId: reqDoc.userId,
              username: player.username,
              type: 'freeplay_credit',
              currency: 'SC',
              amount: fpAmt,
              balanceBefore: Number(player.balanceSC || 0),
              balanceAfter: Number((Number(player.balanceSC || 0) + fpAmt).toFixed(2)),
              performedBy: user.username,
              referenceId: String(reqDoc._id),
              notes: `Freeplay + game ID issued for ${reqDoc.gameTitle}`,
              createdAt: new Date(),
            });
          }
        }
        await finishFreeplaySideEffects(reqDoc, user.username, reqDoc.gameTitle);
      }

      notifyPlayer({
        userId: reqDoc.userId,
        title: reqDoc.freeplayPending
          ? `🎁 Freeplay + ${reqDoc.gameTitle} ID Ready!`
          : `🔑 Your ${reqDoc.gameTitle} Account is Ready!`,
        message: reqDoc.freeplayPending
          ? `Username: ${gameUsername} | Password: ${gamePassword}. Freeplay SC was added to your wallet.`
          : `Username: ${gameUsername} | Password: ${gamePassword}. Tap to access your game credentials.`,
        type: 'account_approved',
      });

      let autoCoinLoadCreated = false;
      let queuedLoadAmount = Number(reqDoc.pendingCoinLoadAmount || reqDoc.transferAmount || 0);
      if (queuedLoadAmount > 0 && !isCoinLoad) {
        const loadDoc = {
          userId: reqDoc.userId,
          userEmail: reqDoc.userEmail,
          userName: reqDoc.userName || reqDoc.username,
          gameTitle: reqDoc.gameTitle,
          gameId: reqDoc.gameId,
          requestType: 'COIN_LOAD',
          transferAmount: queuedLoadAmount,
          gameAccountUsername: gameUsername,
          gameAccountPassword: gamePassword,
          status: 'pending',
          notes: `Auto-queued after ID @${gameUsername}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const ins = await db.collection('accountRequests').insertOne(loadDoc);
        autoCoinLoadCreated = true;
        notifyStaff({
          title: '⚡ Coin load queued',
          message: `$${queuedLoadAmount.toFixed(2)} SC waiting in Coins Allotment for ${reqDoc.gameTitle}`,
          type: 'coin_load',
        });
        bustStaffRequestCaches({ userEmail: reqDoc.userEmail, userId: reqDoc.userId });
        return NextResponse.json({
          success: true,
          message: 'Game credentials issued successfully!',
          autoCoinLoadCreated,
          queuedLoadAmount,
          autoCreatedCoinLoad: { id: ins.insertedId.toString(), ...loadDoc },
        });
      }

      bustStaffRequestCaches({ userEmail: reqDoc.userEmail, userId: reqDoc.userId });
      publishAccountRequestUpdated({
        action: 'approve',
        status: 'approved',
        userEmail: reqDoc.userEmail,
        userId: reqDoc.userId,
        requestId: String(reqDoc._id),
      });
      pulseStaffStatsAsync();
      return NextResponse.json({ success: true, message: 'Game credentials issued successfully!' });
    } else if (action === 'reject') {
      const isCoinLoadReject =
        reqDoc.requestType === 'COIN_LOAD' || Number(reqDoc.transferAmount || 0) > 0;
      if (isCoinLoadReject) {
        const unfrozen = Number(reqDoc.transferAmount || 0);
        const player = await db.collection('users').findOne(toIdQuery(reqDoc.userId));
        if (player && unfrozen > 0) {
          const newFrozen = Math.max(
            0,
            Number((Number(player.frozenBalance || 0) - unfrozen).toFixed(2))
          );
          await db.collection('users').updateOne(toIdQuery(reqDoc.userId), {
            $set: { frozenBalance: newFrozen, updatedAt: new Date() },
          });
        }
      }

      const rejectUpdate = await db.collection('accountRequests').updateOne(
        toIdQuery(requestId),
        {
          $set: {
            status: 'rejected',
            rejectionReason: rejectionReason || 'Game server unavailable or maximum player limit reached.',
            rejectedBy: user.username,
            rejectedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      if (rejectUpdate.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Request not found — refresh the desk and try again.' },
          { status: 404 }
        );
      }
      if (rejectUpdate.modifiedCount === 0) {
        const again = await db.collection('accountRequests').findOne(toIdQuery(requestId));
        const cur = String(again?.status || '').toLowerCase();
        if (cur !== 'rejected' && cur !== 'cancelled') {
          return NextResponse.json(
            { success: false, error: 'Could not update request status. Try again.' },
            { status: 409 }
          );
        }
      }

      const siblingFilter = {
        status: { $in: ['pending', 'PENDING', 'Pending'] },
        gameTitle: reqDoc.gameTitle,
        $or: [{ userId: reqDoc.userId }, { userEmail: reqDoc.userEmail }],
        _id: { $ne: reqDoc._id },
        $and: [
          {
            $or: [
              { requestType: { $ne: 'COIN_LOAD' } },
              { transferAmount: { $lte: 0 } },
              { transferAmount: { $exists: false } },
            ],
          },
        ],
      };
      await db.collection('accountRequests').updateMany(siblingFilter, {
        $set: {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Closed with duplicate pending request.',
          rejectedBy: user.username,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const freshRejected = await db.collection('accountRequests').findOne(toIdQuery(requestId));

      if (reqDoc.freeplayPending) {
        await db.collection('freeplay_tasks').updateMany(
          {
            $or: [{ userId: reqDoc.userId }, { email: reqDoc.userEmail }],
            status: 'pending',
          },
          {
            $set: {
              status: 'rejected',
              rejectedAt: new Date(),
              rejectedBy: user.username,
              rejectionReason: rejectionReason || 'Staff rejected freeplay verification',
            },
          }
        );
      }

      notifyPlayer({
        userId: reqDoc.userId,
        title: `⚠️ ${reqDoc.gameTitle} Request Note`,
        message: `Could not issue credentials for ${reqDoc.gameTitle}. Reason: ${rejectionReason || 'Contact support.'}`,
        type: 'account_rejected',
      });

      bustStaffRequestCaches({ userEmail: reqDoc.userEmail, userId: reqDoc.userId });
      publishAccountRequestUpdated({
        action: 'reject',
        status: 'rejected',
        userEmail: reqDoc.userEmail,
        userId: reqDoc.userId,
        requestId: String(reqDoc._id),
      });
      pulseStaffStatsAsync();
      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        request: freshRejected ? mapAccountRequest(freshRejected) : null,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Account request PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, message: 'Staff only' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });
    const db = await getDb();
    const res = await db.collection('accountRequests').deleteOne(toIdQuery(id));
    if (res.deletedCount === 0) {
      invalidateAccountRequestsCache();
      return NextResponse.json({ success: true, alreadyDeleted: true, message: 'Already removed' });
    }
    invalidateAccountRequestsCache();
    return NextResponse.json({ success: true, message: 'Request dismissed' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
