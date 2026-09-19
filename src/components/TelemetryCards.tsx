'use client';

import React from 'react';
import { BatteryCharging, Battery, HardDrive, Cpu, ShieldCheck, Thermometer, Zap, Layers } from 'lucide-react';
import { DeviceTelemetry } from '@/lib/adb';

interface TelemetryCardsProps {
  telemetry: DeviceTelemetry | null;
}

export default function TelemetryCards({ telemetry }: TelemetryCardsProps) {
  if (!telemetry) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Connecting to ADB device...</p>
      </div>
    );
  }

  const { battery, storage, memory } = telemetry;

  // Calculate battery color
  let batteryColor = 'var(--accent-emerald)';
  if (battery.level < 20) batteryColor = 'var(--accent-rose)';
  else if (battery.level < 50) batteryColor = 'var(--accent-amber)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '18px',
        marginBottom: '24px',
      }}
    >
      {/* Battery Telemetry Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Battery State
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: batteryColor }}>
                {battery.level}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {battery.status}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: battery.isCharging ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${battery.isCharging ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
              color: battery.isCharging ? '#34d399' : '#fff',
            }}
          >
            {battery.isCharging ? <BatteryCharging size={24} /> : <Battery size={24} />}
          </div>
        </div>

        {/* Battery Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, battery.level))}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${batteryColor} 0%, #00f2fe 100%)`,
              borderRadius: '4px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Battery Micro Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Zap size={14} color="var(--accent-amber)" />
            <span>Power: <strong style={{ color: '#fff' }}>{battery.chargeType}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Thermometer size={14} color="var(--accent-rose)" />
            <span>Temp: <strong style={{ color: '#fff' }}>{battery.temperatureC.toFixed(1)}°C</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={14} color="var(--accent-emerald)" />
            <span>Health: <strong style={{ color: '#fff' }}>{battery.health}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Zap size={14} color="var(--accent-cyan)" />
            <span>Volt: <strong style={{ color: '#fff' }}>{(battery.voltageMv / 1000).toFixed(2)}V</strong></span>
          </div>
        </div>
      </div>

      {/* Internal Storage Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Internal Storage (/data)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {storage.percentage}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {storage.used} / {storage.total}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: 'var(--accent-cyan)',
            }}
          >
            <HardDrive size={24} />
          </div>
        </div>

        {/* Storage Bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, storage.percentage))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00f2fe 0%, #3b82f6 100%)',
              borderRadius: '4px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Storage Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Used Space: <strong style={{ color: '#fff' }}>{storage.used}</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Free Space: <strong style={{ color: 'var(--accent-emerald)' }}>{storage.available}</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Total Capacity: <strong style={{ color: '#fff' }}>{storage.total}</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Mount: <span className="font-mono" style={{ color: '#fff', fontSize: '11px' }}>/data</span>
          </div>
        </div>
      </div>

      {/* Memory (RAM) Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Memory (RAM)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                {memory.percentage}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {(memory.usedMb / 1024).toFixed(1)} GB / {(memory.totalMb / 1024).toFixed(1)} GB
              </span>
            </div>
          </div>
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--accent-purple)',
            }}
          >
            <Layers size={24} />
          </div>
        </div>

        {/* RAM Bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, memory.percentage))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)',
              borderRadius: '4px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Memory Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Used RAM: <strong style={{ color: '#fff' }}>{memory.usedMb} MB</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Free / Cache: <strong style={{ color: 'var(--accent-emerald)' }}>{memory.freeMb} MB</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Total RAM: <strong style={{ color: '#fff' }}>{memory.totalMb} MB</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: 'var(--accent-emerald)' }}>Normal</strong>
          </div>
        </div>
      </div>

      {/* System Specifications Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Specs
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: '#fff' }}>
              Android {telemetry.androidVersion}
            </div>
          </div>
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
            }}
          >
            <Cpu size={24} />
          </div>
        </div>

        {/* Specs Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>API Level / SDK:</span>
            <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>API {telemetry.sdkVersion}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Resolution:</span>
            <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{telemetry.screenResolution}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Chipset ABI:</span>
            <span className="font-mono" style={{ color: '#fff' }}>{telemetry.cpuAbi}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{telemetry.uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
