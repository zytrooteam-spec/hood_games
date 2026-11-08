import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { notifyStaff } from '@/lib/notify';
import { requirePlayerDbUser } from '@/lib/requirePlayerDbUser';
import { getFreeplayAmountSC } from '@/lib/freeplayConfig.server';

// GET - Check Freeplay eligibility, configured amount, and task status
export async function GET(req) {
  try {
    const db = await getDb();
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
    const configuredAmount = await getFreeplayAmountSC(db);
    const freeplayActive = settingsDoc?.freeplayActive !== false;

    const { dbUser: user } = await requirePlayerDbUser(req);
    if (!user) {
      return NextResponse.json({
        success: true,
        claimed: false,
        amount: configuredAmount,
        freeplayActive,
        pending: false,
      });
    }

    // Check if user has already claimed or had an approved task in lifetime
    const approvedTask = await db.collection('freeplay_tasks').findOne({
      $or: [
        { userId: user?._id ? user._id.toString() : '' },
        { email: user?.email ? user.email.toLowerCase().trim() : '' },
      ],
      status: { $in: ['approved', 'completed', 'claimed'] },
    });

    const claimed = Boolean(user?.freeplayClaimed || approvedTask);

    // Check if there is an active pending freeplay task
    const pendingTask = await db.collection('freeplay_tasks').findOne({
      $or: [
        { userId: user?._id ? user._id.toString() : '' },
        { email: user?.email ? user.email.toLowerCase().trim() : '' },
      ],
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      claimed,
      amount: configuredAmount,
      freeplayAmountSC: configuredAmount,
      freeplayActive,
      pending: Boolean(pendingTask),
      pendingTask: pendingTask ? {
        taskId: pendingTask.taskId,
        gameTitle: pendingTask.gameTitle,
        createdAt: pendingTask.createdAt,
      } : null,
      claimedAt: user?.freeplayClaimedAt || null,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST - Submit Freeplay Verification Task
export async function POST(req) {
  try {
    const { session, dbUser, error, status } = await requirePlayerDbUser(req);
    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: error || 'Please sign in to complete your Freeplay verification task.' },
        { status: status || 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { gameTitle, taskId, screenshot } = body;

    const db = await getDb();
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
    if (settingsDoc?.freeplayActive === false) {
      return NextResponse.json(
        { success: false, message: 'Freeplay bonus is currently disabled or inactive.' },
        { status: 400 }
      );
    }
    const configuredAmount = await getFreeplayAmountSC(db);

    const usersCol = db.collection('users');
    const user = dbUser;

    // 1-Time Freeplay Check: Block if already claimed
    if (user.freeplayClaimed) {
      return NextResponse.json({
        success: false,
        alreadyClaimed: true,
        message: 'You have already claimed your 1-time Freeplay bonus! Make a deposit to receive extra reload bonuses.',
      });
    }

    const existingApproved = await db.collection('freeplay_tasks').findOne({
      $or: [
        { userId: user._id.toString() },
        { email: user.email.toLowerCase().trim() },
      ],
      status: { $in: ['approved', 'completed', 'claimed'] },
    });

    if (existingApproved) {
      await usersCol.updateOne(
        { _id: user._id },
        { $set: { freeplayClaimed: true, freeplayClaimedAt: existingApproved.approvedAt || new Date() } }
      );
      return NextResponse.json({
        success: false,
        alreadyClaimed: true,
        message: 'You have already claimed your 1-time Freeplay bonus! Make a deposit to receive extra reload bonuses.',
      });
    }

    // Require game selection and screenshot proof
    if (!gameTitle || !String(gameTitle).trim()) {
      return NextResponse.json(
        { success: false, message: 'Please select a casino game for your freeplay credits.' },
        { status: 400 }
      );
    }

    if (!screenshot || !String(screenshot).trim()) {
      return NextResponse.json(
        { success: false, message: 'Please upload your Inbox screenshot proof before submitting.' },
        { status: 400 }
      );
    }

    // Check for existing pending task
    const existingPending = await db.collection('freeplay_tasks').findOne({
      $or: [
        { userId: user._id.toString() },
        { email: user.email.toLowerCase().trim() },
      ],
      status: 'pending',
    });

    if (existingPending) {
      return NextResponse.json({
        success: false,
        message: 'You already have a Freeplay verification task pending staff review. Please wait for our desk to process it.',
      });
    }

    const resolvedTaskId = taskId || `FP-${Math.floor(100000 + Math.random() * 900000)}`;

    // Record submission into freeplay_tasks collection
    await db.collection('freeplay_tasks').insertOne({
      taskId: resolvedTaskId,
      userId: user._id.toString(),
      username: user.username,
      email: user.email.toLowerCase().trim(),
      gameTitle: String(gameTitle).trim(),
      screenshot,
      amount: configuredAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    // Mark freeplay requested on user profile
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { freeplayRequested: true, freeplayRequestedAt: new Date() } }
    );

    // Create an account request in accountRequests (camelCase) so Coin Desk / Staff can approve
    const reqDoc = {
      userId: user._id.toString(),
      userName: user.username,
      userEmail: user.email.toLowerCase().trim(),
      gameTitle: String(gameTitle).trim(),
      requestType: 'ACCOUNT_CREATION',
      transferAmount: 0,
      status: 'PENDING',
      freeplayPending: true,
      freeplayAmount: configuredAmount,
      freeplayScreenshot: screenshot,
      freeplayTaskId: resolvedTaskId,
      notes: `🎁 Freeplay Welcome Bonus ($${configuredAmount.toFixed(2)} SC) • Task #${resolvedTaskId}`,
      createdAt: new Date(),
    };
    const reqInsert = await db.collection('accountRequests').insertOne(reqDoc);
    const reqIdStr = reqInsert.insertedId.toString();

    // Notify staff
    notifyStaff({
      type: 'freeplay_task_submitted',
      title: 'Freeplay Task Proof Submitted 🎁',
      message: `Player ${user.username} submitted Inbox screenshot for $${configuredAmount.toFixed(2)} Freeplay on ${gameTitle}.`,
      data: {
        userId: user._id.toString(),
        username: user.username,
        gameTitle,
        amount: String(configuredAmount),
        taskId: resolvedTaskId,
        requestId: reqIdStr,
        url: '/admin?tab=account_requests',
      },
    });

    return NextResponse.json({
      success: true,
      message: `🎉 Freeplay task submitted! Our 24/7 staff will verify your Inbox screenshot and load your $${configuredAmount.toFixed(2)} Freeplay credentials shortly.`,
      taskId: resolvedTaskId,
      requestId: reqIdStr,
      request: { id: reqIdStr, _id: reqIdStr, ...reqDoc },
      amount: configuredAmount,
    });
  } catch (err) {
    console.error('Freeplay Task submission error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
