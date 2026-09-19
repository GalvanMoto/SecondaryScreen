'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import LatencyHUD from '@/components/LatencyHUD';
import TelemetryCards from '@/components/TelemetryCards';
import VirtualRemote from '@/components/VirtualRemote';
import ScreenMirror from '@/components/ScreenMirror';
import AppManager from '@/components/AppManager';
import FileBrowser from '@/components/FileBrowser';
import ShellTerminal from '@/components/ShellTerminal';
import QuickActions from '@/components/QuickActions';
import DatabaseLogs from '@/components/DatabaseLogs';
import AICopilot from '@/components/AICopilot';
import PhoneServerManager from '@/components/PhoneServerManager';
import { AdbDevice, DeviceTelemetry } from '@/lib/adb';
import { Gamepad2, Package, Folder, Terminal, Zap, Database, Bot, Globe } from 'lucide-react';

export default function Dashboard() {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'remote' | 'server' | 'copilot' | 'database' | 'apps' | 'files' | 'terminal' | 'power'>('remote');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // Handled by SSE stream

  // Real-time Latency Metrics (ms)
  const [adbLatency, setAdbLatency] = useState<number>(14);
  const [dbLatency, setDbLatency] = useState<number>(0.04);
  const [pingLatency, setPingLatency] = useState<number>(6);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/adb/devices');
      const data = await res.json();
      const devs: AdbDevice[] = data.devices || [];
      setDevices(devs);
      if (devs.length > 0 && !selectedSerial) {
        setSelectedSerial(devs[0].serial);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  };

  // Manual fallback telemetry fetch
  const fetchTelemetryManual = async () => {
    const t0 = performance.now();
    setLoading(true);
    try {
      const serialParam = selectedSerial ? `?serial=${encodeURIComponent(selectedSerial)}` : '';
      const res = await fetch(`/api/adb/device${serialParam}`);
      const rtt = Math.round((performance.now() - t0) * 10) / 10;
      setPingLatency(rtt);
      const data = await res.json();
      if (res.ok && data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Real-time SSE Stream Connection
  useEffect(() => {
    if (!isStreaming) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const serialParam = selectedSerial ? `?serial=${encodeURIComponent(selectedSerial)}` : '';
    const es = new EventSource(`/api/adb/stream${serialParam}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.telemetry) {
          setTelemetry(payload.telemetry);
          setLoading(false);
        }
        if (payload.latency) {
          setAdbLatency(payload.latency.adb_ms || 14);
          setDbLatency(payload.latency.db_ms || 0.04);
          const rtt = Math.max(2, Date.now() - payload.latency.timestamp);
          setPingLatency(rtt);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      // In case SSE reconnects or encounters error, fallback to manual fetch
      es.close();
      eventSourceRef.current = null;
      fetchTelemetryManual();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isStreaming, selectedSerial]);

  const tabs = [
    { id: 'remote', label: 'Remote & Screen', icon: Gamepad2 },
    { id: 'server', label: 'Phone Server & Cloudflare', icon: Globe },
    { id: 'copilot', label: 'AI Copilot', icon: Bot },
    { id: 'database', label: 'Local SQLite DB Logs', icon: Database },
    { id: 'apps', label: 'App Manager', icon: Package },
    { id: 'files', label: 'File Browser', icon: Folder },
    { id: 'terminal', label: 'ADB Terminal', icon: Terminal },
    { id: 'power', label: 'Power Options', icon: Zap },
  ] as const;

  return (
    <main className="dashboard-container">
      {/* Top Header */}
      <Header
        devices={devices}
        selectedSerial={selectedSerial}
        onSelectSerial={setSelectedSerial}
        telemetry={telemetry}
        loading={loading}
        onRefresh={fetchTelemetryManual}
        autoRefreshInterval={autoRefreshInterval}
        onSetAutoRefreshInterval={setAutoRefreshInterval}
      />

      {/* Real-time Latency HUD with millisecond counters */}
      <LatencyHUD
        adbLatency={adbLatency}
        dbLatency={dbLatency}
        pingLatency={pingLatency}
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming(!isStreaming)}
      />

      {/* Real-time Hardware Telemetry Cards */}
      <TelemetryCards telemetry={telemetry} />

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'remote' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 0.8fr)', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Virtual Remote Hardware Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <VirtualRemote
              serial={selectedSerial}
              onActionTriggered={fetchTelemetryManual}
            />
          </div>

          {/* Right Column: Live Screen Mirror with Click-to-Tap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ScreenMirror
              serial={selectedSerial}
              resolution={telemetry?.screenResolution || '1080x2400'}
            />
          </div>
        </div>
      )}

      {activeTab === 'server' && (
        <PhoneServerManager serial={selectedSerial} />
      )}

      {activeTab === 'copilot' && (
        <AICopilot
          serial={selectedSerial}
          onActionExecuted={fetchTelemetryManual}
        />
      )}

      {activeTab === 'database' && (
        <DatabaseLogs serial={selectedSerial} />
      )}

      {activeTab === 'apps' && (
        <AppManager serial={selectedSerial} />
      )}

      {activeTab === 'files' && (
        <FileBrowser serial={selectedSerial} />
      )}

      {activeTab === 'terminal' && (
        <ShellTerminal serial={selectedSerial} />
      )}

      {activeTab === 'power' && (
        <QuickActions
          serial={selectedSerial}
          onRefresh={fetchTelemetryManual}
        />
      )}

      {/* Floating AI Assistant Quick Trigger */}
      {activeTab !== 'copilot' && (
        <button
          onClick={() => setActiveTab('copilot')}
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 30px rgba(139, 92, 246, 0.45)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 999,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="op-btn"
          title="Open AI Phone Copilot"
        >
          <Bot size={18} />
          <span>Ask AI Copilot</span>
        </button>
      )}
    </main>
  );
}
