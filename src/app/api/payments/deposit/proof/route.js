import { NextResponse } from 'next/server';
import { getDb, toIdQuery } from '@/lib/mongodb';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Missing deposit ID', { status: 400 });
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');

    const deposit = await depositsCol.findOne(toIdQuery(id));

    const rawData =
      deposit?.proofImage ||
      deposit?.proofUrl ||
      deposit?.receiptImage ||
      deposit?.screenshot;

    if (!deposit || !rawData) {
      return new NextResponse('Deposit proof not found', { status: 404 });
    }

    // If it's a base64 Data URL (e.g. data:image/png;base64,....)
    if (typeof rawData === 'string' && rawData.startsWith('data:')) {
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

    // If it's a web URL
    return NextResponse.redirect(rawData);
  } catch (err) {
    return new NextResponse('Server Error: ' + err.message, { status: 500 });
  }
}
