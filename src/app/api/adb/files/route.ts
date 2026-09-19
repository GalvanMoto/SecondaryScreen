import { NextRequest, NextResponse } from 'next/server';
import { listDirectory } from '@/lib/adb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '/sdcard';
  const serial = searchParams.get('serial') || undefined;

  try {
    const items = await listDirectory(path, serial);
    return NextResponse.json({ path, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list directory' }, { status: 500 });
  }
}
