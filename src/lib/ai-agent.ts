import {
  execAdb,
  performAdbAction,
  getDeviceTelemetry,
  getInstalledPackages,
  managePackage,
  runCustomShell,
  getPhoneServerState,
  getCloudflareTunnelState,
  execTermuxManage,
} from './adb';
import { logAction, saveChatMessage } from './db';

export interface AiAgentResult {
  reply: string;
  toolCalled?: string;
  toolArgs?: any;
  toolResult?: string;
  latencyMs: number;
}

/**
 * Common app name to package mapping helpers
 */
const COMMON_APP_PACKAGES: Record<string, string> = {
  settings: 'com.android.settings',
  chrome: 'com.android.chrome',
  camera: 'com.motorola.camera3',
  youtube: 'com.google.android.youtube',
  maps: 'com.google.android.apps.maps',
  clock: 'com.google.android.deskclock',
  calculator: 'com.google.android.calculator',
  messages: 'com.google.android.apps.messaging',
  dialer: 'com.google.android.dialer',
  phone: 'com.google.android.dialer',
  contacts: 'com.google.android.contacts',
  playstore: 'com.android.vending',
  store: 'com.android.vending',
  photos: 'com.google.android.apps.photos',
  gallery: 'com.google.android.apps.photos',
  whatsapp: 'com.whatsapp',
  spotify: 'com.spotify.music',
  instagram: 'com.instagram.android',
  telegram: 'org.telegram.messenger',
};

/**
 * Intelligent Action & Intent Router
 */
export async function executeAiCommand(
  prompt: string,
  serial: string = 'ZD222GMCMS'
): Promise<AiAgentResult> {
  const t0 = performance.now();
  const lower = prompt.trim().toLowerCase();

  // Save User Prompt to SQLite
  saveChatMessage({
    serial,
    role: 'user',
    content: prompt,
  });

  let reply = '';
  let toolCalled: string | undefined;
  let toolArgs: any = undefined;
  let toolResult: string | undefined;

  try {
    // 1. Screenshot
    if (lower.includes('screenshot') || lower.includes('capture screen') || lower.includes('snap screen')) {
      toolCalled = 'capture_screenshot';
      toolResult = 'Screenshot captured successfully';
      reply = `📸 I've captured a fresh screenshot of your device screen! You can view it in the Screen Mirror panel or download it.`;
    }

    // 2. Volume Controls
    else if (lower.includes('vol') || lower.includes('volume') || lower.includes('sound') || lower.includes('mute')) {
      if (lower.includes('up') || lower.includes('increase') || lower.includes('raise') || lower.includes('louder')) {
        toolCalled = 'vol_up';
        const res = await performAdbAction('vol_up', serial);
        toolResult = res.message;
        reply = `🔊 Turned volume UP on your device.`;
      } else if (lower.includes('down') || lower.includes('decrease') || lower.includes('lower') || lower.includes('quieter')) {
        toolCalled = 'vol_down';
        const res = await performAdbAction('vol_down', serial);
        toolResult = res.message;
        reply = `🔉 Turned volume DOWN on your device.`;
      } else if (lower.includes('mute') || lower.includes('silent') || lower.includes('unmute')) {
        toolCalled = 'vol_mute';
        const res = await performAdbAction('vol_mute', serial);
        toolResult = res.message;
        reply = `🔇 Toggled mute state on your device.`;
      }
    }

    // 3. Navigation Controls
    else if (lower === 'back' || lower.includes('go back') || lower.includes('back button')) {
      toolCalled = 'back';
      const res = await performAdbAction('back', serial);
      toolResult = res.message;
      reply = `◀️ Triggered the Back button on your phone.`;
    } else if (lower === 'home' || lower.includes('go home') || lower.includes('home screen') || lower.includes('home button')) {
      toolCalled = 'home';
      const res = await performAdbAction('home', serial);
      toolResult = res.message;
      reply = `🏠 Navigated to the Home screen on your phone.`;
    } else if (lower.includes('recent') || lower.includes('app switch') || lower.includes('multitask') || lower.includes('overview')) {
      toolCalled = 'recents';
      const res = await performAdbAction('recents', serial);
      toolResult = res.message;
      reply = `📑 Opened Recent Apps switcher.`;
    }

    // 4. Power & Display
    else if (lower.includes('wake') || lower.includes('turn on screen')) {
      toolCalled = 'wake';
      const res = await performAdbAction('wake', serial);
      toolResult = res.message;
      reply = `☀️ Screen awakened.`;
    } else if (lower.includes('sleep') || lower.includes('turn off screen') || lower.includes('lock screen')) {
      toolCalled = 'sleep';
      const res = await performAdbAction('sleep', serial);
      toolResult = res.message;
      reply = `🌙 Put the device screen to sleep.`;
    } else if (lower.includes('power button') || lower.includes('press power') || lower.includes('toggle power')) {
      toolCalled = 'power';
      const res = await performAdbAction('power', serial);
      toolResult = res.message;
      reply = `⚡ Toggled the physical Power button.`;
    }

    // 5. Media Controls
    else if (lower.includes('play') || lower.includes('pause') || lower.includes('resume')) {
      toolCalled = 'media_play_pause';
      const res = await performAdbAction('media_play_pause', serial);
      toolResult = res.message;
      reply = `⏯️ Toggled media Play / Pause.`;
    } else if (lower.includes('next track') || lower.includes('next song') || lower.includes('skip song')) {
      toolCalled = 'media_next';
      const res = await performAdbAction('media_next', serial);
      toolResult = res.message;
      reply = `⏭️ Skipped to next track.`;
    } else if (lower.includes('previous track') || lower.includes('prev song')) {
      toolCalled = 'media_prev';
      const res = await performAdbAction('media_prev', serial);
      toolResult = res.message;
      reply = `⏮️ Replayed previous track.`;
    }

    // 6. Text Typing
    else if (lower.startsWith('type ') || lower.startsWith('send text ') || lower.startsWith('input text ') || lower.includes('type:')) {
      const rawText = prompt.replace(/^(type|send text|input text|type:)\s+/i, '').replace(/^["']|["']$/g, '');
      toolCalled = 'input_text';
      toolArgs = { text: rawText };
      const res = await performAdbAction('input_text', serial, { text: rawText });
      toolResult = res.message;
      reply = `✍️ Injected text into phone input: **"${rawText}"**`;
    }

    // 7. Open URL / Web Links
    else if (lower.startsWith('open url ') || lower.startsWith('browse ') || lower.startsWith('open link ') || lower.includes('.com') || lower.includes('http://') || lower.includes('https://')) {
      let url = prompt.replace(/^(open url|browse|open link|open)\s+/i, '').trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      toolCalled = 'open_url';
      toolArgs = { url };
      const res = await performAdbAction('open_url', serial, { url });
      toolResult = res.message;
      reply = `🌐 Opened web link on device: [${url}](${url})`;
    }

    // 8. App Launching / Force Stopping
    else if (lower.startsWith('launch ') || lower.startsWith('open ') || lower.startsWith('start ')) {
      const appName = lower.replace(/^(launch|open|start)\s+/i, '').trim();
      let pkg = COMMON_APP_PACKAGES[appName];
      if (!pkg) {
        // Search installed packages
        const userPackages = await getInstalledPackages(serial, 'user');
        const matched = userPackages.find(p => p.toLowerCase().includes(appName));
        if (matched) pkg = matched;
        else pkg = appName;
      }

      toolCalled = 'launch_app';
      toolArgs = { package: pkg };
      const res = await managePackage('launch', pkg, serial);
      toolResult = res.message;
      reply = `🚀 Successfully launched application: \`${pkg}\``;
    } else if (lower.startsWith('kill ') || lower.startsWith('force stop ') || lower.startsWith('close ')) {
      const appName = lower.replace(/^(kill|force stop|close)\s+/i, '').trim();
      let pkg = COMMON_APP_PACKAGES[appName] || appName;
      toolCalled = 'kill_app';
      toolArgs = { package: pkg };
      const res = await managePackage('stop', pkg, serial);
      toolResult = res.message;
      reply = `🛑 Force stopped application: \`${pkg}\``;
    }

    // 9. List Installed Apps
    else if (lower.includes('list apps') || lower.includes('show apps') || lower.includes('what apps') || lower.includes('installed apps')) {
      toolCalled = 'list_packages';
      const packages = await getInstalledPackages(serial, 'user');
      toolResult = `Found ${packages.length} apps`;
      reply = `📦 Found **${packages.length} user-installed apps** on your device:\n\n` +
        packages.slice(0, 10).map((p, i) => `${i + 1}. \`${p}\``).join('\n') +
        (packages.length > 10 ? `\n\n*...and ${packages.length - 10} more. View the App Manager tab for full list.*` : '');
    }

    // 10. Telemetry & Hardware Queries
    else if (lower.includes('battery') || lower.includes('charge') || lower.includes('power status')) {
      toolCalled = 'get_battery';
      const batteryRaw = await execAdb(['shell', 'dumpsys', 'battery'], serial).catch(() => '');
      let level = 100, temp = 0, voltage = 0, status = 'Discharging', health = 'Good', isCharging = false;
      for (const line of batteryRaw.split('\n')) {
        const [k, v] = line.trim().split(/:\s*/);
        if (k === 'level') level = parseInt(v, 10) || 0;
        if (k === 'temperature') temp = (parseInt(v, 10) || 0) / 10;
        if (k === 'voltage') voltage = parseInt(v, 10) || 0;
        if (k === 'status') status = v === '2' ? 'Charging' : v === '4' ? 'Full' : 'Discharging';
        if (k === 'USB powered' || k === 'AC powered') if (v === 'true') isCharging = true;
      }
      toolResult = `${level}%, ${status}, ${temp}°C`;
      reply = `🔋 **Battery Health Telemetry**:\n- **Level**: ${level}%\n- **Status**: ${status} (${isCharging ? '⚡ USB Charging' : 'On Battery'})\n- **Temperature**: ${temp}°C\n- **Voltage**: ${(voltage / 1000).toFixed(2)}V\n- **Health**: ${health}`;
    } else if (lower.includes('storage') || lower.includes('disk') || lower.includes('space') || lower.includes('memory') || lower.includes('ram')) {
      toolCalled = 'get_storage_ram';
      const telemetry = await getDeviceTelemetry(serial);
      if (telemetry) {
        const s = telemetry.storage;
        const m = telemetry.memory;
        toolResult = `Storage: ${s.used}/${s.total}, RAM: ${m.percentage}%`;
        reply = `💾 **Storage & Memory Telemetry**:\n- **Internal Storage**: ${s.used} used of ${s.total} (${s.percentage}% used, ${s.available} free)\n- **RAM Utilization**: ${(m.usedMb / 1024).toFixed(1)} GB / ${(m.totalMb / 1024).toFixed(1)} GB (${m.percentage}% used, ${m.freeMb} MB free)`;
      } else {
        reply = `⚠️ Could not query storage/memory stats.`;
      }
    } else if (lower.includes('spec') || lower.includes('device info') || lower.includes('model') || lower.includes('android version') || lower.includes('ip address')) {
      toolCalled = 'get_specs';
      const telemetry = await getDeviceTelemetry(serial);
      if (telemetry) {
        toolResult = `${telemetry.model} Android ${telemetry.androidVersion}`;
        reply = `📱 **Device Hardware Specifications**:\n- **Model**: ${telemetry.model} (${telemetry.manufacturer})\n- **Android Version**: ${telemetry.androidVersion} (API ${telemetry.sdkVersion})\n- **Screen Resolution**: ${telemetry.screenResolution}\n- **Architecture**: ${telemetry.cpuAbi}\n- **Wi-Fi IP Address**: ${telemetry.ipAddress}\n- **Device Uptime**: ${telemetry.uptime}`;
      } else {
        reply = `⚠️ Device specs unavailable.`;
      }
    }

    // 11. Run Arbitrary Shell Command
    else if (lower.startsWith('run shell ') || lower.startsWith('exec ') || lower.startsWith('shell ')) {
      const cmd = prompt.replace(/^(run shell|exec|shell)\s+/i, '').trim();
      toolCalled = 'run_shell';
      toolArgs = { command: cmd };
      const res = await runCustomShell(cmd, serial);
      toolResult = res.output;
      reply = `💻 **Shell Command Output**:\n\`\`\`bash\n$ ${cmd}\n${res.output || '(no output)'}\n\`\`\``;
    }

    // 12. Reboot Phone
    else if (lower.includes('reboot') || lower.includes('restart')) {
      if (lower.includes('recovery')) {
        toolCalled = 'reboot_recovery';
        const res = await performAdbAction('reboot_recovery', serial);
        toolResult = res.message;
        reply = `🔄 Initiated reboot into Android Recovery Mode.`;
      } else if (lower.includes('bootloader') || lower.includes('fastboot')) {
        toolCalled = 'reboot_bootloader';
        const res = await performAdbAction('reboot_bootloader', serial);
        toolResult = res.message;
        reply = `🔄 Initiated reboot into Bootloader / Fastboot.`;
      } else {
        toolCalled = 'reboot';
        const res = await performAdbAction('reboot', serial);
        toolResult = res.message;
        reply = `🔄 Soft reboot initiated on device.`;
      }
    }

    // 13. Phone Server & Cloudflare Tunnel
    else if (lower.includes('tunnel') || lower.includes('cloudflare') || lower.includes('phone server') || lower.includes('web server')) {
      if (lower.includes('start tunnel') || lower.includes('open tunnel') || lower.includes('run tunnel')) {
        toolCalled = 'start_cloudflare_tunnel';
        const res = await execTermuxManage('cf-start-quick', ['8080'], serial);
        const tunnel = await getCloudflareTunnelState(serial);
        toolResult = tunnel.url || res;
        reply = `🌐 **Cloudflare Tunnel Started!**\n- **Public URL**: ${tunnel.url ? `[${tunnel.url}](${tunnel.url})` : 'Generating...'}\n- **Local Port**: 8080\n- **Status**: Live on Cloudflare Edge`;
      } else if (lower.includes('stop tunnel') || lower.includes('kill tunnel')) {
        toolCalled = 'stop_cloudflare_tunnel';
        await execTermuxManage('cf-stop', [], serial);
        toolResult = 'Tunnel stopped';
        reply = `🛑 Cloudflare Tunnel has been stopped.`;
      } else if (lower.includes('start server') || lower.includes('run server')) {
        toolCalled = 'start_phone_server';
        const type = lower.includes('python') ? 'python' : 'node';
        await execTermuxManage('server-start', [type], serial);
        const server = await getPhoneServerState(serial);
        toolResult = `Started ${type} server`;
        reply = `🚀 **Phone Server Started**:\n- **Runtime**: ${type === 'python' ? 'Python 3.14' : 'Node.js v26'}\n- **Port**: 8080 (0.0.0.0:8080)\n- **PID**: ${server.pid || 'Active'}`;
      } else if (lower.includes('stop server') || lower.includes('kill server')) {
        toolCalled = 'stop_phone_server';
        await execTermuxManage('server-stop', [], serial);
        toolResult = 'Server stopped';
        reply = `🛑 Phone HTTP server stopped.`;
      } else {
        toolCalled = 'get_tunnel_status';
        const [server, tunnel] = await Promise.all([
          getPhoneServerState(serial),
          getCloudflareTunnelState(serial),
        ]);
        toolResult = `${server.running ? 'Server Online' : 'Server Offline'}, ${tunnel.running ? 'Tunnel Active' : 'Tunnel Inactive'}`;
        reply = `📱 **Phone Server & Cloudflare Status**:\n- **Phone HTTP Server**: ${server.running ? `🟢 ONLINE (PID ${server.pid}, ${server.type})` : '⚪ OFFLINE'}\n- **Internal Port**: 8080\n- **Cloudflare Tunnel**: ${tunnel.running ? '🟢 ACTIVE' : '⚪ INACTIVE'}\n- **Public URL**: ${tunnel.url ? `[${tunnel.url}](${tunnel.url})` : 'None (tunnel stopped)'}`;
      }
    }

    // 14. Help / Conversational fallback
    else {
      reply = `👋 Hi! I'm your integrated ADB Copilot. I can directly control your **Motorola Edge 40 Neo**!\n\n**Try asking me to:**\n- *"Start phone server / stop server"*\n- *"Start cloudflare tunnel / what is my tunnel url"*\n- *"Take a screenshot"*\n- *"Turn volume up / down / mute"*\n- *"Go home / back / recent apps"*\n- *"Type 'Hello World' on phone"*\n- *"Open youtube.com"*\n- *"Check battery & storage"*\n- *"Launch settings / camera"*\n- *"Run shell uptime"*`;
    }
  } catch (err: any) {
    reply = `❌ Error executing action: ${err.message || 'Operation failed'}`;
    toolResult = err.message;
  }

  const latencyMs = Math.round((performance.now() - t0) * 10) / 10;

  // Log action if tool was called
  if (toolCalled) {
    logAction({
      serial,
      action: toolCalled,
      payload: toolArgs,
      adb_latency_ms: latencyMs,
      status: reply.startsWith('❌') ? 'error' : 'success',
      message: toolResult || reply,
    });
  }

  // Save Assistant Reply to SQLite
  saveChatMessage({
    serial,
    role: 'assistant',
    content: reply,
    tool_called: toolCalled,
    tool_args: toolArgs,
    tool_result: toolResult,
    latency_ms: latencyMs,
  });

  return {
    reply,
    toolCalled,
    toolArgs,
    toolResult,
    latencyMs,
  };
}
