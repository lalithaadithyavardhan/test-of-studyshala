/**
 * FileManager  v2
 * ===============
 * Now supports nested sub-folders.
 *
 * Props:
 *   files        — root-level files array
 *   subFolders   — array of { _id, name, files[] }
 *   materialName — title shown in the header
 *   onClose      — called when user closes the manager
 *
 * Navigation:
 *   Level 0: shows sub-folder tiles + root files
 *   Level 1: shows files inside a selected sub-folder (back button returns to level 0)
 */
import { useState, useEffect } from 'react';
import FilePreviewModal from './FilePreviewModal';
import {
  MdGridView, MdViewList, MdClose, MdFolder, MdFolderOpen,
  MdVisibility, MdDownload, MdArrowBack
} from 'react-icons/md';
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

const FileManager = ({ files = [], subFolders = [], materialName = 'Files', onClose }) => {
  const [view,           setView]           = useState('grid');
  const [selected,       setSelected]       = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [openSubFolder,  setOpenSubFolder]  = useState(null);  // sub-folder object currently open

  const hasSubFolders = subFolders.length > 0;
  const hasRootFiles  = files.length > 0;

  // Files shown in current context
  const currentFiles = openSubFolder ? (openSubFolder.files || []) : files;

  // Total count for header badge
  const totalCount = files.length + subFolders.reduce((s, sf) => s + (sf.files?.length || 0), 0);

  useEffect(() => {
    const handler = (e) => {
      if (preview) return;
      if (e.key === 'Escape') {
        if (openSubFolder) { setOpenSubFolder(null); setSelected(null); }
        else               { onClose(); }
      }
      if (e.key === 'Enter' && selected) {
        const f = currentFiles.find(x => x._id === selected);
        if (f?.driveFileId) setPreview(f);
      }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [selected, preview, onClose, currentFiles, openSubFolder]);

  const handleDownload = (e, file) => {
    e.stopPropagation();
    if (!file.downloadUrl) { alert('No download URL. Ask your faculty to re-upload this file.'); return; }
    window.open(file.downloadUrl, '_blank', 'noopener');
  };

  const openPreview = (e, file) => {
    e.stopPropagation();
    if (file.driveFileId) setPreview(file);
  };

  const enterSubFolder = (sf) => {
    setOpenSubFolder(sf);
    setSelected(null);
  };

  const goBack = () => {
    setOpenSubFolder(null);
    setSelected(null);
  };

  // ── File grid ──────────────────────────────────────────────────────────
  const renderFileGrid = (fileList) => (
    <div className="fm-grid">
      {fileList.map(file => {
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
                <button className="fm-icon-btn fm-icon-btn--preview" onClick={(e) => openPreview(e, file)} title="Preview">
                  <MdVisibility />
                </button>
              )}
              <button className="fm-icon-btn fm-icon-btn--dl" onClick={(e) => handleDownload(e, file)} title="Download">
                <MdDownload />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── File list ──────────────────────────────────────────────────────────
  const renderFileList = (fileList) => (
    <table className="fm-table">
      <thead>
        <tr>
          <th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {fileList.map(file => {
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
              <td><span className="fm-type-badge" style={{ background: meta.color + '20', color: meta.color }}>{meta.label}</span></td>
              <td className="fm-td-meta">{fmtSize(file.size)}</td>
              <td className="fm-td-meta">{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '—'}</td>
              <td>
                <div className="fm-row-actions">
                  {file.driveFileId && (
                    <button className="fm-action-btn fm-action-btn--preview" onClick={(e) => openPreview(e, file)}>
                      <MdVisibility /> Preview
                    </button>
                  )}
                  <button className="fm-action-btn fm-action-btn--dl" onClick={(e) => handleDownload(e, file)}>
                    <MdDownload /> Download
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // ── Root level: sub-folder tiles + root files ─────────────────────────
  const renderRoot = () => (
    <>
      {/* Sub-folder tiles */}
      {hasSubFolders && (
        <div className="fm-section">
          <div className="fm-section-label">📁 Folders</div>
          <div className="fm-subfolder-grid">
            {subFolders.map(sf => (
              <div
                key={sf._id}
                className="fm-subfolder-tile"
                onClick={() => enterSubFolder(sf)}
                title={`Open ${sf.name}`}
              >
                <MdFolder className="fm-subfolder-icon" />
                <div className="fm-subfolder-name">{sf.name}</div>
                <div className="fm-subfolder-count">{sf.files?.length || 0} file{sf.files?.length !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Root files */}
      {hasRootFiles && (
        <div className="fm-section">
          {hasSubFolders && <div className="fm-section-label">📄 Files</div>}
          {view === 'grid' ? renderFileGrid(files) : renderFileList(files)}
        </div>
      )}

      {/* Empty state */}
      {!hasSubFolders && !hasRootFiles && (
        <div className="fm-empty">
          <span style={{ fontSize: '3rem', color: '#94a3b8' }}>📭</span>
          <h3>No files yet</h3>
          <p>Faculty hasn't uploaded files to this material.</p>
        </div>
      )}
    </>
  );

  // ── Sub-folder level ──────────────────────────────────────────────────
  const renderSubFolderContents = () => {
    const sfFiles = openSubFolder.files || [];
    return (
      <>
        <div className="fm-subfolder-header">
          <button className="fm-back-btn" onClick={goBack}>
            <MdArrowBack /> Back
          </button>
          <span className="fm-subfolder-title">
            <MdFolderOpen style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
            {openSubFolder.name}
          </span>
          <span className="fm-count-badge" style={{ marginLeft: '0.5rem' }}>
            {sfFiles.length} file{sfFiles.length !== 1 ? 's' : ''}
          </span>
        </div>
        {sfFiles.length === 0 ? (
          <div className="fm-empty">
            <span style={{ fontSize: '3rem', color: '#94a3b8' }}>📁</span>
            <h3>Empty folder</h3>
            <p>This folder has no files yet.</p>
          </div>
        ) : view === 'grid' ? renderFileGrid(sfFiles) : renderFileList(sfFiles)}
      </>
    );
  };

  return (
    <>
      <div className="fm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="fm-window">

          {/* ── Title bar ── */}
          <div className="fm-titlebar">
            <div className="fm-titlebar-left">
              <MdFolder />
              <span className="fm-title">{materialName}</span>
              <span className="fm-count-badge">{totalCount} file{totalCount !== 1 ? 's' : ''}</span>
              {hasSubFolders && !openSubFolder && (
                <span className="fm-count-badge" style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                  {subFolders.length} folder{subFolders.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="fm-titlebar-right">
              <button className={`fm-view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid view"><MdGridView /></button>
              <button className={`fm-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List view"><MdViewList /></button>
              <button className="fm-close-btn" onClick={onClose} title="Close (Esc)"><MdClose /></button>
            </div>
          </div>

          {/* ── Breadcrumb / hint bar ── */}
          <div className="fm-hintbar">
            {openSubFolder ? (
              <span>
                <span style={{ opacity: 0.6 }}>📁 {materialName}</span>
                <span style={{ opacity: 0.5, margin: '0 0.4rem' }}>›</span>
                <span style={{ fontWeight: 600 }}>📂 {openSubFolder.name}</span>
              </span>
            ) : selected ? (
              `"${currentFiles.find(f => f._id === selected)?.name}" — press Enter to preview`
            ) : (
              'Click to select  •  Double-click to preview  •  ⬇ to download'
            )}
          </div>

          {/* ── Body ── */}
          <div className="fm-body">
            {openSubFolder ? renderSubFolderContents() : renderRoot()}
          </div>

          {/* ── Status bar ── */}
          <div className="fm-statusbar">
            <span>{openSubFolder ? `${openSubFolder.name} — ${openSubFolder.files?.length || 0} items` : `${totalCount} total item${totalCount !== 1 ? 's' : ''}`}</span>
            {selected && (() => {
              const f = currentFiles.find(x => x._id === selected);
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
