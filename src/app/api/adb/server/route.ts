import { NextRequest, NextResponse } from 'next/server';
import {
  getPhoneServerState,
  getCloudflareTunnelState,
  execTermuxManage,
} from '@/lib/adb';
import { logAction } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serial = searchParams.get('serial') || undefined;

  try {
    const [server, tunnel] = await Promise.all([
      getPhoneServerState(serial),
      getCloudflareTunnelState(serial),
    ]);

    return NextResponse.json({
      success: true,
      server,
      tunnel,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch server status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const t0 = performance.now();
  try {
    const body = await request.json();
    const { action, serial, payload } = body;

    const targetSerial = serial || undefined;
    let message = '';
    let result: any = {};

    switch (action) {
      case 'server-start': {
        const type = payload?.type || 'node';
        const res = await execTermuxManage('server-start', [type], targetSerial);
        message = `Server started: ${res}`;
        break;
      }

      case 'server-stop': {
        const res = await execTermuxManage('server-stop', [], targetSerial);
        message = `Server stopped: ${res}`;
        break;
      }

      case 'cf-start-quick': {
        const port = String(payload?.port || 8080);
        const res = await execTermuxManage('cf-start-quick', [port], targetSerial);
        message = `Quick Tunnel started: ${res}`;
        break;
      }

      case 'cf-start-named': {
        const token = payload?.token || '';
        if (!token) {
          return NextResponse.json({ error: 'Tunnel token is required for named tunnel' }, { status: 400 });
        }
        const res = await execTermuxManage('cf-start-named', [token], targetSerial);
        message = `Named Tunnel started: ${res}`;
        break;
      }

      case 'cf-stop': {
        const res = await execTermuxManage('cf-stop', [], targetSerial);
        message = `Cloudflare Tunnel stopped: ${res}`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const adb_latency_ms = Math.round((performance.now() - t0) * 10) / 10;
    logAction({
      serial: targetSerial || 'ZD222GMCMS',
      action: `phone_server:${action}`,
      payload,
      adb_latency_ms,
      status: 'success',
      message,
    });

    const [server, tunnel] = await Promise.all([
      getPhoneServerState(targetSerial),
      getCloudflareTunnelState(targetSerial),
    ]);

    return NextResponse.json({
      success: true,
      message,
      server,
      tunnel,
      adb_latency_ms,
    });
  } catch (error: any) {
    const adb_latency_ms = Math.round((performance.now() - t0) * 10) / 10;
    logAction({
      serial: 'ZD222GMCMS',
      action: 'phone_server:error',
      adb_latency_ms,
      status: 'error',
      message: error.message,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Server action failed', adb_latency_ms },
      { status: 500 }
    );
  }
}
