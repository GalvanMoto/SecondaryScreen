'use client';

import React, { useState, useEffect } from 'react';
import { Play, Square, Trash2, RotateCcw, Search, Package, RefreshCw } from 'lucide-react';

interface AppManagerProps {
  serial?: string;
}

export default function AppManager({ serial }: AppManagerProps) {
  const [packages, setPackages] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'user' | 'system' | 'all'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/adb/apps?serial=${encodeURIComponent(serial || '')}&filter=${filterType}`);
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [serial, filterType]);

  const handleAppAction = async (action: 'launch' | 'stop' | 'clear' | 'uninstall', pkg: string) => {
    if (action === 'uninstall' && !confirm(`Are you sure you want to uninstall ${pkg}?`)) {
      return;
    }

    setActionLoading(`${action}-${pkg}`);
    setMessage(null);
    try {
      const res = await fetch('/api/adb/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pkg, serial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'App action failed');
      setMessage({ text: data.message || `Success on ${pkg}`, type: 'success' });
      if (action === 'uninstall') {
        fetchPackages();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Operation failed', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApps = packages.filter((pkg) =>
    pkg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Installed Applications & Packages</h2>
            <span className="badge-pill badge-cyan">
              {filteredApps.length} {filteredApps.length === 1 ? 'App' : 'Apps'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage installed apps with direct operational launch, stop, clear, and uninstall controls
          </p>
        </div>

        {/* Filter Tabs & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {(['user', 'system', 'all'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`op-btn ${filterType === type ? 'op-btn-cyan' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterType === type ? undefined : 'transparent',
                }}
              >
                {type === 'user' ? 'User Apps' : type === 'system' ? 'System' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPackages}
            disabled={loading}
            className="op-btn"
            style={{ padding: '7px 12px' }}
            title="Refresh App List"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {message && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            color: message.type === 'success' ? '#34d399' : '#fb7185',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Search Input Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter package by name (e.g. whatsapp, chrome, spotify)..."
          className="glass-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Package List Container */}
      <div
        style={{
          maxHeight: '440px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
        }}
      >
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading packages from device...
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No matching packages found.
          </div>
        ) : (
          filteredApps.map((pkg) => {
            const isUserApp = filterType === 'user';
            return (
              <div
                key={pkg}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* App Name / Package ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--accent-cyan)',
                      flexShrink: 0,
                    }}
                  >
                    <Package size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {pkg}
                    </div>
                  </div>
                </div>

                {/* Operational Buttons for Package */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAppAction('launch', pkg)}
                    disabled={actionLoading !== null}
                    className="op-btn op-btn-emerald"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Launch App"
                  >
                    <Play size={12} />
                    <span>Launch</span>
                  </button>

                  <button
                    onClick={() => handleAppAction('stop', pkg)}
                    disabled={actionLoading !== null}
                    className="op-btn op-btn-warning"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Force Stop App"
                  >
                    <Square size={12} />
                    <span>Kill</span>
                  </button>

                  <button
                    onClick={() => handleAppAction('clear', pkg)}
                    disabled={actionLoading !== null}
                    className="op-btn"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Clear Data & Cache"
                  >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                  </button>

                  {isUserApp && (
                    <button
                      onClick={() => handleAppAction('uninstall', pkg)}
                      disabled={actionLoading !== null}
                      className="op-btn op-btn-danger"
                      style={{ padding: '6px 10px', fontSize: '11px' }}
                      title="Uninstall App"
                    >
                      <Trash2 size={12} />
                      <span>Uninstall</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
