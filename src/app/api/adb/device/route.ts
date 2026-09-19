import { NextRequest, NextResponse } from 'next/server';
import { getDeviceTelemetry } from '@/lib/adb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;

  try {
    const telemetry = await getDeviceTelemetry(serial);
    if (!telemetry) {
      return NextResponse.json({ error: 'No authorized ADB device found' }, { status: 404 });
    }
    return NextResponse.json({ telemetry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch telemetry' }, { status: 500 });
  }
}
