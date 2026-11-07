import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    apkUrl: '/download/hood-games.apk',
    version: '1.0.0',
    packageName: 'com.hoodgaming.official',
    releaseDate: '2026-11-02',
    size: '8.5 MB',
  });
}
