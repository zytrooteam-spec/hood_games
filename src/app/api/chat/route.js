import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbReady } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';
import { requirePlayerDbUser } from '@/lib/requirePlayerDbUser';
import { publishChatRealtime } from '@/lib/realtimePublish';
import { buildStaffChatThreads, touchChatThreadOnMessage, clearStaffThreadUnread } from '@/lib/chatThreads.server';
import { serializeChatMessagesForApi } from '@/lib/chatMessageApi';

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

      const uid = String(targetUserId);
      const msgLimit = Math.min(120, Math.max(20, parseInt(searchParams.get('limit') || '50', 10) || 50));

      const [messages, threadMeta, player] = await Promise.all([
        db
          .collection('chat_messages')
          .find({ userId: uid })
          .sort({ createdAt: -1 })
          .limit(msgLimit)
          .toArray()
          .then((rows) => rows.reverse()),
        db.collection('chat_threads').findOne(
          { userId: uid },
          { projection: { labels: 1, staffNotes: 1, userId: 1 } }
        ),
        db.collection('users').findOne(toIdQuery(uid), {
          projection: { username: 1, email: 1, balanceSC: 1, balanceGC: 1 },
        }),
      ]);

      await Promise.all([
        db
          .collection('chat_messages')
          .updateMany({ userId: uid, senderRole: 'player', read: { $ne: true } }, { $set: { read: true } }),
        clearStaffThreadUnread(db, uid),
      ]);

      return NextResponse.json(
        {
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
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const user = await getSessionUser(req, 'admin');
    const isStaff = user && isStaffRole(user.role);

    if (isStaff) {
      const threadLimit = Math.min(200, Math.max(20, parseInt(searchParams.get('limit') || '80', 10) || 80));
      const threads = await buildStaffChatThreads(db, { limit: threadLimit });
      return NextResponse.json({ success: true, threads });
    }

    const playerUser = await getSessionUser(req, 'player');

    if (!playerUser) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const uid = playerUser.id?.toString?.() || playerUser._id?.toString?.() || String(playerUser.id || playerUser._id);

    await db.collection('chat_messages').updateMany(
      { userId: uid, senderRole: 'staff', read: { $ne: true } },
      { $set: { read: true } }
    );

    const messages = await db.collection('chat_messages').find({ userId: uid }).sort({ createdAt: 1 }).toArray();

    return NextResponse.json(
      { success: true, messages: serializeChatMessagesForApi(messages) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbReady();
    const referer = req.headers.get('referer') || '';
    const isAdminContext = referer.includes('/admin');
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

    let messageUid = isStaffReply ? String(targetUserId) : '';
    let username = isStaffReply ? 'Hood Support Desk' : user?.username || 'Player';
    let playerEmail = user?.email || '';
    if (!isStaffReply) {
      const resolved = await requirePlayerDbUser(req);
      if (!resolved.dbUser) {
        return NextResponse.json({ success: false, error: resolved.error || 'Please sign in.' }, { status: 401 });
      }
      messageUid = resolved.dbUser._id.toString();
      username = resolved.dbUser.username || username;
      playerEmail = resolved.dbUser.email || playerEmail;
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

    return NextResponse.json({
      success: true,
      message: { ...msgDoc, _id: res.insertedId, id: insertedId },
    });
  } catch (err) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
