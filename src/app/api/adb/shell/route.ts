import { NextRequest, NextResponse } from 'next/server';
import { runCustomShell } from '@/lib/adb';
import { logShellCommand } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, serial } = body;

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    const targetSerial = serial || 'ZD222GMCMS';
    const result = await runCustomShell(command, targetSerial);

    logShellCommand({
      serial: targetSerial,
      command,
      output: result.output,
      duration_ms: result.durationMs,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Shell execution failed' }, { status: 500 });
  }
}
