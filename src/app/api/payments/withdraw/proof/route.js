import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';
import { ensureDbInitialized } from '@/lib/initDb';

export async function GET(req) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'gameScreenshot';

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const db = await getDb();
    const redemption = await db.collection('redemptions').findOne(toIdQuery(id), {
      projection: { gameScreenshot: 1, qrCodeImage: 1 },
    });

    const rawData = type === 'qrCodeImage' ? redemption?.qrCodeImage : redemption?.gameScreenshot;

    if (!rawData) {
      return new NextResponse('Image not found', { status: 404 });
    }

    if (rawData.startsWith('data:')) {
      const parts = rawData.split(',');
      const mime = parts[0].split(':')[1].split(';')[0];
      const buffer = Buffer.from(parts[1], 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    return NextResponse.redirect(rawData);
  } catch (err) {
    return new NextResponse(`Server Error: ${err.message}`, { status: 500 });
  }
}
