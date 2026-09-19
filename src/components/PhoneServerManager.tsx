'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  Globe,
  Play,
  Square,
  RotateCw,
  Copy,
  ExternalLink,
  Check,
  Terminal,
  ShieldCheck,
  Cpu,
  Radio,
  Eye,
  EyeOff,
  Activity,
  AlertCircle
} from 'lucide-react';

interface PhoneServerManagerProps {
  serial: string;
}

interface ServerState {
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

interface TunnelState {
  running: boolean;
  pid?: number;
  url?: string;
  mode?: 'quick' | 'named';
  logs?: string;
}

export default function PhoneServerManager({ serial }: PhoneServerManagerProps) {
  const [serverState, setServerState] = useState<ServerState>({
    running: false,
    port: 8080,
    type: 'node',
  });
  const [tunnelState, setTunnelState] = useState<TunnelState>({
    running: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tunnelMode, setTunnelMode] = useState<'quick' | 'named'>('named');
  const [tunnelToken, setTunnelToken] = useState<string>('eyJhIjoiMTAyM2IxNTJiNWY2NTZlNDZjNDdmMWQ4NDFmMjZmY2EiLCJzIjoiRnJhbU1WZDBNN0V0SUFxOG1SSU4xRU9rVm44Ujdkbk9wTWxEeitPQWt3RT0iLCJ0IjoiM2ExNDhkNTUtZGJkYS00OGFjLWIwNTMtNGFmZjIyMzljNzY0In0=');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [selectedRuntime, setSelectedRuntime] = useState<'node' | 'python'>('node');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeLogTab, setActiveLogTab] = useState<'server' | 'tunnel'>('tunnel');

  const fetchStatus = async () => {
    try {
      const serialParam = serial ? `?serial=${encodeURIComponent(serial)}` : '';
      const res = await fetch(`/api/adb/server${serialParam}`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.server) {
          setServerState(data.server);
          if (data.server.type) setSelectedRuntime(data.server.type);
        }
        if (data.tunnel) {
          setTunnelState(data.tunnel);
          if (data.tunnel.mode) setTunnelMode(data.tunnel.mode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch phone server status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [serial]);

  const handleAction = async (action: string, payload: any = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/adb/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          serial,
          payload,
        }),
      });
      const data = await res.json();
      if (data.server) setServerState(data.server);
      if (data.tunnel) setTunnelState(data.tunnel);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(null);
      fetchStatus();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                color: '#fff',
              }}
            >
              <Globe size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Phone Server & Cloudflare Tunnel Command Center
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Run Node.js / Python servers directly inside your Motorola Edge 40 Neo and tunnel globally via Cloudflare Edge.
              </p>
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchStatus}
            disabled={loading || !!actionLoading}
            className="op-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh State</span>
          </button>
        </div>

        {/* Runtime specs */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Cpu size={14} color="var(--accent-blue)" />
            <span>Environment: <strong>Termux Linux (ARM64)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Radio size={14} color="#10b981" />
            <span>Node.js: <strong>{serverState.versions?.node || 'v26.4.0'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Radio size={14} color="#f59e0b" />
            <span>Python: <strong>{serverState.versions?.python || 'v3.14.6'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Cloud size={14} color="#f97316" />
            <span>Cloudflared: <strong>{serverState.versions?.cloudflared || '2026.9.1'}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Card 1: Phone Server Runtime */}
        <div
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Phone HTTP Server</h3>
            </div>

            {/* Server Status Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: serverState.running ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: serverState.running ? '#34d399' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${serverState.running ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: serverState.running ? '#10b981' : '#94a3b8',
                  boxShadow: serverState.running ? '0 0 8px #10b981' : 'none',
                }}
              />
              <span>{serverState.running ? `ONLINE (PID ${serverState.pid})` : 'OFFLINE'}</span>
            </div>
          </div>

          {/* Runtime Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Server Stack Runtime:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setSelectedRuntime('node')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: selectedRuntime === 'node' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedRuntime === 'node' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                  color: selectedRuntime === 'node' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>Node.js (Fast API + UI)</span>
              </button>
              <button
                onClick={() => setSelectedRuntime('python')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: selectedRuntime === 'python' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedRuntime === 'python' ? '#10b981' : 'var(--border-subtle)'}`,
                  color: selectedRuntime === 'python' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>Python 3.14 (Server)</span>
              </button>
            </div>
          </div>

          {/* Port info */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Internal HTTP Port:</span>
            <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>0.0.0.0:8080</code>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            {!serverState.running ? (
              <button
                onClick={() => handleAction('server-start', { type: selectedRuntime })}
                disabled={actionLoading === 'server-start'}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
                className="op-btn"
              >
                <Play size={16} fill="currentColor" />
                <span>{actionLoading === 'server-start' ? 'Starting Server...' : 'Start Phone Server'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction('server-start', { type: selectedRuntime })}
                  disabled={actionLoading === 'server-start'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  className="op-btn"
                >
                  <RotateCw size={15} />
                  <span>Restart</span>
                </button>
                <button
                  onClick={() => handleAction('server-stop')}
                  disabled={actionLoading === 'server-stop'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  className="op-btn"
                >
                  <Square size={15} fill="currentColor" />
                  <span>Stop Server</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Cloudflare Tunnel */}
        <div
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cloud size={20} color="#f97316" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Cloudflare Tunnel</h3>
            </div>

            {/* Tunnel Status Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: tunnelState.running ? 'rgba(249, 115, 22, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: tunnelState.running ? '#fb923c' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${tunnelState.running ? 'rgba(249, 115, 22, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: tunnelState.running ? '#f97316' : '#94a3b8',
                  boxShadow: tunnelState.running ? '0 0 8px #f97316' : 'none',
                }}
              />
              <span>{tunnelState.running ? 'TUNNEL ACTIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>

          {/* Mode Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tunnel Mode:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setTunnelMode('quick')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: tunnelMode === 'quick' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${tunnelMode === 'quick' ? '#f97316' : 'var(--border-subtle)'}`,
                  color: tunnelMode === 'quick' ? '#fb923c' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Quick Tunnel</span>
              </button>
              <button
                onClick={() => setTunnelMode('named')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: tunnelMode === 'named' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${tunnelMode === 'named' ? '#8b5cf6' : 'var(--border-subtle)'}`,
                  color: tunnelMode === 'named' ? '#c084fc' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Named (Custom Domain)</span>
              </button>
            </div>
          </div>

          {/* Token input for named tunnel */}
          {tunnelMode === 'named' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Cloudflare Tunnel Token:
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                  }}
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showToken ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="eyJhIjoi..."
                value={tunnelToken}
                onChange={(e) => setTunnelToken(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Obtain from Cloudflare Zero Trust &gt; Networks &gt; Tunnels &gt; Create Tunnel.
              </span>
            </div>
          )}

          {/* Live Public URL Banner */}
          {tunnelState.running && tunnelState.url && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(234, 88, 12, 0.05) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase' }}>
                  Live Public Endpoint
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Edge Location: Active</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#67e8f9',
                    wordBreak: 'break-all',
                    fontWeight: 600,
                  }}
                >
                  {tunnelState.url}
                </span>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => copyToClipboard(tunnelState.url!)}
                    title="Copy URL"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>

                  <a
                    href={tunnelState.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Browser"
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px',
                      color: '#93c5fd',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            {!tunnelState.running ? (
              <button
                onClick={() => {
                  if (tunnelMode === 'quick') {
                    handleAction('cf-start-quick', { port: 8080 });
                  } else {
                    handleAction('cf-start-named', { token: tunnelToken });
                  }
                }}
                disabled={actionLoading?.startsWith('cf-start') || (tunnelMode === 'named' && !tunnelToken.trim())}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: (tunnelMode === 'named' && !tunnelToken.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
                  opacity: (tunnelMode === 'named' && !tunnelToken.trim()) ? 0.6 : 1,
                }}
                className="op-btn"
              >
                <Cloud size={16} />
                <span>{actionLoading?.startsWith('cf-start') ? 'Initializing Tunnel...' : 'Start Cloudflare Tunnel'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction('cf-stop')}
                disabled={actionLoading === 'cf-stop'}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                className="op-btn"
              >
                <Square size={15} fill="currentColor" />
                <span>Stop Tunnel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Logs Console */}
      <div
        style={{
          background: 'var(--surface-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Termux Live Daemon Logs</h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveLogTab('tunnel')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: activeLogTab === 'tunnel' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeLogTab === 'tunnel' ? '#f97316' : 'transparent'}`,
                color: activeLogTab === 'tunnel' ? '#fb923c' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cloudflare Tunnel Logs
            </button>
            <button
              onClick={() => setActiveLogTab('server')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: activeLogTab === 'server' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeLogTab === 'server' ? 'var(--accent-blue)' : 'transparent'}`,
                color: activeLogTab === 'server' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              HTTP Server Logs
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#040711',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '14px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#cbd5e1',
            maxHeight: '260px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          {activeLogTab === 'tunnel'
            ? tunnelState.logs || 'No tunnel logs available yet.'
            : serverState.logs || 'No HTTP server logs available yet.'}
        </div>
      </div>
    </div>
  );
}
