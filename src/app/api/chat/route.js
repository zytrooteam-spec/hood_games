import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';

function previewText(text, imageUrl) {
  const t = (text || '').trim();
  if (t) return t;
  if (imageUrl) return '📷 Image attachment';
  return '';
}

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const referer = req.headers.get('referer') || '';
    const isAdminContext = referer.includes('/admin');
    const user = await getSessionUser(req, isAdminContext ? 'admin' : 'player');
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    const db = await getDb();
    const isStaff = user && isStaffRole(user.role);

    if (isStaff) {
      if (targetUserId) {
        await db.collection('chat_messages').updateMany(
          { userId: targetUserId, senderRole: 'player', read: { $ne: true } },
          { $set: { read: true } }
        );

        const messages = await db
          .collection('chat_messages')
          .find({ userId: targetUserId })
          .sort({ createdAt: 1 })
          .toArray();

        const threadMeta = await db.collection('chat_threads').findOne({ userId: targetUserId });
        const player = await db.collection('users').findOne(toIdQuery(targetUserId));

        return NextResponse.json({
          success: true,
          messages,
          threadMeta: threadMeta || { userId: targetUserId, labels: [], staffNotes: [] },
          player: player
            ? {
                id: player._id.toString(),
                username: player.username,
                email: player.email,
                balanceSC: player.balanceSC,
                balanceGC: player.balanceGC,
              }
            : null,
        });
      }

      const messages = await db.collection('chat_messages').find({}).sort({ createdAt: -1 }).toArray();

      const threadsMap = {};
      for (const m of messages) {
        const preview = previewText(m.text, m.imageUrl);
        if (!threadsMap[m.userId]) {
          threadsMap[m.userId] = {
            userId: m.userId,
            username: m.username || 'Player',
            userEmail: m.userEmail || '',
            lastMessage: preview,
            lastMessageAt: m.createdAt,
            unreadCount: m.senderRole === 'player' && !m.read ? 1 : 0,
          };
        } else if (m.senderRole === 'player' && !m.read) {
          threadsMap[m.userId].unreadCount++;
        }
      }

      const threadMetas = await db.collection('chat_threads').find({}).toArray();
      const metaMap = {};
      threadMetas.forEach((tm) => {
        metaMap[tm.userId] = tm;
      });

      const threads = Object.values(threadsMap).map((t) => {
        const meta = metaMap[t.userId];
        return {
          ...t,
          labels: meta?.labels || [],
          staffNotes: meta?.staffNotes || [],
        };
      });

      return NextResponse.json({ success: true, threads });
    }

    if (!user) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const uid = user.id?.toString?.() || user._id?.toString?.() || String(user.id || user._id);

    await db.collection('chat_messages').updateMany(
      { userId: uid, senderRole: 'staff', read: { $ne: true } },
      { $set: { read: true } }
    );

    const messages = await db.collection('chat_messages').find({ userId: uid }).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({ success: true, messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
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

    if (!user) {
      return NextResponse.json({ success: false, error: 'Please sign in to use live chat.' }, { status: 401 });
    }

    const messageUid = isStaffReply ? String(targetUserId) : user.id?.toString?.() || user._id?.toString?.();
    const username = isStaffReply ? 'Hood Support Desk' : user?.username || 'Player';
    const senderRole = isStaffReply ? 'staff' : 'player';

    const msgDoc = {
      userId: messageUid,
      username,
      userEmail: user?.email || '',
      text: cleanText,
      imageUrl: cleanImageUrl,
      senderRole,
      read: false,
      createdAt: new Date(),
    };

    const res = await db.collection('chat_messages').insertOne(msgDoc);

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
      try {
        const ch = new BroadcastChannel('hood_staff_alerts');
        ch.postMessage({
          type: 'NEW_CHAT_MESSAGE',
          username,
          text: previewText(cleanText, cleanImageUrl),
          userId: messageUid,
          time: Date.now(),
        });
        ch.close();
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      success: true,
      message: { ...msgDoc, _id: res.insertedId },
    });
  } catch (err) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
