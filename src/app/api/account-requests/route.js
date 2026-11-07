import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { sanitizeGameTitle } from '@/lib/fastDiff';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const player = await getSessionUser(req, 'player');
    const admin = await getSessionUser(req, 'admin');
    const user = player || (admin && isStaffRole(admin.role) ? admin : null);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const isStaff = isStaffRole(user.role) && !player;

    let requests;
    if (isStaff) {
      requests = await db.collection('accountRequests').find({}).sort({ createdAt: -1 }).toArray();
    } else {
      requests = await db
        .collection('accountRequests')
        .find({ userId: user.id || user._id.toString() })
        .sort({ createdAt: -1 })
        .toArray();
    }

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'player');
    if (!user) {
      return NextResponse.json({ success: false, error: 'Please log in to request game accounts' }, { status: 401 });
    }

    const { gameId, gameTitle, transferAmount, notes } = await req.json();
    const cleanGameTitle = sanitizeGameTitle(gameTitle);
    if (!cleanGameTitle) {
      return NextResponse.json({ success: false, error: 'Game title required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = user.id || user._id.toString();

    // Check if player already has an account for this game
    const existingAcc = await db.collection('game_accounts').findOne({
      userId,
      gameTitle: cleanGameTitle,
    });

    if (existingAcc) {
      return NextResponse.json({
        success: false,
        error: `You already have an active account for ${cleanGameTitle}. View credentials in your My Game IDs station.`,
      }, { status: 400 });
    }

    const reqDoc = {
      userId,
      username: user.username,
      userEmail: user.email,
      gameId: gameId || cleanGameTitle.toLowerCase().replace(/\s+/g, '-'),
      gameTitle: cleanGameTitle,
      transferAmount: Number(transferAmount || 0),
      notes: notes || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('accountRequests').insertOne(reqDoc);

    notifyStaff({
      title: `🎮 New Game ID Request: ${gameTitle}`,
      message: `Player ${user.username} requested login credentials for ${gameTitle}.`,
      type: 'account_request',
      data: { requestId: res.insertedId.toString() },
    });

    return NextResponse.json({
      success: true,
      request: { ...reqDoc, _id: res.insertedId },
      message: `Request for ${gameTitle} submitted! Staff will issue your credentials shortly.`,
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

    const { requestId, action, gameUsername, gamePassword, loginUrl, rejectionReason } = await req.json();
    if (!requestId || !action) {
      return NextResponse.json({ success: false, error: 'Request ID and action required' }, { status: 400 });
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
      const amount = Number(reqDoc.freeplayAmount || 0);
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

      return NextResponse.json({ success: true, message: `Credited $${amount.toFixed(2)} SC freeplay to player wallet.` });
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
        const fpAmt = Number(reqDoc.freeplayAmount || 0);
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

      return NextResponse.json({ success: true, message: 'Game credentials issued successfully!' });
    } else if (action === 'reject') {
      await db.collection('accountRequests').updateOne(
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

      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Account request PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
