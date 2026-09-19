'use client';

import React, { useState } from 'react';
import {
  Power,
  Sun,
  Moon,
  ChevronLeft,
  Circle,
  Square,
  Volume2,
  Volume1,
  VolumeX,
  Play,
  SkipForward,
  SkipBack,
  Send,
  ExternalLink,
  CornerDownLeft,
  Delete,
  Menu,
} from 'lucide-react';

interface VirtualRemoteProps {
  serial?: string;
  onActionTriggered?: () => void;
}

export default function VirtualRemote({ serial, onActionTriggered }: VirtualRemoteProps) {
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const sendAction = async (action: string, payload?: any) => {
    setLoadingAction(action);
    setStatusMessage(null);
    try {
      const tStart = performance.now();
      const res = await fetch('/api/adb/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, serial, payload }),
      });
      const data = await res.json();
      const clientPing = Math.round(performance.now() - tStart);
      if (!res.ok) throw new Error(data.error || 'Action failed');
      const latencyTxt = data.adb_latency_ms ? `[ADB: ${data.adb_latency_ms}ms | DB: ${data.db_latency_ms || 0.04}ms | Ping: ${clientPing}ms]` : '';
      setStatusMessage({ text: `${data.message || 'Action executed'} ${latencyTxt}`, type: 'success' });
      if (onActionTriggered) onActionTriggered();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Action error', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await sendAction('input_text', { text: inputText });
    setInputText('');
  };

  const handleOpenUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    let target = inputUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    await sendAction('open_url', { url: target });
    setInputUrl('');
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Virtual Device Controller & Operational Keys
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Instant hardware keystrokes and operational inputs dispatched directly via ADB
          </p>
        </div>
        {statusMessage && (
          <span
            className={`badge-pill ${statusMessage.type === 'success' ? 'badge-emerald' : 'badge-rose'}`}
            style={{ fontSize: '11px', transition: 'all 0.3s ease' }}
          >
            {statusMessage.text}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {/* Section 1: Power & Display Hardware Keys */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Power & Display
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              onClick={() => sendAction('power')}
              disabled={loadingAction === 'power'}
              className="key-btn"
              style={{
                borderColor: 'rgba(244, 63, 94, 0.4)',
                background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.2) 0%, rgba(225, 29, 72, 0.05) 100%)',
                color: '#fb7185',
              }}
              title="Power Key (KeyEvent 26)"
            >
              <Power size={18} />
              <span>POWER</span>
            </button>
            <button
              onClick={() => sendAction('wake')}
              disabled={loadingAction === 'wake'}
              className="key-btn"
              title="Wake Screen (KeyEvent 224)"
            >
              <Sun size={18} color="var(--accent-amber)" />
              <span>WAKE</span>
            </button>
            <button
              onClick={() => sendAction('sleep')}
              disabled={loadingAction === 'sleep'}
              className="key-btn"
              title="Sleep Screen (KeyEvent 223)"
            >
              <Moon size={18} color="var(--accent-purple)" />
              <span>SLEEP</span>
            </button>
          </div>
        </div>

        {/* Section 2: Android Navigation Keys */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Android Navigation Bar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              onClick={() => sendAction('back')}
              disabled={loadingAction === 'back'}
              className="key-btn"
              title="Back Button (KeyEvent 4)"
            >
              <ChevronLeft size={20} color="var(--accent-cyan)" />
              <span>BACK</span>
            </button>
            <button
              onClick={() => sendAction('home')}
              disabled={loadingAction === 'home'}
              className="key-btn"
              title="Home Button (KeyEvent 3)"
            >
              <Circle size={18} color="var(--accent-cyan)" />
              <span>HOME</span>
            </button>
            <button
              onClick={() => sendAction('recents')}
              disabled={loadingAction === 'recents'}
              className="key-btn"
              title="App Switcher / Recent Apps (KeyEvent 187)"
            >
              <Square size={18} color="var(--accent-cyan)" />
              <span>RECENTS</span>
            </button>
          </div>
        </div>

        {/* Section 3: Audio & Volume Cluster */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Volume Controls
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              onClick={() => sendAction('vol_up')}
              disabled={loadingAction === 'vol_up'}
              className="key-btn"
              title="Volume Up (KeyEvent 24)"
            >
              <Volume2 size={18} color="var(--accent-emerald)" />
              <span>VOL +</span>
            </button>
            <button
              onClick={() => sendAction('vol_down')}
              disabled={loadingAction === 'vol_down'}
              className="key-btn"
              title="Volume Down (KeyEvent 25)"
            >
              <Volume1 size={18} color="var(--accent-amber)" />
              <span>VOL -</span>
            </button>
            <button
              onClick={() => sendAction('vol_mute')}
              disabled={loadingAction === 'vol_mute'}
              className="key-btn"
              title="Mute Volume (KeyEvent 164)"
            >
              <VolumeX size={18} color="var(--accent-rose)" />
              <span>MUTE</span>
            </button>
          </div>
        </div>

        {/* Section 4: Media & Keystroke Shortcuts */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Media & Special Keys
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <button
              onClick={() => sendAction('media_play_pause')}
              disabled={loadingAction === 'media_play_pause'}
              className="key-btn"
              title="Play/Pause Media (KeyEvent 85)"
            >
              <Play size={15} color="#34d399" />
              <span>PLAY</span>
            </button>
            <button
              onClick={() => sendAction('media_next')}
              disabled={loadingAction === 'media_next'}
              className="key-btn"
              title="Next Track (KeyEvent 87)"
            >
              <SkipForward size={15} color="var(--text-secondary)" />
              <span>NEXT</span>
            </button>
            <button
              onClick={() => sendAction('media_prev')}
              disabled={loadingAction === 'media_prev'}
              className="key-btn"
              title="Prev Track (KeyEvent 88)"
            >
              <SkipBack size={15} color="var(--text-secondary)" />
              <span>PREV</span>
            </button>
            <button
              onClick={() => sendAction('keyevent', { keycode: 66 })}
              disabled={loadingAction === 'keyevent'}
              className="key-btn"
              title="Enter Key (KeyEvent 66)"
            >
              <CornerDownLeft size={15} color="var(--accent-cyan)" />
              <span>ENTER</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct Input & URL Push Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {/* Type text into active phone input */}
        <form onSubmit={handleSendText} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type text to send to phone screen..."
            className="glass-input"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loadingAction === 'input_text'}
            className="op-btn op-btn-cyan"
            style={{ flexShrink: 0 }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </form>

        {/* Push URL to device browser */}
        <form onSubmit={handleOpenUrl} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Open URL on phone (e.g. google.com)..."
            className="glass-input"
          />
          <button
            type="submit"
            disabled={!inputUrl.trim() || loadingAction === 'open_url'}
            className="op-btn op-btn-purple"
            style={{ flexShrink: 0 }}
          >
            <ExternalLink size={15} />
            <span>Open URL</span>
          </button>
        </form>
      </div>
    </div>
  );
}
