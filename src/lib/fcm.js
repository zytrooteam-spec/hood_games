import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getDb } from './mongodb';

let messagingInstance = null;
let lastInitError = null;
let loadedAccountSource = null;

function findServiceAccount() {
  const root = process.cwd();
  try {
    const directFile = path.join(root, 'firebase-service-account.json');
    if (fs.existsSync(directFile)) {
      loadedAccountSource = 'firebase-service-account.json';
      return JSON.parse(fs.readFileSync(directFile, 'utf8'));
    }
    const files = fs.readdirSync(/*turbopackIgnore: true*/ root);
    const candidate = files.find((f) => f.endsWith('.json') && (f.includes('firebase-admin') || f.includes('service-account') || f.includes('hoodgames')));
    if (candidate) {
      const full = path.join(/*turbopackIgnore: true*/ root, candidate);
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (parsed && parsed.project_id && (parsed.private_key || parsed.client_email)) {
        loadedAccountSource = candidate;
        return parsed;
      }
    }
  } catch (err) {
    lastInitError = `File read error: ${err.message}`;
  }
  return null;
}

export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    let serviceAccount = null;
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envKey) {
      try {
        serviceAccount = JSON.parse(envKey);
        loadedAccountSource = 'ENV:FIREBASE_SERVICE_ACCOUNT_KEY';
      } catch (e) {
        lastInitError = `Invalid FIREBASE_SERVICE_ACCOUNT_KEY env JSON: ${e.message}`;
      }
    }
    if (!serviceAccount) serviceAccount = findServiceAccount();

    if (!serviceAccount) {
      lastInitError = lastInitError || 'No valid firebase service account JSON found.';
      return null;
    }

    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({ credential: cert(serviceAccount) });
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    lastInitError = `Firebase init error: ${err.message}`;
    return null;
  }
}

function buildFcmPayload({ title, body, data = {} }) {
  const notifTitle = title || '🎰 Hood Games: Special Bonus Drop!';
  const notifBody = body || 'Tap to play now and claim your rewards!';
  const targetUrl = data.url || '/';

  return {
    notification: {
      title: notifTitle,
      body: notifBody,
    },
    data: {
      ...data,
      title: notifTitle,
      body: notifBody,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      url: targetUrl,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
        defaultSound: true,
        priority: 'max',
        visibility: 'public',
        icon: 'ic_launcher',
        color: '#2cb64e',
        tag: 'hood-games-alert',
      },
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title: notifTitle,
        body: notifBody,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [300, 100, 300],
      },
    },
  };
}

export async function sendPushNotification({ token, tokens, topic, broadcast = false, title, body, data = {} }) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.log(`[FCM SIMULATED] Title: "${title}" | Body: "${body}"`);
    return { success: false, simulated: true, error: lastInitError };
  }

  const payload = buildFcmPayload({ title, body, data });

  if (token && typeof token === 'string' && token.trim().length > 15) {
    try {
      const res = await messaging.send({ ...payload, token: token.trim() });
      return { success: true, messageId: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (Array.isArray(tokens) && tokens.length > 0) {
    const validTokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 15))];
    if (validTokens.length > 0) {
      try {
        const multiRes = await messaging.sendEachForMulticast({ tokens: validTokens, ...payload });
        return { success: multiRes.successCount > 0, deliveredCount: multiRes.successCount };
      } catch (mErr) {
        return { success: false, error: mErr.message };
      }
    }
  }

  if (topic && !broadcast) {
    try {
      const topicRes = await messaging.send({ ...payload, topic });
      return { success: true, messageId: topicRes };
    } catch (tErr) {
      return { success: false, error: tErr.message };
    }
  }

  if (broadcast) {
    const topicsToSend = [topic || 'hood_all_players', 'hood_all_players'];
    const uniqueTopics = [...new Set(topicsToSend)];
    let anySuccess = false;
    for (const t of uniqueTopics) {
      try {
        await messaging.send({ ...payload, topic: t });
        anySuccess = true;
      } catch {}
    }
    return { success: anySuccess };
  }

  return { success: false, error: 'Recipient token, topic, or broadcast flag required.' };
}
