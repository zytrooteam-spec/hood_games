#!/usr/bin/env node
/**
 * VPS / local: test MongoDB URI from .env.local (no password printed).
 *   npm run db:ping
 */
import { existsSync, readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  for (const file of ['.env.local', '.env.production.local', '.env']) {
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

function uriHint(uri) {
  try {
    const afterAt = uri.split('@')[1];
    const host = afterAt?.split('/')[0] || '?';
    const db = afterAt?.split('/')[1]?.split('?')[0] || '?';
    const user = uri.replace(/^mongodb\+srv:\/\//, '').split(':')[0] || '?';
    return { user, host, db };
  } catch {
    return { user: '?', host: '?', db: '?' };
  }
}

const uri = loadMongoUri();
if (!uri) {
  console.error('FAIL: MONGODB_URI not set (check .env.local in project root).');
  process.exit(1);
}

const hint = uriHint(uri);
console.log(`Testing MongoDB user="${hint.user}" host=${hint.host} db=${hint.db}`);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
try {
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || hint.db || 'hood_games';
  await client.db(dbName).command({ ping: 1 });
  console.log('OK: MongoDB auth and ping succeeded.');
  process.exit(0);
} catch (err) {
  const msg = err?.message || String(err);
  console.error('FAIL:', msg);
  if (/bad auth/i.test(msg)) {
    console.error('Hint: Atlas username/password wrong. Database Access → edit user → reset password → paste new URI.');
  }
  if (/whitelist|IP/i.test(msg)) {
    console.error('Hint: Atlas Network Access → add this server public IP (or 0.0.0.0/0 temporarily).');
  }
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
