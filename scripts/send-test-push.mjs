#!/usr/bin/env node
/**
 * Insert a player broadcast + send FCM (APK/devices with tokens).
 *   npm run push:test
 */
import { existsSync, readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.startsWith('MONGODB_URI=')) continue;
      let val = line.slice('MONGODB_URI='.length).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return null;
}

const title = process.argv[2] || '🔔 Hood Games — Test Push';
const message =
  process.argv[3] ||
  'Chrome + in-app alert test. If you see this, notifications are working.';

const uri = loadMongoUri();
if (!uri) {
  console.error('FAIL: MONGODB_URI missing (.env.local)');
  process.exit(1);
}

let messaging = null;
try {
  const sa = JSON.parse(readFileSync('firebase-service-account.json', 'utf8'));
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  if (getApps().length === 0) initializeApp({ credential: cert(sa) });
  messaging = getMessaging();
} catch (e) {
  console.warn('FCM skip (no firebase-service-account.json):', e.message);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const notifsCol = db.collection('notifications');
const subsCol = db.collection('subscriptions');

const doc = {
  title,
  message,
  target: 'all',
  channel: 'push',
  type: 'broadcast',
  sentBy: 'push:test-script',
  url: '/',
  createdAt: new Date(),
};
const ins = await notifsCol.insertOne(doc);
console.log('OK: in-app broadcast inserted id=', ins.insertedId.toString());

const tokens = await subsCol
  .find({ $or: [{ fcmToken: { $exists: true, $ne: '' } }, { token: { $exists: true, $ne: '' } }] })
  .project({ fcmToken: 1, token: 1 })
  .toArray();
const uniq = [...new Set(tokens.map((t) => (t.fcmToken || t.token || '').trim()).filter((t) => t.length > 15))];

if (messaging && uniq.length > 0) {
  const payload = {
    notification: { title, body: message },
    data: { url: '/', title, body: message },
    webpush: { headers: { Urgency: 'high' }, notification: { title, body, icon: '/logo.png' } },
    android: { priority: 'high', notification: { channelId: 'default', color: '#2cb64e' } },
  };
  const res = await messaging.sendEachForMulticast({ tokens: uniq, ...payload });
  console.log(`OK: FCM multicast success=${res.successCount} fail=${res.failureCount} (devices=${uniq.length})`);
} else if (messaging) {
  for (const topic of ['hood_all_players', 'hood_hood_all_players']) {
    try {
      await messaging.send({
        topic,
        notification: { title, body: message },
        data: { url: '/', title, body: message },
      });
      console.log('OK: FCM topic sent:', topic);
    } catch (err) {
      console.warn('FCM topic', topic, err.message);
    }
  }
} else {
  console.log('Tip: open https://hoodgaming.com (or localhost:3007), allow notifications — poll shows in-app + Chrome within ~6s.');
}

await client.close();
