import { NextRequest, NextResponse } from 'next/server';
import { captureScreenshotBuffer } from '@/lib/adb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;

  try {
    const pngBuffer = await captureScreenshotBuffer(serial);
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Screenshot failed' }, { status: 500 });
  }
}
