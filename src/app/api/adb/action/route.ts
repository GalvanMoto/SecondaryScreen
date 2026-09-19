import { NextRequest, NextResponse } from 'next/server';
import { performAdbAction } from '@/lib/adb';
import { logAction } from '@/lib/db';

export async function POST(request: NextRequest) {
  const t0 = performance.now();
  try {
    const body = await request.json();
    const { action, serial, payload } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    const targetSerial = serial || 'ZD222GMCMS';
    const result = await performAdbAction(action, targetSerial, payload);
    const adb_latency_ms = Math.round((performance.now() - t0) * 10) / 10;

    const { db_latency_ms } = logAction({
      serial: targetSerial,
      action,
      payload,
      adb_latency_ms,
      status: 'success',
      message: result.message,
    });

    return NextResponse.json({
      ...result,
      adb_latency_ms,
      db_latency_ms,
    });
  } catch (error: any) {
    const adb_latency_ms = Math.round((performance.now() - t0) * 10) / 10;
    logAction({
      serial: 'unknown',
      action: 'unknown',
      adb_latency_ms,
      status: 'error',
      message: error.message,
    });
    return NextResponse.json({ error: error.message || 'Action execution failed', adb_latency_ms }, { status: 500 });
  }
}
