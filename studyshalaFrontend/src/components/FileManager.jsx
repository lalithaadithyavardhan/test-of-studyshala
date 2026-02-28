/**
 * FileManager
 * ===========
 * Desktop-style full-screen file browser.
 *
 * Features:
 * - Grid view (icon tiles) and List view (table), toggleable
 * - Single-click = select file
 * - Double-click = open full-screen preview
 * - Preview button per file
 * - Download button opens Google Drive direct download in new tab
 *   (no Axios, no fetch — browser handles it directly)
 * - Keyboard: Escape closes, Enter opens selected file
 * - Dark mode support
 * - Responsive (mobile goes full-screen)
 *
 * DOWNLOAD APPROACH:
 *   window.open(file.downloadUrl, '_blank')
 *   This redirects the browser directly to Google Drive's anyoneWithLink
 *   download URL. No file data passes through our server at any point.
 */
import { useState, useEffect } from 'react';
import FilePreviewModal from './FilePreviewModal';
import './FileManager.css';

// ── File type metadata ─────────────────────────────────────────────────────

const FILE_META = {
  'application/pdf': { icon: '📕', color: '#ef4444', label: 'PDF' },
  'application/msword': { icon: '📘', color: '#3b82f6', label: 'Word' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📘', color: '#3b82f6', label: 'Word' },
  'application/vnd.ms-powerpoint': { icon: '📙', color: '#f97316', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📙', color: '#f97316', label: 'PPT' },
  'application/vnd.ms-excel': { icon: '📊', color: '#22c55e', label: 'Excel' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', color: '#22c55e', label: 'Excel' },
  'text/plain': { icon: '📄', color: '#64748b', label: 'Text' },
  'application/zip': { icon: '🗜️', color: '#a855f7', label: 'ZIP' },
  'application/x-rar-compressed': { icon: '🗜️', color: '#a855f7', label: 'RAR' },
  'application/x-7z-compressed': { icon: '🗜️', color: '#a855f7', label: '7Z' },
};

const getFileMeta = (mime = '') => {
  if (FILE_META[mime])              return FILE_META[mime];
  if (mime.startsWith('image/'))    return { icon: '🖼️', color: '#06b6d4', label: 'Image' };
  if (mime.startsWith('video/'))    return { icon: '🎥', color: '#8b5cf6', label: 'Video' };
  if (mime.startsWith('audio/'))    return { icon: '🎵', color: '#ec4899', label: 'Audio' };
  return { icon: '📄', color: '#64748b', label: 'File' };
};

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / 1024 ** i).toFixed(1) + ' ' + units[i];
};

// ── Component ──────────────────────────────────────────────────────────────

const FileManager = ({ files = [], materialName = 'Files', onClose }) => {
  const [view,      setView]    = useState('grid');
  const [selected,  setSelected]= useState(null);
  const [preview,   setPreview] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (preview) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && selected) {
        const f = files.find(x => x._id === selected);
        if (f?.driveFileId) setPreview(f);
      }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [selected, preview, onClose, files]);

  const handleDownload = (e, file) => {
    e.stopPropagation();
    if (!file.downloadUrl) {
      alert('No download URL. Ask your faculty to re-upload this file.');
      return;
    }
    // Direct browser → Drive — no server involvement
    window.open(file.downloadUrl, '_blank', 'noopener');
  };

  const openPreview = (e, file) => {
    e.stopPropagation();
    if (file.driveFileId) setPreview(file);
  };

  return (
    <>
      <div
        className="fm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="fm-window">

          {/* ── Title bar ── */}
          <div className="fm-titlebar">
            <div className="fm-titlebar-left">
              <span>📁</span>
              <span className="fm-title">{materialName}</span>
              <span className="fm-count-badge">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="fm-titlebar-right">
              <button
                className={`fm-view-btn ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
                title="Grid view"
              >⊞</button>
              <button
                className={`fm-view-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => setView('list')}
                title="List view"
              >☰</button>
              <button className="fm-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
            </div>
          </div>

          {/* ── Hint bar ── */}
          <div className="fm-hintbar">
            {selected
              ? `"${files.find(f => f._id === selected)?.name}" — press Enter to preview`
              : 'Click to select  •  Double-click to preview  •  ⬇ to download'}
          </div>

          {/* ── Files area ── */}
          <div className="fm-body">
            {files.length === 0 ? (
              <div className="fm-empty">
                <span style={{ fontSize: '3rem' }}>📭</span>
                <h3>No files yet</h3>
                <p>Faculty hasn't uploaded files to this material.</p>
              </div>
            ) : view === 'grid' ? (
              <div className="fm-grid">
                {files.map(file => {
                  const meta = getFileMeta(file.mimeType);
                  const sel  = selected === file._id;
                  return (
                    <div
                      key={file._id}
                      className={`fm-tile ${sel ? 'fm-tile--sel' : ''}`}
                      onClick={() => setSelected(file._id)}
                      onDoubleClick={() => file.driveFileId && setPreview(file)}
                      title={`${file.name}\n${fmtSize(file.size)}\nDouble-click to preview`}
                    >
                      <div className="fm-tile-icon" style={{ color: meta.color }}>{meta.icon}</div>
                      <div className="fm-tile-name">{file.name}</div>
                      <div className="fm-tile-size">{fmtSize(file.size)}</div>
                      <div className="fm-tile-actions">
                        {file.driveFileId && (
                          <button
                            className="fm-icon-btn fm-icon-btn--preview"
                            onClick={(e) => openPreview(e, file)}
                            title="Preview"
                          >👁️</button>
                        )}
                        <button
                          className="fm-icon-btn fm-icon-btn--dl"
                          onClick={(e) => handleDownload(e, file)}
                          title="Download"
                        >⬇️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="fm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(file => {
                    const meta = getFileMeta(file.mimeType);
                    const sel  = selected === file._id;
                    return (
                      <tr
                        key={file._id}
                        className={`fm-row ${sel ? 'fm-row--sel' : ''}`}
                        onClick={() => setSelected(file._id)}
                        onDoubleClick={() => file.driveFileId && setPreview(file)}
                      >
                        <td className="fm-td-name">
                          <span style={{ color: meta.color, fontSize: '1.2rem', marginRight: '0.5rem' }}>{meta.icon}</span>
                          <span className="fm-row-name">{file.name}</span>
                        </td>
                        <td>
                          <span className="fm-type-badge" style={{ background: meta.color + '20', color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="fm-td-meta">{fmtSize(file.size)}</td>
                        <td className="fm-td-meta">
                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="fm-row-actions">
                            {file.driveFileId && (
                              <button
                                className="fm-action-btn fm-action-btn--preview"
                                onClick={(e) => openPreview(e, file)}
                              >👁️ Preview</button>
                            )}
                            <button
                              className="fm-action-btn fm-action-btn--dl"
                              onClick={(e) => handleDownload(e, file)}
                            >⬇️ Download</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Status bar ── */}
          <div className="fm-statusbar">
            <span>{files.length} item{files.length !== 1 ? 's' : ''}</span>
            {selected && (() => {
              const f = files.find(x => x._id === selected);
              return f ? <span className="fm-status-sel">{f.name} — {fmtSize(f.size)}</span> : null;
            })()}
          </div>
        </div>
      </div>

      {preview && (
        <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
};

export default FileManager;
