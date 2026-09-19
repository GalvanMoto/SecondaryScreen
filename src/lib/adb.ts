import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface AdbDevice {
  serial: string;
  state: string;
  model: string;
  product: string;
  transportId: string;
}

export interface DeviceTelemetry {
  serial: string;
  model: string;
  manufacturer: string;
  brand: string;
  device: string;
  androidVersion: string;
  sdkVersion: string;
  buildNumber: string;
  cpuAbi: string;
  screenResolution: string;
  ipAddress: string;
  uptime: string;
  battery: {
    level: number;
    scale: number;
    voltageMv: number;
    temperatureC: number;
    status: string;
    health: string;
    isCharging: boolean;
    chargeType: string;
    technology: string;
  };
  storage: {
    total: string;
    used: string;
    available: string;
    percentage: number;
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    percentage: number;
  };
}

/**
 * Execute an adb command safely
 */
export async function execAdb(args: string[], serial?: string): Promise<string> {
  const targetArgs = serial ? ['-s', serial, ...args] : args;
  const cmd = `adb ${targetArgs.join(' ')}`;
  try {
    const { stdout } = await execPromise(cmd, { maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim();
  } catch (error: any) {
    console.error(`ADB Error (${cmd}):`, error.message);
    throw new Error(error.stderr || error.message || 'ADB command failed');
  }
}

/**
 * List all attached ADB devices
 */
export async function getConnectedDevices(): Promise<AdbDevice[]> {
  try {
    const output = await execAdb(['devices', '-l']);
    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    const devices: AdbDevice[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('attached')) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const serial = parts[0];
        const state = parts[1];
        let model = '';
        let product = '';
        let transportId = '';

        for (const part of parts.slice(2)) {
          if (part.startsWith('model:')) model = part.replace('model:', '').replace(/_/g, ' ');
          if (part.startsWith('product:')) product = part.replace('product:', '');
          if (part.startsWith('transport_id:')) transportId = part.replace('transport_id:', '');
        }

        devices.push({
          serial,
          state,
          model: model || 'Android Device',
          product,
          transportId,
        });
      }
    }
    return devices;
  } catch (err) {
    console.error('Failed to get ADB devices:', err);
    return [];
  }
}

interface CachedData {
  staticProps?: Record<string, string>;
  screenResolution?: string;
  lastTelemetry?: DeviceTelemetry;
  lastTelemetryTime?: number;
  lastMemInfo?: { memRaw: string; dfRaw: string; time: number };
}

const deviceCache: Record<string, CachedData> = {};

/**
 * Get comprehensive device telemetry
 */
export async function getDeviceTelemetry(serial?: string): Promise<DeviceTelemetry | null> {
  const devices = await getConnectedDevices();
  if (devices.length === 0) return null;

  const targetSerial = serial || devices[0].serial;
  const activeDevice = devices.find(d => d.serial === targetSerial) || devices[0];

  if (!deviceCache[targetSerial]) {
    deviceCache[targetSerial] = {};
  }
  const cache = deviceCache[targetSerial];

  // Return cached telemetry if queried within last 1.5 seconds
  if (cache.lastTelemetry && cache.lastTelemetryTime && Date.now() - cache.lastTelemetryTime < 1500) {
    return cache.lastTelemetry;
  }

  try {
    // Only fetch static properties and screen resolution once
    if (!cache.staticProps || !cache.screenResolution) {
      const [propsRaw, wmRaw] = await Promise.all([
        execAdb(['shell', 'getprop'], targetSerial).catch(() => ''),
        execAdb(['shell', 'wm', 'size'], targetSerial).catch(() => ''),
      ]);

      const props: Record<string, string> = {};
      for (const line of propsRaw.split('\n')) {
        const match = line.match(/^\[([^\]]+)\]:\s*\[([^\]]*)\]/);
        if (match) props[match[1]] = match[2];
      }
      cache.staticProps = props;

      let screenResolution = '1080x2400';
      const wmMatch = wmRaw.match(/Physical size:\s*([0-9x]+)/);
      if (wmMatch) screenResolution = wmMatch[1];
      cache.screenResolution = screenResolution;
    }

    // Refresh meminfo and storage only every 15 seconds (heavy dumpsys calls)
    if (!cache.lastMemInfo || Date.now() - cache.lastMemInfo.time > 15000) {
      const [memRaw, dfRaw] = await Promise.all([
        execAdb(['shell', 'dumpsys', 'meminfo'], targetSerial).catch(() => ''),
        execAdb(['shell', 'df', '-h', '/data'], targetSerial).catch(() => ''),
      ]);
      cache.lastMemInfo = { memRaw, dfRaw, time: Date.now() };
    }

    // Dynamic queries (fast battery, IP, and uptime)
    const [batteryRaw, ipRaw, uptimeRaw] = await Promise.all([
      execAdb(['shell', 'dumpsys', 'battery'], targetSerial).catch(() => ''),
      execAdb(['shell', 'ip', '-f', 'inet', 'addr', 'show', 'wlan0'], targetSerial).catch(() => ''),
      execAdb(['shell', 'uptime'], targetSerial).catch(() => ''),
    ]);

    const props = cache.staticProps || {};
    const memRaw = cache.lastMemInfo?.memRaw || '';
    const dfRaw = cache.lastMemInfo?.dfRaw || '';
    const screenResolution = cache.screenResolution || '1080x2400';

    const model = props['ro.product.model'] || activeDevice.model || 'Unknown';
    const manufacturer = props['ro.product.manufacturer'] || 'Unknown';
    const brand = props['ro.product.brand'] || 'Unknown';
    const device = props['ro.product.device'] || activeDevice.product || 'Unknown';
    const androidVersion = props['ro.build.version.release'] || 'Unknown';
    const sdkVersion = props['ro.build.version.sdk'] || 'Unknown';
    const buildNumber = props['ro.build.display.id'] || props['ro.build.id'] || 'Unknown';
    const cpuAbi = props['ro.product.cpu.abi'] || 'Unknown';

    // Parse IP
    let ipAddress = 'Disconnected / No Wi-Fi';
    const ipMatch = ipRaw.match(/inet\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
    if (ipMatch) ipAddress = ipMatch[1];

    // Parse Uptime
    let uptime = uptimeRaw.replace(/.*up\s+([^,]+),.*/, '$1').trim();
    if (!uptime || uptime === uptimeRaw) uptime = uptimeRaw;

    // Parse Battery
    let bLevel = 0;
    let bScale = 100;
    let bVoltage = 0;
    let bTemp = 0;
    let bStatusNum = 1;
    let bHealthNum = 1;
    let bAc = false;
    let bUsb = false;
    let bWireless = false;
    let bTech = 'Li-ion';

    for (const line of batteryRaw.split('\n')) {
      const [k, v] = line.trim().split(/:\s*/);
      if (!k || v === undefined) continue;
      if (k === 'level') bLevel = parseInt(v, 10) || 0;
      if (k === 'scale') bScale = parseInt(v, 10) || 100;
      if (k === 'voltage') bVoltage = parseInt(v, 10) || 0;
      if (k === 'temperature') bTemp = (parseInt(v, 10) || 0) / 10;
      if (k === 'status') bStatusNum = parseInt(v, 10) || 1;
      if (k === 'health') bHealthNum = parseInt(v, 10) || 1;
      if (k === 'AC powered') bAc = v.toLowerCase() === 'true';
      if (k === 'USB powered') bUsb = v.toLowerCase() === 'true';
      if (k === 'Wireless powered') bWireless = v.toLowerCase() === 'true';
      if (k === 'technology') bTech = v;
    }

    const batteryStatuses: Record<number, string> = {
      1: 'Unknown',
      2: 'Charging',
      3: 'Discharging',
      4: 'Full',
      5: 'Not Charging',
    };
    const batteryHealths: Record<number, string> = {
      1: 'Unknown',
      2: 'Good',
      3: 'Overheat',
      4: 'Dead',
      5: 'Over Voltage',
      6: 'Unspecified Failure',
      7: 'Cold',
    };

    const isCharging = bAc || bUsb || bWireless || bStatusNum === 2;
    let chargeType = 'Battery';
    if (bAc) chargeType = 'AC Fast Charger';
    else if (bUsb) chargeType = 'USB Cable';
    else if (bWireless) chargeType = 'Wireless Charger';

    // Parse Storage
    let stTotal = 'Unknown';
    let stUsed = 'Unknown';
    let stAvail = 'Unknown';
    let stPercent = 0;

    const dfLines = dfRaw.split('\n');
    if (dfLines.length >= 2) {
      const dfTokens = dfLines[1].trim().split(/\s+/);
      if (dfTokens.length >= 5) {
        stTotal = dfTokens[1];
        stUsed = dfTokens[2];
        stAvail = dfTokens[3];
        stPercent = parseInt(dfTokens[4].replace('%', ''), 10) || 0;
      }
    }

    // Parse Memory (RAM)
    let totalRamMb = 0;
    let freeRamMb = 0;
    let usedRamMb = 0;

    const totalRamMatch = memRaw.match(/Total RAM:\s*([0-9,]+)K/);
    const freeRamMatch = memRaw.match(/Free RAM:\s*([0-9,]+)K/);
    const usedRamMatch = memRaw.match(/Used RAM:\s*([0-9,]+)K/);

    if (totalRamMatch) {
      totalRamMb = Math.round(parseInt(totalRamMatch[1].replace(/,/g, ''), 10) / 1024);
    }
    if (freeRamMatch) {
      freeRamMb = Math.round(parseInt(freeRamMatch[1].replace(/,/g, ''), 10) / 1024);
    }
    if (usedRamMatch) {
      usedRamMb = Math.round(parseInt(usedRamMatch[1].replace(/,/g, ''), 10) / 1024);
    } else if (totalRamMb > 0 && freeRamMb > 0) {
      usedRamMb = totalRamMb - freeRamMb;
    }

    const memPercent = totalRamMb > 0 ? Math.round((usedRamMb / totalRamMb) * 100) : 0;

    const telemetryResult: DeviceTelemetry = {
      serial: targetSerial,
      model,
      manufacturer,
      brand,
      device,
      androidVersion,
      sdkVersion,
      buildNumber,
      cpuAbi,
      screenResolution,
      ipAddress,
      uptime,
      battery: {
        level: bLevel,
        scale: bScale,
        voltageMv: bVoltage,
        temperatureC: bTemp,
        status: batteryStatuses[bStatusNum] || 'Unknown',
        health: batteryHealths[bHealthNum] || 'Normal',
        isCharging,
        chargeType,
        technology: bTech,
      },
      storage: {
        total: stTotal,
        used: stUsed,
        available: stAvail,
        percentage: stPercent,
      },
      memory: {
        totalMb: totalRamMb,
        usedMb: usedRamMb,
        freeMb: freeRamMb,
        percentage: memPercent,
      },
    };

    cache.lastTelemetry = telemetryResult;
    cache.lastTelemetryTime = Date.now();
    return telemetryResult;
  } catch (err: any) {
    console.error('Failed to get telemetry:', err);
    return null;
  }
}

/**
 * Trigger Operational Hardware Actions
 */
export async function performAdbAction(
  action: string,
  serial?: string,
  payload?: any
): Promise<{ success: boolean; message: string }> {
  const targetSerial = serial;

  switch (action) {
    // Navigation & Hardware Keys
    case 'power':
      await execAdb(['shell', 'input', 'keyevent', '26'], targetSerial);
      return { success: true, message: 'Power button toggled' };
    case 'wake':
      await execAdb(['shell', 'input', 'keyevent', '224'], targetSerial);
      return { success: true, message: 'Screen awakened' };
    case 'sleep':
      await execAdb(['shell', 'input', 'keyevent', '223'], targetSerial);
      return { success: true, message: 'Screen put to sleep' };
    case 'home':
      await execAdb(['shell', 'input', 'keyevent', '3'], targetSerial);
      return { success: true, message: 'Home button triggered' };
    case 'back':
      await execAdb(['shell', 'input', 'keyevent', '4'], targetSerial);
      return { success: true, message: 'Back button triggered' };
    case 'recents':
      await execAdb(['shell', 'input', 'keyevent', '187'], targetSerial);
      return { success: true, message: 'Recent apps triggered' };
    case 'vol_up':
      await execAdb(['shell', 'input', 'keyevent', '24'], targetSerial);
      return { success: true, message: 'Volume Up' };
    case 'vol_down':
      await execAdb(['shell', 'input', 'keyevent', '25'], targetSerial);
      return { success: true, message: 'Volume Down' };
    case 'vol_mute':
      await execAdb(['shell', 'input', 'keyevent', '164'], targetSerial);
      return { success: true, message: 'Volume Muted / Toggled' };
    case 'media_play_pause':
      await execAdb(['shell', 'input', 'keyevent', '85'], targetSerial);
      return { success: true, message: 'Media Play/Pause' };
    case 'media_next':
      await execAdb(['shell', 'input', 'keyevent', '87'], targetSerial);
      return { success: true, message: 'Media Next Track' };
    case 'media_prev':
      await execAdb(['shell', 'input', 'keyevent', '88'], targetSerial);
      return { success: true, message: 'Media Previous Track' };

    // Screen tap
    case 'tap': {
      const x = payload?.x;
      const y = payload?.y;
      if (x === undefined || y === undefined) throw new Error('Missing coordinates for tap');
      await execAdb(['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))], targetSerial);
      return { success: true, message: `Tapped at (${Math.round(x)}, ${Math.round(y)})` };
    }

    // Input text
    case 'input_text': {
      const text = payload?.text || '';
      if (!text) throw new Error('No text provided');
      // Escape spaces and special chars for adb shell
      const escaped = text.replace(/ /g, '%s').replace(/([&|;<>$`\\])/g, '\\$1');
      await execAdb(['shell', 'input', 'text', escaped], targetSerial);
      return { success: true, message: `Sent text: "${text}"` };
    }

    // Input Keycodes
    case 'keyevent': {
      const keycode = payload?.keycode;
      if (!keycode) throw new Error('No keycode provided');
      await execAdb(['shell', 'input', 'keyevent', String(keycode)], targetSerial);
      return { success: true, message: `Keyevent ${keycode} triggered` };
    }

    // Open URL
    case 'open_url': {
      const url = payload?.url;
      if (!url) throw new Error('No URL provided');
      await execAdb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `"${url}"`], targetSerial);
      return { success: true, message: `Opened URL: ${url}` };
    }

    // Power operations
    case 'reboot':
      await execAdb(['reboot'], targetSerial);
      return { success: true, message: 'Device reboot initiated' };
    case 'reboot_recovery':
      await execAdb(['reboot', 'recovery'], targetSerial);
      return { success: true, message: 'Rebooting into Recovery mode' };
    case 'reboot_bootloader':
      await execAdb(['reboot', 'bootloader'], targetSerial);
      return { success: true, message: 'Rebooting into Bootloader mode' };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Capture screen buffer (PNG)
 */
export function captureScreenshotBuffer(serial?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = serial ? ['-s', serial, 'exec-out', 'screencap', '-p'] : ['exec-out', 'screencap', '-p'];
    execFile('adb', args, { encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      resolve(stdout);
    });
  });
}

/**
 * Get installed packages (apps)
 */
export async function getInstalledPackages(serial?: string, filter: 'user' | 'system' | 'all' = 'user') {
  const flags = filter === 'user' ? ['-3'] : filter === 'system' ? ['-s'] : [];
  const output = await execAdb(['shell', 'pm', 'list', 'packages', ...flags], serial);
  const packages = output
    .split('\n')
    .map(l => l.replace(/^package:/, '').trim())
    .filter(Boolean)
    .sort();
  return packages;
}

/**
 * Package operations (launch, kill, clear, uninstall)
 */
export async function managePackage(
  action: 'launch' | 'stop' | 'clear' | 'uninstall',
  pkg: string,
  serial?: string
) {
  if (!pkg) throw new Error('Package name is required');

  switch (action) {
    case 'launch':
      await execAdb(['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'], serial);
      return { success: true, message: `Launched ${pkg}` };
    case 'stop':
      await execAdb(['shell', 'am', 'force-stop', pkg], serial);
      return { success: true, message: `Force-stopped ${pkg}` };
    case 'clear':
      await execAdb(['shell', 'pm', 'clear', pkg], serial);
      return { success: true, message: `Cleared cache & data for ${pkg}` };
    case 'uninstall':
      await execAdb(['uninstall', pkg], serial);
      return { success: true, message: `Uninstalled ${pkg}` };
    default:
      throw new Error(`Unsupported package action: ${action}`);
  }
}

/**
 * List files in an sdcard path
 */
export async function listDirectory(dirPath: string = '/sdcard', serial?: string) {
  const cleanPath = dirPath.replace(/['";&$|]/g, '');
  const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
  const output = await execAdb(['shell', 'ls', '-la', normalizedPath], serial);
  const lines = output.split('\n').filter(Boolean);
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('total') || !trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 7) {
      const permissions = parts[0];
      const isDirectory = permissions.startsWith('d') || permissions.startsWith('l');
      const size = parts[4];
      const date = `${parts[5]} ${parts[6]}`;
      const name = parts.slice(7).join(' ');
      if (name === '.' || name === '..') continue;
      items.push({
        name,
        isDirectory,
        permissions,
        size,
        date,
      });
    }
  }
  return items;
}

/**
 * Execute adb shell command directly
 */
export async function runCustomShell(command: string, serial?: string) {
  const start = Date.now();
  try {
    const output = await execAdb(['shell', command], serial);
    const durationMs = Date.now() - start;
    return { success: true, output, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    return { success: false, output: err.message || 'Execution error', durationMs };
  }
}

/**
 * Execute command via Termux runner on phone
 */
export async function execTermuxManage(cmd: string, args: string[] = [], serial?: string): Promise<string> {
  const safeArgs = args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
  const fullCmd = `run-as com.termux /data/data/com.termux/files/home/manage.sh ${cmd} ${safeArgs}`;
  return execAdb(['shell', `"${fullCmd}"`], serial);
}

export interface PhoneServerStatus {
  running: boolean;
  pid?: number;
  port: number;
  type: 'node' | 'python';
  logs?: string;
  versions?: {
    node: string;
    python: string;
    cloudflared: string;
  };
}

export interface CloudflareTunnelStatus {
  running: boolean;
  pid?: number;
  url?: string;
  mode?: 'quick' | 'named';
  logs?: string;
}

export async function getPhoneServerState(serial?: string): Promise<PhoneServerStatus> {
  try {
    const raw = await execTermuxManage('server-status', [], serial);
    const logs = await execTermuxManage('server-logs', [], serial);
    const sysRaw = await execTermuxManage('sys-info', [], serial);

    let versions = { node: 'unknown', python: 'unknown', cloudflared: 'unknown' };
    const sysMatch = sysRaw.match(/NODE:([^|]+)\|PYTHON:([^|]+)\|CF:(.+)/);
    if (sysMatch) {
      versions = {
        node: sysMatch[1].trim(),
        python: sysMatch[2].trim(),
        cloudflared: sysMatch[3].trim()
      };
    }

    if (raw.startsWith('RUNNING')) {
      const parts = raw.split(':');
      return {
        running: true,
        pid: parseInt(parts[1], 10),
        port: parseInt(parts[2], 10) || 8080,
        type: (parts[3]?.trim() as 'node' | 'python') || 'node',
        logs,
        versions
      };
    }
    return {
      running: false,
      port: 8080,
      type: 'node',
      logs,
      versions
    };
  } catch (err: any) {
    return {
      running: false,
      port: 8080,
      type: 'node',
      logs: err.message
    };
  }
}

export async function getCloudflareTunnelState(serial?: string): Promise<CloudflareTunnelStatus> {
  try {
    const raw = await execTermuxManage('cf-status', [], serial);
    const logs = await execTermuxManage('cf-logs', [], serial);

    if (raw.startsWith('RUNNING')) {
      const parts = raw.split(':');
      const pid = parseInt(parts[1], 10);
      const url = parts.slice(2).join(':').trim();
      return {
        running: true,
        pid,
        url: url || undefined,
        mode: url.includes('trycloudflare.com') ? 'quick' : 'named',
        logs
      };
    }
    return {
      running: false,
      logs
    };
  } catch (err: any) {
    return {
      running: false,
      logs: err.message
    };
  }
}

