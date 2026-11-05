import { NextResponse } from 'next/server';
import { getDb, toObjectId, toIdQuery } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    const db = await getDb();

    // If Admin/Staff is fetching all threads
    if (user && (user.role === 'admin' || user.role === 'staff' || user.role === 'superadmin')) {
      if (targetUserId) {
        // Fetch specific conversation
        const messages = await db
          .collection('chat_messages')
          .find({ userId: targetUserId })
          .sort({ createdAt: 1 })
          .toArray();

        // Also fetch user thread meta (Labels & Notes)
        const threadMeta = await db.collection('chat_threads').findOne({ userId: targetUserId });
        const player = await db.collection('users').findOne(toIdQuery(targetUserId));

        return NextResponse.json({
          success: true,
          messages,
          threadMeta: threadMeta || { userId: targetUserId, labels: [], staffNotes: [] },
          player: player ? {
            id: player._id.toString(),
            username: player.username,
            email: player.email,
            balanceSC: player.balanceSC,
            balanceGC: player.balanceGC,
          } : null,
        });
      }

      // Fetch all conversations list for staff desk
      const messages = await db
        .collection('chat_messages')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      // Group by userId
      const threadsMap = {};
      for (const m of messages) {
        if (!threadsMap[m.userId]) {
          threadsMap[m.userId] = {
            userId: m.userId,
            username: m.username || 'Player',
            userEmail: m.userEmail || '',
            lastMessage: m.text,
            lastMessageAt: m.createdAt,
            unreadCount: m.senderRole === 'player' && !m.read ? 1 : 0,
          };
        } else if (m.senderRole === 'player' && !m.read) {
          threadsMap[m.userId].unreadCount++;
        }
      }

      // Attach Labels and Notes from chat_threads collection
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

    // Regular Player fetching their own chat
    if (!user) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const messages = await db
      .collection('chat_messages')
      .find({ userId: user.id || user._id.toString() })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ success: true, messages });
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req);
    const body = await req.json();
    const { action, text, userId: targetUserId, label, note, labels, noteId } = body;

    const db = await getDb();
    const isStaff = user && (user.role === 'admin' || user.role === 'staff' || user.role === 'superadmin');

    // 1. Action: Manage Labels (Add/Remove)
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
        {
          $set: {
            labels: updatedLabels,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({ success: true, labels: updatedLabels });
    }

    // 2. Action: Manage Notes (Add/Delete Staff Note)
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
        {
          $push: { staffNotes: newNote },
          $set: { updatedAt: new Date() },
        },
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

    // 3. Regular Send Message Action
    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const messageUid = isStaff ? String(targetUserId) : (user?.id || user?._id?.toString() || 'guest_' + Date.now());
    const username = user?.username || (isStaff ? 'Hood Support Desk' : 'Guest Player');
    const senderRole = isStaff ? 'staff' : (user?.role || 'player');

    const msgDoc = {
      userId: messageUid,
      username,
      userEmail: user?.email || '',
      text: text.trim(),
      senderRole,
      read: false,
      createdAt: new Date(),
    };

    const res = await db.collection('chat_messages').insertOne(msgDoc);

    // If staff replied, notify the player
    if (isStaff) {
      notifyPlayer({
        userId: messageUid,
        title: 'New Reply from Hood Games Concierge',
        message: text.length > 80 ? text.substring(0, 80) + '...' : text,
        type: 'chat_message',
      });
    } else {
      // Player sent message -> notify staff desk
      notifyStaff({
        title: `Live Chat Message from ${username}`,
        message: text.substring(0, 80),
        type: 'chat_message',
        data: { userId: messageUid },
      });
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
