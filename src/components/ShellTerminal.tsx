'use client';

import React, { useState } from 'react';
import { Terminal, Play, Copy, Trash2, Check } from 'lucide-react';

interface ShellTerminalProps {
  serial?: string;
}

export default function ShellTerminal({ serial }: ShellTerminalProps) {
  const [command, setCommand] = useState('getprop ro.product.model');
  const [output, setOutput] = useState<string>('Welcome to ADB Web Terminal.\nType a shell command or pick a preset button below.\n');
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = [
    { label: 'Device Model', cmd: 'getprop ro.product.model' },
    { label: 'Battery Info', cmd: 'dumpsys battery' },
    { label: 'Disk Space', cmd: 'df -h' },
    { label: 'Network IPs', cmd: 'ip -f inet addr' },
    { label: 'Kernel / Uname', cmd: 'uname -a' },
    { label: 'Display Resolution', cmd: 'wm size' },
    { label: 'Top Processes', cmd: 'top -n 1 -b | head -n 18' },
  ];

  const handleRun = async (cmdToRun?: string) => {
    const targetCmd = cmdToRun || command;
    if (!targetCmd.trim()) return;

    setLoading(true);
    setDuration(null);
    try {
      const res = await fetch('/api/adb/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: targetCmd, serial }),
      });
      const data = await res.json();
      setDuration(data.durationMs || 0);

      const timestamp = new Date().toLocaleTimeString();
      const newEntry = `\n[${timestamp}] $ adb shell ${targetCmd}\n${data.output || '(no output)'}\n`;
      setOutput((prev) => prev + newEntry);
    } catch (err: any) {
      setOutput((prev) => prev + `\n[Error]: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={20} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Interactive ADB Shell Console</h2>
          {duration !== null && (
            <span className="badge-pill badge-emerald font-mono" style={{ fontSize: '10px' }}>
              {duration} ms
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopy}
            className="op-btn"
            style={{ padding: '6px 10px', fontSize: '11px' }}
            title="Copy Output"
          >
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setOutput('')}
            className="op-btn"
            style={{ padding: '6px 10px', fontSize: '11px' }}
            title="Clear Terminal Output"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Preset Command Shortcuts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setCommand(p.cmd);
              handleRun(p.cmd);
            }}
            className="op-btn"
            style={{ padding: '5px 10px', fontSize: '11px' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Command Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRun();
        }}
        style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <span
            className="font-mono"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
            }}
          >
            $
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type ADB shell command (e.g. getprop, pm list packages)..."
            className="glass-input font-mono"
            style={{ paddingLeft: '28px', fontSize: '13px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !command.trim()}
          className="op-btn op-btn-cyan"
          style={{ padding: '10px 18px', flexShrink: 0 }}
        >
          <Play size={14} />
          <span>{loading ? 'Running...' : 'Execute'}</span>
        </button>
      </form>

      {/* Terminal Display Output */}
      <div
        className="font-mono"
        style={{
          background: '#04070e',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          color: '#34d399',
          fontSize: '12px',
          lineHeight: '1.5',
          minHeight: '260px',
          maxHeight: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.8)',
        }}
      >
        {output}
      </div>
    </div>
  );
}
