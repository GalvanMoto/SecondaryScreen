import { NextRequest } from 'next/server';
import { getDeviceTelemetry } from '@/lib/adb';
import { logTelemetry, upsertDevice } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        try {
          controller.close();
        } catch {}
      });

      const pushUpdate = async () => {
        if (isClosed) return;
        const t0 = performance.now();
        try {
          const telemetry = await getDeviceTelemetry(serial);
          const adb_latency_ms = Math.round((performance.now() - t0) * 10) / 10;

          if (telemetry) {
            // Persist to SQLite DB
            const { db_latency_ms } = logTelemetry({
              serial: telemetry.serial,
              battery_level: telemetry.battery.level,
              battery_temp: telemetry.battery.temperatureC,
              battery_voltage: telemetry.battery.voltageMv,
              is_charging: telemetry.battery.isCharging,
              ram_used_mb: telemetry.memory.usedMb,
              ram_total_mb: telemetry.memory.totalMb,
              ram_percent: telemetry.memory.percentage,
              storage_used_gb: telemetry.storage.used,
              storage_total_gb: telemetry.storage.total,
              storage_percent: telemetry.storage.percentage,
              adb_latency_ms,
            });

            // Upsert device metadata
            upsertDevice({
              serial: telemetry.serial,
              model: telemetry.model,
              manufacturer: telemetry.manufacturer,
              android_version: telemetry.androidVersion,
              sdk_version: telemetry.sdkVersion,
              screen_resolution: telemetry.screenResolution,
              ip_address: telemetry.ipAddress,
            });

            const payload = JSON.stringify({
              telemetry,
              latency: {
                adb_ms: adb_latency_ms,
                db_ms: db_latency_ms,
                timestamp: Date.now(),
              },
            });

            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch (err: any) {
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
          }
        }
      };

      // Push initial frame immediately
      await pushUpdate();

      // Recurring real-time interval
      const intervalId = setInterval(async () => {
        if (isClosed) {
          clearInterval(intervalId);
          return;
        }
        await pushUpdate();
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
