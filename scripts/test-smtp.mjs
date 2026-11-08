#!/usr/bin/env node
/** Verify Hostinger SMTP from .env.local — npm run smtp:test */
import { existsSync, readFileSync } from 'fs';
import { verifySmtpConnection } from '../src/lib/email.js';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i);
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k.startsWith('SMTP_')) process.env[k] = v;
  }
}

const r = await verifySmtpConnection();
if (r.success) {
  console.log('OK SMTP:', r.user, '@', r.host + ':' + r.port);
  process.exit(0);
}
console.error('FAIL SMTP:', r.error);
console.error('Hint: Hostinger → Emails → reset mailbox password → update SMTP_PASS on VPS .env.local');
process.exit(1);
