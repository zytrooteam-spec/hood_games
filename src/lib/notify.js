import { getDb } from './mongodb';
import { sendPushNotification } from './fcm';

export function notifyPlayer({ userId, userEmail, username, title, message, type = 'general', data = {} }) {
  (async () => {
    try {
      const db = await getDb();
      if (!db || !db.collection) return;

      let cleanEmail = (userEmail || '').toLowerCase().trim();
      let cleanUid = userId ? userId.toString().trim() : null;
      let cleanUsername = (username || '').trim();

      await db.collection('notifications').insertOne({
        userId: cleanUid,
        userEmail: cleanEmail,
        target: 'player',
        username: cleanUsername || cleanEmail.split('@')[0] || 'Player',
        title,
        message,
        type,
        url: data?.url || (type === 'chat_message' ? '/chat' : '/'),
        read: false,
        createdAt: new Date(),
      }).catch(() => {});

      const tokenQueries = [];
      if (cleanEmail) tokenQueries.push({ email: cleanEmail });
      if (cleanUid) tokenQueries.push({ userId: cleanUid });
      if (cleanUsername) tokenQueries.push({ username: cleanUsername });

      if (tokenQueries.length > 0) {
        const subs = await db.collection('subscriptions').find({ $or: tokenQueries }).toArray().catch(() => []);
        const tokens = [...new Set(subs.map((s) => s.fcmToken || s.token).filter((t) => typeof t === 'string' && t.trim().length > 15))];
        for (const tok of tokens) {
          await sendPushNotification({
            token: tok,
            title,
            body: message,
            data: {
              ...data,
              type,
              target: 'player',
              userId: cleanUid || '',
              url: data?.url || (type === 'chat_message' ? '/chat' : '/'),
            },
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('notifyPlayer error:', err.message);
    }
  })();
}

export function notifyStaff({ title, message, type = 'staff_alert', data = {} }) {
  (async () => {
    try {
      const db = await getDb();
      if (!db || !db.collection) return;

      await db.collection('notifications').insertOne({
        target: 'staff',
        channel: 'all',
        title,
        message,
        type,
        conversationId: data.conversationId || null,
        url: data.url || '/admin',
        read: false,
        createdAt: new Date(),
      }).catch(() => {});

      await sendPushNotification({
        topic: 'hood_staff_alerts',
        title,
        body: message,
        data: { ...data, type, target: 'staff' },
      }).catch(() => {});
    } catch (err) {
      console.warn('notifyStaff error:', err.message);
    }
  })();
}
