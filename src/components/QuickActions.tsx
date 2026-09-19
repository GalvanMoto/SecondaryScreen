'use client';

import React, { useState } from 'react';
import { RotateCw, ShieldAlert, Cpu, Check, AlertTriangle } from 'lucide-react';

interface QuickActionsProps {
  serial?: string;
  onRefresh?: () => void;
}

export default function QuickActions({ serial, onRefresh }: QuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const handleAction = async (action: string, confirmMessage?: string) => {
    if (confirmMessage && !confirm(confirmMessage)) return;

    setLoadingAction(action);
    setFeedback(null);
    try {
      const res = await fetch('/api/adb/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, serial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFeedback({ text: data.message || 'Operation successful' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error executing action', error: true });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Power & Firmware Operations</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            System reboot and recovery controls (handles device state transitions)
          </p>
        </div>
        {feedback && (
          <span
            className={`badge-pill ${feedback.error ? 'badge-rose' : 'badge-emerald'}`}
            style={{ fontSize: '11px' }}
          >
            {feedback.text}
          </span>
        )}
      </div>

      {/* Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Soft Reboot */}
        <button
          onClick={() => handleAction('reboot', 'Are you sure you want to reboot the phone?')}
          disabled={loadingAction === 'reboot'}
          className="op-btn op-btn-warning"
          style={{ padding: '14px 18px', display: 'flex', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <RotateCw size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Restart Device</div>
            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Standard system soft reboot</div>
          </div>
        </button>

        {/* Reboot Recovery */}
        <button
          onClick={() => handleAction('reboot_recovery', 'Reboot into Recovery mode now?')}
          disabled={loadingAction === 'reboot_recovery'}
          className="op-btn op-btn-purple"
          style={{ padding: '14px 18px', display: 'flex', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <ShieldAlert size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Recovery Mode</div>
            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Reboot to Android recovery</div>
          </div>
        </button>

        {/* Reboot Bootloader */}
        <button
          onClick={() => handleAction('reboot_bootloader', 'Reboot into Fastboot / Bootloader mode?')}
          disabled={loadingAction === 'reboot_bootloader'}
          className="op-btn op-btn-danger"
          style={{ padding: '14px 18px', display: 'flex', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <Cpu size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Fastboot / Bootloader</div>
            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Reboot into bootloader</div>
          </div>
        </button>
      </div>
    </div>
  );
}
