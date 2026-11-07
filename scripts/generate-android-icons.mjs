/**
 * Regenerates Android launcher icons from public/logo.png (safe padding, no crop).
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public', 'logo.png');
const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');

const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

const BG = { r: 9, g: 20, b: 42, alpha: 1 };

async function makeSquare(size, logoScale, outPath, round = false) {
  const pad = Math.round(size * (1 - logoScale) / 2);
  const inner = size - pad * 2;
  const logo = await sharp(logoPath).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
  let img = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png();

  if (round) {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
    );
    img = sharp(await img.toBuffer())
      .composite([{ input: mask, blend: 'dest-in' }])
      .png();
  }

  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await img.toFile(outPath);
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('Missing public/logo.png');
    process.exit(1);
  }

  for (const [density, size] of Object.entries(LEGACY)) {
    const dir = path.join(resRoot, `mipmap-${density}`);
    await makeSquare(size, 0.82, path.join(dir, 'ic_launcher.png'));
    await makeSquare(size, 0.82, path.join(dir, 'ic_launcher_round.png'), true);
  }

  for (const [density, size] of Object.entries(FOREGROUND)) {
    const dir = path.join(resRoot, `mipmap-${density}`);
    await makeSquare(size, 0.62, path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('Android icons updated from Hood Games logo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
