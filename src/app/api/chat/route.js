import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';
import { requirePlayerDbUser } from '@/lib/requirePlayerDbUser';
import { publishChatRealtime } from '@/lib/realtimePublish';
import { buildStaffChatThreads, touchChatThreadOnMessage, clearStaffThreadUnread } from '@/lib/chatThreads.server';
import { serializeChatMessageForApi, serializeChatMessagesForApi } from '@/lib/chatMessageApi';
import {
  buildPlayerChatMessageQuery,
  canonicalPlayerUserId,
  resolveStaffChatTargetUser,
} from '@/lib/chatIdentity.server';

function previewText(text, imageUrl) {
  const t = (text || '').trim();
  if (t) return t;
  if (imageUrl) return '📷 Image attachment';
  return '';
}

export async function GET(req) {
  try {
    await ensureDbReady();
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const db = await getDb();

    if (targetUserId) {
      const staff = await getSessionUser(req, 'admin');
      if (!staff || !isStaffRole(staff.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      const rawId = String(targetUserId).trim();
      const msgLimit = Math.min(80, Math.max(15, parseInt(searchParams.get('limit') || '45', 10) || 45));
      let player = await db.collection('users').findOne(toIdQuery(rawId), {
        projection: { username: 1, email: 1, balanceSC: 1, balanceGC: 1 },
      });
      if (!player && rawId.includes('@')) {
        player = await db.collection('users').findOne(
          { email: rawId.toLowerCase() },
          { projection: { username: 1, email: 1, balanceSC: 1, balanceGC: 1 } }
        );
      }
      if (!player) {
        const resolved = await resolveStaffChatTargetUser(db, rawId);
        if (resolved?.userId && resolved.userId !== rawId) {
          player = await db.collection('users').findOne(toIdQuery(resolved.userId), {
            projection: { username: 1, email: 1, balanceSC: 1, balanceGC: 1 },
          });
        }
      }
      const uid = player?._id?.toString?.() || rawId;
      const msgQuery = player ? buildPlayerChatMessageQuery(player) : { userId: uid };

      const [messages, threadMeta] = await Promise.all([
        db
          .collection('chat_messages')
          .find(msgQuery)
          .sort({ createdAt: -1 })
          .limit(msgLimit)
          .toArray()
          .then((rows) => rows.reverse()),
        db.collection('chat_threads').findOne(
          { userId: uid },
          { projection: { labels: 1, staffNotes: 1, userId: 1 } }
        ),
      ]);

      const payload = {
        success: true,
        messages: serializeChatMessagesForApi(messages),
        threadMeta: threadMeta || { userId: uid, labels: [], staffNotes: [] },
        player: player
          ? {
              id: player._id.toString(),
              username: player.username,
              email: player.email,
              balanceSC: player.balanceSC,
              balanceGC: player.balanceGC,
            }
          : null,
      };

      // Return messages first; mark-read can lag on large inboxes without blocking staff UI.
      void Promise.all([
        db
          .collection('chat_messages')
          .updateMany({ ...msgQuery, senderRole: 'player', read: { $ne: true } }, { $set: { read: true } }),
        clearStaffThreadUnread(db, uid),
      ]).catch(() => {});

      return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const wantsInbox = searchParams.get('inbox') === '1' || req.headers.get('x-hood-staff-desk') === '1';
    const wantsPlayerChat =
      req.headers.get('x-hood-player-chat') === '1' || searchParams.get('scope') === 'player';

    const loadPlayerMessages = async () => {
      const resolved = await requirePlayerDbUser(req);
      if (!resolved.dbUser) {
        return NextResponse.json({ success: true, messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const uid = canonicalPlayerUserId(resolved.dbUser);
      const msgQuery = buildPlayerChatMessageQuery(resolved.dbUser);
      const msgLimit = Math.min(100, Math.max(15, parseInt(searchParams.get('limit') || '60', 10) || 60));
      const listProjection = {
        text: 1,
        senderRole: 1,
        username: 1,
        userId: 1,
        userEmail: 1,
        createdAt: 1,
        read: 1,
        staffUsername: 1,
        imageUrl: 1,
      };
      const rows = await db
        .collection('chat_messages')
        .find(msgQuery, { projection: listProjection })
        .sort({ createdAt: -1 })
        .limit(msgLimit)
        .toArray();
      const messages = rows.reverse();

      void db
        .collection('chat_messages')
        .updateMany({ ...msgQuery, senderRole: 'staff', read: { $ne: true } }, { $set: { read: true } })
        .catch(() => {});

      return NextResponse.json(
        { success: true, messages: serializeChatMessagesForApi(messages), userId: uid },
        { headers: { 'Cache-Control': 'private, max-age=8' } }
      );
    };

    if (wantsPlayerChat) {
      const playerSession = await getSessionUser(req, 'player');
      if (!playerSession) {
        return NextResponse.json({ success: true, messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }
      return loadPlayerMessages();
    }

    if (wantsInbox) {
      const staff = await getSessionUser(req, 'admin');
      if (!staff || !isStaffRole(staff.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
      const threadLimit = Math.min(200, Math.max(20, parseInt(searchParams.get('limit') || '80', 10) || 80));
      const threads = await buildStaffChatThreads(db, { limit: threadLimit });
      return NextResponse.json({ success: true, threads });
    }

    const playerSession = await getSessionUser(req, 'player');
    if (playerSession) {
      return loadPlayerMessages();
    }

    const staff = await getSessionUser(req, 'admin');
    if (staff && isStaffRole(staff.role)) {
      const threadLimit = Math.min(200, Math.max(20, parseInt(searchParams.get('limit') || '80', 10) || 80));
      const threads = await buildStaffChatThreads(db, { limit: threadLimit });
      return NextResponse.json({ success: true, threads });
    }

    return NextResponse.json({ success: true, messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbReady();
    const referer = req.headers.get('referer') || '';
    const isAdminContext =
      req.headers.get('x-hood-staff-desk') === '1' || referer.includes('/admin');
    const user = await getSessionUser(req, isAdminContext ? 'admin' : 'player');
    const body = await req.json();
    const { action, text, imageUrl, userId: targetUserId, label, note, labels, noteId } = body;

    const db = await getDb();
    const isStaff = user && isStaffRole(user.role);

    if (action === 'update_labels' || action === 'add_label' || action === 'remove_label') {
      if (!isStaff) {
        return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
      }

      const uid = String(targetUserId);
      let updatedLabels = labels;

      if (!updatedLabels) {
        const currentThread = await db.collection('chat_threads').findOne({ userId: uid });
        let list = currentThread?.labels || [];
        if (action === 'add_label' && label) {
          if (!list.includes(label)) list.push(label);
        } else if (action === 'remove_label' && label) {
          list = list.filter((l) => l !== label);
        }
        updatedLabels = list;
      }

      await db.collection('chat_threads').updateOne(
        { userId: uid },
        { $set: { labels: updatedLabels, updatedAt: new Date() } },
        { upsert: true }
      );

      return NextResponse.json({ success: true, labels: updatedLabels });
    }

    if (action === 'add_note') {
      if (!isStaff) {
        return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
      }

      const uid = String(targetUserId);
      const newNote = {
        id: Date.now().toString(),
        text: String(note || '').trim(),
        author: user.username || 'Staff',
        createdAt: new Date(),
      };

      await db.collection('chat_threads').updateOne(
        { userId: uid },
        { $push: { staffNotes: newNote }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );

      const thread = await db.collection('chat_threads').findOne({ userId: uid });
      return NextResponse.json({ success: true, staffNotes: thread?.staffNotes || [newNote] });
    }

    if (action === 'delete_note') {
      if (!isStaff) {
        return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
      }

      const uid = String(targetUserId);
      const thread = await db.collection('chat_threads').findOne({ userId: uid });
      const filtered = (thread?.staffNotes || []).filter((n) => n.id !== noteId);

      await db.collection('chat_threads').updateOne(
        { userId: uid },
        { $set: { staffNotes: filtered, updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, staffNotes: filtered });
    }

    const cleanText = typeof text === 'string' ? text.trim().slice(0, 5000) : '';
    let cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    if (cleanImageUrl) {
      cleanImageUrl = await compressDataUrlIfNeeded(cleanImageUrl, { maxChars: 120_000, maxSize: 1200, quality: 72 });
    }

    if (!cleanText && !cleanImageUrl) {
      return NextResponse.json({ success: false, error: 'Message text or image attachment required.' }, { status: 400 });
    }

    const isStaffReply = isStaff && isAdminContext && targetUserId;

    if (isStaff && isAdminContext && !targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Select a player thread before replying from the Admin Support desk.' },
        { status: 400 }
      );
    }

    if (isStaff && !isAdminContext) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Staff & admin accounts cannot send messages from the player chat page. Open Admin Portal → Support, select a player thread, and reply there.',
          useAdminDesk: true,
        },
        { status: 403 }
      );
    }

    if (!user && !isStaffReply) {
      return NextResponse.json({ success: false, error: 'Please sign in to use live chat.' }, { status: 401 });
    }

    let messageUid = '';
    let username = isStaffReply ? 'Hood Support Desk' : user?.username || 'Player';
    let playerEmail = user?.email || '';
    if (isStaffReply) {
      const target = await resolveStaffChatTargetUser(db, targetUserId);
      if (!target?.userId) {
        return NextResponse.json({ success: false, error: 'Player thread not found.' }, { status: 404 });
      }
      messageUid = target.userId;
      username = 'Hood Support Desk';
      playerEmail = target.email || playerEmail;
    } else {
      const resolved = await requirePlayerDbUser(req);
      if (!resolved.dbUser) {
        return NextResponse.json({ success: false, error: resolved.error || 'Please sign in.' }, { status: 401 });
      }
      messageUid = canonicalPlayerUserId(resolved.dbUser);
      username = resolved.dbUser.username || username;
      playerEmail = (resolved.dbUser.email || playerEmail || '').toLowerCase().trim();
    }

    const senderRole = isStaffReply ? 'staff' : 'player';

    const msgDoc = {
      userId: messageUid,
      username,
      userEmail: playerEmail,
      text: cleanText,
      imageUrl: cleanImageUrl,
      senderRole,
      read: false,
      createdAt: new Date(),
    };

    const res = await db.collection('chat_messages').insertOne(msgDoc);
    await touchChatThreadOnMessage(db, {
      userId: messageUid,
      username: isStaffReply ? username : username,
      userEmail: playerEmail,
      text: cleanText,
      imageUrl: cleanImageUrl,
      senderRole,
    });

    if (isStaffReply) {
      notifyPlayer({
        userId: messageUid,
        title: 'New Reply from Hood Games Concierge',
        message: previewText(cleanText, cleanImageUrl).slice(0, 120),
        type: 'chat_message',
        data: { url: '/chat' },
      });
      try {
        const ch = new BroadcastChannel('hood_player_chat_sync');
        ch.postMessage({ type: 'STAFF_CHAT_REPLY', userId: messageUid });
        ch.close();
      } catch {
        /* ignore */
      }
    } else {
      notifyStaff({
        title: `Live Chat from ${username}`,
        message: previewText(cleanText, cleanImageUrl).slice(0, 120),
        type: 'chat_message',
        data: { userId: messageUid },
      });
    }

    const insertedId = res.insertedId ? String(res.insertedId) : '';
    publishChatRealtime({
      conversationId: messageUid,
      senderRole,
      message: {
        ...msgDoc,
        id: insertedId,
        _id: insertedId,
        text: cleanText,
        imageUrl: cleanImageUrl,
      },
      userEmail: playerEmail,
      userId: messageUid,
    });

    const saved = serializeChatMessageForApi({
      ...msgDoc,
      _id: res.insertedId,
      id: insertedId,
    });
    return NextResponse.json({
      success: true,
      message: saved,
    });
  } catch (err) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
