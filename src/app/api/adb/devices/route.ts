import { NextResponse } from 'next/server';
import { getConnectedDevices } from '@/lib/adb';

export async function GET() {
  try {
    const devices = await getConnectedDevices();
    return NextResponse.json({ devices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list devices' }, { status: 500 });
  }
}
