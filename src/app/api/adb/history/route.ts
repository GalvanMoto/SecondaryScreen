import { NextRequest, NextResponse } from 'next/server';
import { getRecentActions, getTelemetryHistory, getRecentShellHistory, clearLogs } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;

  try {
    const actions = getRecentActions(serial, 30);
    const telemetry = getTelemetryHistory(serial, 30);
    const shellHistory = getRecentShellHistory(serial, 15);

    return NextResponse.json({
      actions,
      telemetry,
      shellHistory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'clear') {
      clearLogs();
      return NextResponse.json({ success: true, message: 'Database logs cleared' });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 500 });
  }
}
