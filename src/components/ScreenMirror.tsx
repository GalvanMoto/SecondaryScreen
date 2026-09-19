'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Play, Pause, RefreshCw, Eye } from 'lucide-react';

interface ScreenMirrorProps {
  serial?: string;
  resolution?: string; // e.g. "1080x2400"
}

export default function ScreenMirror({ serial, resolution = '1080x2400' }: ScreenMirrorProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [lastCaptured, setLastCaptured] = useState<string>('');
  const [tapEffect, setTapEffect] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const fetchScreenshot = async () => {
    setLoading(true);
    try {
      const url = `/api/adb/screenshot?serial=${encodeURIComponent(serial || '')}&t=${Date.now()}`;
      // Preload image to avoid flickering
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      setImgSrc(url);
      setLastCaptured(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to capture screen:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshot();
  }, [serial]);

  // Auto streaming loop
  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      fetchScreenshot();
    }, 1800);
    return () => clearInterval(interval);
  }, [streaming, serial]);

  // Handle click to tap on device
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Show visual tap pulse on screen
    setTapEffect({ x: clickX, y: clickY });
    setTimeout(() => setTapEffect(null), 500);

    // Calculate actual screen coordinates
    const [resW, resH] = resolution.split('x').map(Number);
    const realWidth = resW || 1080;
    const realHeight = resH || 2400;

    const actualX = (clickX / rect.width) * realWidth;
    const actualY = (clickY / rect.height) * realHeight;

    try {
      await fetch('/api/adb/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tap',
          serial,
          payload: { x: actualX, y: actualY },
        }),
      });
      // Refresh screen shortly after tap
      setTimeout(fetchScreenshot, 300);
    } catch (err) {
      console.error('Failed to tap:', err);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Live Screen & Touch</h2>
            {streaming && (
              <span className="badge-pill badge-emerald">
                <span className="live-pulse" /> LIVE STREAM
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Click anywhere on the preview to tap the phone screen ({resolution})
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setStreaming(!streaming)}
            className={`op-btn ${streaming ? 'op-btn-danger' : 'op-btn-purple'}`}
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            {streaming ? <Pause size={14} /> : <Play size={14} />}
            <span>{streaming ? 'Stop Stream' : 'Live Mirror'}</span>
          </button>

          <button
            onClick={fetchScreenshot}
            disabled={loading}
            className="op-btn op-btn-cyan"
            style={{ padding: '8px 12px', fontSize: '12px' }}
            title="Take Screenshot"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Capture</span>
          </button>

          {imgSrc && (
            <a
              href={imgSrc}
              download={`screenshot-${Date.now()}.png`}
              className="op-btn"
              style={{ padding: '8px 12px', fontSize: '12px' }}
              title="Download Screenshot"
            >
              <Download size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Screen Display Frame */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5, 8, 15, 0.9)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: '24px',
            border: '8px solid #1a2233',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 242, 254, 0.1)',
            overflow: 'hidden',
            maxWidth: '320px',
            width: '100%',
            cursor: 'crosshair',
          }}
        >
          {imgSrc ? (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Device Screen Mirror"
              onClick={handleImageClick}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                userSelect: 'none',
              }}
            />
          ) : (
            <div
              style={{
                height: '560px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '12px',
              }}
            >
              <Camera size={36} />
              <span>Awaiting screen capture...</span>
            </div>
          )}

          {/* Visual Click Pulse Overlay */}
          {tapEffect && (
            <div
              style={{
                position: 'absolute',
                top: tapEffect.y - 15,
                left: tapEffect.x - 15,
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '2px solid #00f2fe',
                background: 'rgba(0, 242, 254, 0.35)',
                pointerEvents: 'none',
                animation: 'tap-pulse 0.4s ease-out forwards',
              }}
            />
          )}
        </div>

        {/* Screen Timestamp footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Eye size={12} />
          <span>Last captured: {lastCaptured || 'Never'}</span>
          <span>•</span>
          <span>Resolution: {resolution}</span>
        </div>
      </div>
      <style jsx>{`
        @keyframes tap-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
