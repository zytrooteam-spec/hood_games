import 'server-only';
import fs from 'fs';
import path from 'path';

let cached;

function readJwtFromEnvFiles() {
  const names = ['.env.local', '.env'];
  for (const name of names) {
    try {
      const file = path.join(process.cwd(), name);
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const line = text.split('\n').find((l) => l.startsWith('JWT_SECRET='));
      if (!line) continue;
      const val = line.slice('JWT_SECRET='.length).trim().replace(/^["']|["']$/g, '');
      if (val) return val;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getJwtSecret() {
  if (cached) return cached;
  const fromProcess = process.env['JWT_SECRET'];
  if (fromProcess && String(fromProcess).trim()) {
    cached = String(fromProcess).trim();
    return cached;
  }
  const fromFile = readJwtFromEnvFiles();
  if (fromFile) {
    cached = fromFile;
    return cached;
  }
  cached = 'hood_games_ultra_secret_vip_key_2026';
  return cached;
}
