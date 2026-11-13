import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { getSessionUser, isStaffRole } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';
import { sanitizeGameTitle } from '@/lib/fastDiff';
import { compressDataUrlIfNeeded } from '@/lib/serverImageCompress';
import { cache } from '@/lib/cache';

async function resolveStoredImage(raw) {
  if (!raw || typeof raw !== 'string') return raw || '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image')) {
    return compressDataUrlIfNeeded(trimmed, { maxChars: 100_000, maxSize: 640, quality: 78 });
  }
  return trimmed;
}

function mapGameForClient(g) {
  const image = g.image || g.thumbnail || g.imageUrl || '';
  return {
    ...g,
    _id: g._id?.toString?.() || g._id,
    title: sanitizeGameTitle(g.title),
    image,
    thumbnail: image,
    imageUrl: image,
    active: g.active !== false && g.isActive !== false,
    isActive: g.isActive !== false && g.active !== false,
  };
}

/** Admin grid: drop multi‑100KB base64 from list payloads (covers load fast; optional full fetch for thumbs). */
function slimGameForAdminList(g) {
  const img = String(g.image || g.thumbnail || '');
  if (img.startsWith('data:image') && img.length > 3500) {
    return { ...g, image: '', thumbnail: '', imageUrl: '', _imageOmitted: true };
  }
  if (img.startsWith('http') || (img.startsWith('/') && img.length < 512)) {
    return g;
  }
  if (img.length > 8000) {
    return { ...g, image: '', thumbnail: '', imageUrl: '', _imageOmitted: true };
  }
  return g;
}

function bustGamesCache() {
  cache.del('hood_games');
  cache.del('hood_games_public');
  cache.del('hood_games_public_slim');
  cache.del('hood_games_public_full');
  cache.del('hood_games_admin_all_slim');
  cache.del('hood_games_admin_all_full');
}

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const includeImages =
      searchParams.get('includeImages') === '1' || searchParams.get('includeImages') === 'true';
    const user = await getSessionUser(req, 'admin');
    const isAdmin = user && isStaffRole(user.role);

    const db = await getDb();
    const query = isAdmin && all ? {} : { isActive: { $ne: false }, active: { $ne: false } };
    const adminSlim = isAdmin && all && !includeImages;
    const playerSlim = !isAdmin && !includeImages;
    const cacheKey = adminSlim
      ? 'hood_games_admin_all_slim'
      : isAdmin && all
        ? 'hood_games_admin_all_full'
        : playerSlim
          ? 'hood_games_public_slim'
          : 'hood_games_public_full';

    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, games: cached, slim: adminSlim || playerSlim },
        {
          headers: {
            'Cache-Control': adminSlim || playerSlim ? 'private, max-age=45' : 'private, max-age=30',
          },
        }
      );
    }

    const games = await db.collection('games').find(query).sort({ priority: 1, title: 1 }).toArray();
    let sanitized = games.map(mapGameForClient);
    if (adminSlim || playerSlim) sanitized = sanitized.map(slimGameForAdminList);
    const ttl = adminSlim ? 120 : isAdmin && all ? 90 : playerSlim ? 60 : 45;
    cache.set(cacheKey, sanitized, ttl);

    return NextResponse.json(
      { success: true, games: sanitized, slim: adminSlim || playerSlim },
      {
        headers: {
          'Cache-Control': adminSlim || playerSlim ? 'private, max-age=45' : isAdmin && all ? 'private, max-age=45' : 'private, max-age=30',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();

    if (body.title) {
      body.title = sanitizeGameTitle(body.title);
    }

    const rawImage = body.image || body.thumbnail || body.imageUrl || '';
    const resolvedImage = await resolveStoredImage(rawImage);
    if (resolvedImage) {
      body.image = resolvedImage;
      body.thumbnail = resolvedImage;
      body.imageUrl = resolvedImage;
    }

    if (body.active !== undefined) body.isActive = Boolean(body.active);
    if (body.isActive !== undefined) body.active = Boolean(body.isActive);

    if (body._id) {
      const { _id, ...updateFields } = body;
      delete updateFields.id;
      await db.collection('games').updateOne(toIdQuery(_id), { $set: { ...updateFields, updatedAt: new Date() } });
    } else {
      await db.collection('games').insertOne({
        ...body,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        active: body.active !== undefined ? Boolean(body.active) : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    bustGamesCache();
    const updated = await db.collection('games').find({}).sort({ priority: 1 }).toArray();
    return NextResponse.json({
      success: true,
      games: updated.map(mapGameForClient),
    });
  } catch (err) {
    console.error('Games POST error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to save game' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureDbInitialized();
    const user = await getSessionUser(req, 'admin');
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const db = await getDb();
    await db.collection('games').deleteOne(toIdQuery(id));
    bustGamesCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
