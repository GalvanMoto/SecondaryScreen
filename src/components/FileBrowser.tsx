'use client';

import React, { useState, useEffect } from 'react';
import { Folder, FileText, ArrowLeft, RefreshCw, HardDrive, CornerLeftUp } from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  permissions: string;
  size: string;
  date: string;
}

interface FileBrowserProps {
  serial?: string;
}

export default function FileBrowser({ serial }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/sdcard');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/adb/files?serial=${encodeURIComponent(serial || '')}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list directory');
      setCurrentPath(data.path || path);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [serial]);

  const handleNavigate = (subDir: string) => {
    const cleanCurrent = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
    const nextPath = `${cleanCurrent}${subDir}`;
    fetchDirectory(nextPath);
  };

  const handleGoUp = () => {
    if (currentPath === '/sdcard' || currentPath === '/storage/emulated/0') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    fetchDirectory(parentPath || '/sdcard');
  };

  const shortcuts = ['/sdcard/Download', '/sdcard/DCIM', '/sdcard/Pictures', '/sdcard/Music', '/sdcard/Movies'];

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Internal Storage File Browser</h2>
            <span className="badge-pill badge-cyan font-mono" style={{ fontSize: '11px' }}>
              {items.length} Items
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Explore folders, photos, downloads, and documents on the phone
          </p>
        </div>

        <button
          onClick={() => fetchDirectory(currentPath)}
          disabled={loading}
          className="op-btn"
          style={{ padding: '7px 12px' }}
          title="Refresh Directory"
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Folder Shortcuts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {shortcuts.map((sc) => {
          const name = sc.split('/').pop();
          return (
            <button
              key={sc}
              onClick={() => fetchDirectory(sc)}
              className="op-btn"
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                background: currentPath === sc ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: currentPath === sc ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: currentPath === sc ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              <Folder size={12} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {/* Path Bar & Up Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={handleGoUp}
          disabled={currentPath === '/sdcard'}
          className="op-btn"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          title="Go to parent directory"
        >
          <CornerLeftUp size={14} />
          <span>Up</span>
        </button>

        <div className="font-mono" style={{ fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentPath}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '10px', color: '#fb7185', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Files List Table */}
      <div
        style={{
          maxHeight: '440px',
          overflowY: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Listing files...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Empty directory.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Name</th>
                <th style={{ padding: '10px 14px', width: '100px' }}>Size</th>
                <th style={{ padding: '10px 14px', width: '140px' }}>Date</th>
                <th style={{ padding: '10px 14px', width: '110px' }}>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  onClick={() => item.isDirectory && handleNavigate(item.name)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: item.isDirectory ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.isDirectory ? (
                      <Folder size={16} color="var(--accent-cyan)" />
                    ) : (
                      <FileText size={16} color="var(--text-secondary)" />
                    )}
                    <span style={{ fontWeight: item.isDirectory ? 600 : 400, color: item.isDirectory ? '#fff' : 'var(--text-secondary)' }}>
                      {item.name}
                    </span>
                  </td>
                  <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {item.size || '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {item.date}
                  </td>
                  <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {item.permissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
