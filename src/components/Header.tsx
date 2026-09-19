'use client';

import React from 'react';
import { Smartphone, RefreshCw, Cpu, Wifi } from 'lucide-react';
import { AdbDevice, DeviceTelemetry } from '@/lib/adb';

interface HeaderProps {
  devices: AdbDevice[];
  selectedSerial: string;
  onSelectSerial: (serial: string) => void;
  telemetry: DeviceTelemetry | null;
  loading: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number;
  onSetAutoRefreshInterval: (interval: number) => void;
}

export default function Header({
  devices,
  selectedSerial,
  onSelectSerial,
  telemetry,
  loading,
  onRefresh,
  autoRefreshInterval,
  onSetAutoRefreshInterval,
}: HeaderProps) {
  return (
    <header className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
            }}
          >
            <Smartphone size={24} color="#060911" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                ADB COMMAND CENTER
              </h1>
              <span className="badge-pill badge-emerald">
                <span className="live-pulse" />
                ONLINE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {telemetry ? `${telemetry.model} (${telemetry.serial})` : 'Connected Android Device Manager'}
            </p>
          </div>
        </div>

        {/* Device Selector & Quick Status */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Device Dropdown if multiple */}
          {devices.length > 1 ? (
            <select
              value={selectedSerial}
              onChange={(e) => onSelectSerial(e.target.value)}
              className="glass-input"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
            >
              {devices.map((d) => (
                <option key={d.serial} value={d.serial} style={{ background: '#0e1525', color: '#fff' }}>
                  {d.model} ({d.serial})
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
              }}
            >
              <Cpu size={15} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>Target:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{selectedSerial || 'ZD222GMCMS'}</span>
            </div>
          )}

          {/* Wi-Fi IP Badge */}
          {telemetry?.ipAddress && telemetry.ipAddress !== 'Disconnected / No Wi-Fi' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(0, 242, 254, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                fontSize: '12px',
                color: 'var(--accent-cyan)',
              }}
            >
              <Wifi size={14} />
              <span className="font-mono">{telemetry.ipAddress}</span>
            </div>
          )}

          {/* Auto Refresh Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto Sync:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => onSetAutoRefreshInterval(Number(e.target.value))}
              className="glass-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            >
              <option value={0} style={{ background: '#0e1525', color: '#fff' }}>Off</option>
              <option value={3000} style={{ background: '#0e1525', color: '#fff' }}>Every 3s</option>
              <option value={5000} style={{ background: '#0e1525', color: '#fff' }}>Every 5s</option>
              <option value={10000} style={{ background: '#0e1525', color: '#fff' }}>Every 10s</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="op-btn op-btn-cyan"
            style={{ padding: '8px 14px' }}
            title="Refresh device telemetry"
          >
            <RefreshCw size={15} className={loading ? 'spin-anim' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
