/**
 * FileManager — desktop-style full-screen file browser
 *
 * - Grid view (tiles) and List view toggle
 * - Single-click = select, Double-click = full-screen preview
 * - Download button opens Drive direct link (new tab, no proxy needed)
 * - Keyboard: Escape closes, Enter previews selected file
 */
import { useState, useEffect } from 'react';
import FilePreviewModal from './FilePreviewModal';
import './FileManager.css';

const META = {
  'application/pdf':        { icon: '📕', color: '#ef4444', label: 'PDF'   },
  'application/msword':     { icon: '📘', color: '#3b82f6', label: 'Word'  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📘', color: '#3b82f6', label: 'Word' },
  'application/vnd.ms-powerpoint': { icon: '📙', color: '#f97316', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📙', color: '#f97316', label: 'PPT' },
  'application/vnd.ms-excel':      { icon: '📊', color: '#22c55e', label: 'Excel' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', color: '#22c55e', label: 'Excel' },
  'text/plain':             { icon: '📄', color: '#64748b', label: 'Text'  },
  'application/zip':        { icon: '🗜️', color: '#a855f7', label: 'ZIP'   },
};

const fileMeta = (mime) => {
  if (META[mime]) return META[mime];
  if (mime?.startsWith('image/'))  return { icon: '🖼️', color: '#06b6d4', label: 'Image' };
  if (mime?.startsWith('video/'))  return { icon: '🎥', color: '#8b5cf6', label: 'Video' };
  if (mime?.startsWith('audio/'))  return { icon: '🎵', color: '#ec4899', label: 'Audio' };
  return { icon: '📄', color: '#64748b', label: 'File' };
};

const fmtSize = (b) => {
  if (!b) return '—';
  const u = ['B','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(1024));
  return (b/1024**i).toFixed(1)+' '+u[i];
};

const FileManager = ({ files = [], materialName = 'Files', onClose }) => {
  const [view,     setView]     = useState('grid');
  const [selected, setSelected] = useState(null);
  const [preview,  setPreview]  = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (preview) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && selected) {
        const f = files.find(x => x._id === selected);
        if (f?.driveFileId) setPreview(f);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [selected, preview, onClose, files]);

  const download = (e, file) => {
    e.stopPropagation();
    if (!file.downloadUrl) { alert('No download URL. Ask faculty to re-upload.'); return; }
    window.open(file.downloadUrl, '_blank', 'noopener');
  };

  return (
    <>
      <div className="fm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="fm-window">

          {/* ── Title bar ── */}
          <div className="fm-titlebar">
            <div className="fm-titlebar-left">
              <span>📁</span>
              <span className="fm-title">{materialName}</span>
              <span className="fm-badge-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="fm-titlebar-right">
              <button className={`fm-view-btn ${view==='grid'?'active':''}`} onClick={() => setView('grid')} title="Grid">⊞</button>
              <button className={`fm-view-btn ${view==='list'?'active':''}`} onClick={() => setView('list')} title="List">☰</button>
              <button className="fm-close-btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* ── Hint bar ── */}
          <div className="fm-hintbar">
            {selected
              ? `"${files.find(f=>f._id===selected)?.name}" — press Enter to preview, or use the buttons`
              : 'Click to select  •  Double-click to preview  •  ⬇️ to download'}
          </div>

          {/* ── File area ── */}
          <div className="fm-body">
            {files.length === 0 ? (
              <div className="fm-empty">
                <span style={{fontSize:'3rem'}}>📭</span>
                <h3>No files yet</h3>
                <p>Faculty hasn't uploaded files to this material.</p>
              </div>
            ) : view === 'grid' ? (
              <div className="fm-grid">
                {files.map(file => {
                  const m = fileMeta(file.mimeType);
                  const sel = selected === file._id;
                  return (
                    <div
                      key={file._id}
                      className={`fm-tile ${sel ? 'fm-tile--sel' : ''}`}
                      onClick={() => setSelected(file._id)}
                      onDoubleClick={() => file.driveFileId && setPreview(file)}
                      title={`${file.name}\n${fmtSize(file.size)}\nDouble-click to preview`}
                    >
                      <div className="fm-tile-icon" style={{color: m.color}}>{m.icon}</div>
                      <div className="fm-tile-name">{file.name}</div>
                      <div className="fm-tile-size">{fmtSize(file.size)}</div>
                      <div className="fm-tile-btns">
                        {file.driveFileId && (
                          <button className="fm-btn fm-btn--preview"
                            onClick={(e) => { e.stopPropagation(); setPreview(file); }}
                            title="Preview">👁️</button>
                        )}
                        <button className="fm-btn fm-btn--dl"
                          onClick={(e) => download(e, file)}
                          title="Download">⬇️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="fm-table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {files.map(file => {
                    const m = fileMeta(file.mimeType);
                    const sel = selected === file._id;
                    return (
                      <tr key={file._id}
                        className={`fm-row ${sel ? 'fm-row--sel' : ''}`}
                        onClick={() => setSelected(file._id)}
                        onDoubleClick={() => file.driveFileId && setPreview(file)}>
                        <td className="fm-td-name">
                          <span style={{color:m.color,fontSize:'1.2rem',marginRight:'0.5rem'}}>{m.icon}</span>
                          <span className="fm-row-filename">{file.name}</span>
                        </td>
                        <td>
                          <span className="fm-type-badge" style={{background:m.color+'20',color:m.color}}>{m.label}</span>
                        </td>
                        <td style={{color:'#64748b',fontSize:'0.82rem',whiteSpace:'nowrap'}}>{fmtSize(file.size)}</td>
                        <td style={{color:'#64748b',fontSize:'0.82rem',whiteSpace:'nowrap'}}>
                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="fm-row-actions">
                            {file.driveFileId && (
                              <button className="fm-action-btn fm-action-btn--preview"
                                onClick={(e) => { e.stopPropagation(); setPreview(file); }}>
                                👁️ Preview
                              </button>
                            )}
                            <button className="fm-action-btn fm-action-btn--dl"
                              onClick={(e) => download(e, file)}>
                              ⬇️ Download
                            </button>
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
            <span>{files.length} items</span>
            {selected && (() => {
              const f = files.find(x => x._id === selected);
              return f ? <span className="fm-status-sel">{f.name} — {fmtSize(f.size)}</span> : null;
            })()}
          </div>
        </div>
      </div>

      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </>
  );
};

export default FileManager;
