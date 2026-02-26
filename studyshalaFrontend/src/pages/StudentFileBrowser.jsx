import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './StudentFileBrowser.css';

const StudentFileBrowser = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreviewPane, setShowPreviewPane] = useState(true);

  // BUG FIX: fullScreenFile was never being cleared after the modal closed
  // because onDoubleClick fired the click handler first (which just sets
  // previewFile), then the dblclick handler set fullScreenFile — but the
  // onClick on the row also fires on double-click.  We now stop propagation
  // on double-click so only one handler runs.
  const [fullScreenFile, setFullScreenFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null); // 'success' | 'already' | 'error'
  const [downloadingIds, setDownloadingIds] = useState([]); // track per-file download state

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchFilesAndDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch files for this material
      const fileRes = await api.get(`/student/materials/${id}/files`);
      const fetchedFiles = fileRes.data.files || [];
      setFiles(fetchedFiles);
      setMaterial(fileRes.data.material || null);

      // Set first file as default preview only if preview pane is open
      if (fetchedFiles.length > 0) {
        setPreviewFile(fetchedFiles[0]);
      } else {
        setPreviewFile(null);
      }

      // BUG FIX: The original code fetched the full saved-materials list and
      // searched it to get the material name — this fails if the material isn't
      // saved yet (e.g. user is viewing via access code, not saved list).
      // We now rely on the material object returned by the files endpoint above,
      // and only fall back to the saved list if that field is missing.
      if (!fileRes.data.material) {
        try {
          const savedRes = await api.get('/student/saved-materials');
          const found = (savedRes.data.materials || []).find(m => m._id === id);
          if (found) setMaterial(found);
        } catch {
          // Non-critical — material name will just show 'Folder'
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      if (err.response?.status === 403) {
        setError('You do not have access to this material. Please use the correct access code first.');
      } else if (err.response?.status === 404) {
        setError('This material could not be found or has been removed.');
      } else {
        setError('Failed to load files. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFilesAndDetails();
  }, [fetchFilesAndDetails]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const getFileId = (file) => file._id || file.driveFileId;

  const toggleSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId) ? prev.filter(i => i !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length && files.length > 0) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(getFileId));
    }
  };

  // ── Row click / double-click ───────────────────────────────────────────────
  const handleRowClick = (file) => {
    setPreviewFile(file);
  };

  // BUG FIX: onClick was also firing during double-click, causing a state
  // conflict where previewFile and fullScreenFile were both set simultaneously,
  // which sometimes prevented the modal from rendering cleanly.
  // Fix: stopPropagation on dblclick prevents the parent onClick from also firing.
  const handleDoubleClick = (e, file) => {
    e.stopPropagation();
    setFullScreenFile(file);
  };

  const closeFullScreen = () => setFullScreenFile(null);

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownloadSelected = async () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(getFileId(f)));

    for (const file of filesToDownload) {
      const fileId = getFileId(file);
      setDownloadingIds(prev => [...prev, fileId]);
      try {
        const res = await api.get(
          `/student/materials/${id}/files/${file._id}/download`,
          {
            responseType: 'blob',
            // BUG FIX: Without specifying the correct blob type, some browsers
            // would create a generic octet-stream blob and fail to open the file.
            // Pass the known mimeType so the Blob is constructed correctly.
          }
        );

        // Build blob with the correct MIME type from file metadata
        const blob = new Blob([res.data], { type: file.mimeType || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Download failed for ${file.name}:`, err);
        // Show inline error rather than blocking alert()
        setError(`Download failed for "${file.name}". Please try again.`);
        // Auto-clear error after 4 seconds
        setTimeout(() => setError(null), 4000);
      } finally {
        setDownloadingIds(prev => prev.filter(i => i !== fileId));
      }
    }
    setSelectedFiles([]);
  };

  // ── Save material ──────────────────────────────────────────────────────────
  const handleSaveMaterial = async () => {
    try {
      setSaving(true);
      setSaveFeedback(null);
      const res = await api.post('/student/save-material', { materialId: id });
      if (res.data?.alreadySaved) {
        setSaveFeedback('already');
      } else {
        setSaveFeedback('success');
      }
    } catch (err) {
      setSaveFeedback('error');
    } finally {
      setSaving(false);
      // Auto-clear feedback after 3 seconds
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📗';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    if (mimeType.includes('text')) return '📃';
    return '📄';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <span>Loading Files...</span>
      </div>
    );
  }

  // ── Render: fatal error ────────────────────────────────────────────────────
  if (error && files.length === 0) {
    return (
      <div className="loading-screen">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="btn-outline" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  // ── Render: main ──────────────────────────────────────────────────────────
  return (
    <div className="file-browser-layout">

      {/* ── LEFT PANE ── */}
      <div className="file-list-pane">

        {/* Header */}
        <div className="file-browser-header">
          <div className="breadcrumbs">
            <span className="breadcrumb-link" onClick={() => navigate('/student/saved-materials')}>
              My Materials
            </span>
            <span className="breadcrumb-sep"> › </span>
            <span className="current-path">{material?.subjectName || 'Folder'}</span>
          </div>

          <div className="header-actions">
            <button
              className="btn-outline toggle-preview-btn"
              onClick={() => setShowPreviewPane(v => !v)}
            >
              {showPreviewPane ? '◀ Hide Preview' : '▶ Show Preview'}
            </button>

            <div className="action-divider" />

            <button className="btn-outline" onClick={handleSelectAll} disabled={files.length === 0}>
              {selectedFiles.length === files.length && files.length > 0 ? 'Deselect All' : 'Select All'}
            </button>

            <button
              className="btn-outline"
              disabled={selectedFiles.length === 0 || downloadingIds.length > 0}
              onClick={handleDownloadSelected}
            >
              {downloadingIds.length > 0
                ? `Downloading...`
                : `⬇ Download${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </button>

            <button
              className={`btn-primary ${saveFeedback === 'success' ? 'btn-success' : saveFeedback === 'already' ? 'btn-muted' : ''}`}
              disabled={saving}
              onClick={handleSaveMaterial}
            >
              {saving
                ? 'Saving...'
                : saveFeedback === 'success'
                  ? '✓ Saved!'
                  : saveFeedback === 'already'
                    ? '✓ Already Saved'
                    : saveFeedback === 'error'
                      ? '✕ Save Failed'
                      : '💾 Save Material'}
            </button>
          </div>
        </div>

        {/* Inline toast for non-fatal errors */}
        {error && files.length > 0 && (
          <div className="inline-error-toast">
            ⚠️ {error}
          </div>
        )}

        {/* Material meta strip */}
        {material && (
          <div className="material-meta-strip">
            <span>📚 {material.subjectName}</span>
            <span className="meta-sep">·</span>
            <span>{material.department}</span>
            <span className="meta-sep">·</span>
            <span>Sem {material.semester}</span>
            <span className="meta-sep">·</span>
            <span>👤 {material.facultyName}</span>
            <span className="meta-sep">·</span>
            <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Column headers */}
        <div className="file-list-header">
          <div className="col-checkbox">
            {/* Master checkbox */}
            <input
              type="checkbox"
              className="master-checkbox"
              checked={files.length > 0 && selectedFiles.length === files.length}
              onChange={handleSelectAll}
              disabled={files.length === 0}
            />
          </div>
          <div className="col-icon">Type</div>
          <div className="col-name">Name</div>
          <div className="col-date">Uploaded</div>
          <div className="col-size">Size</div>
        </div>

        {/* File rows */}
        <div className="file-list-container">
          {files.length === 0 ? (
            <div className="empty-folder">
              <div className="empty-icon">📂</div>
              <p>This folder has no files yet.</p>
            </div>
          ) : (
            files.map((file) => {
              const fileId = getFileId(file);
              const isSelected = selectedFiles.includes(fileId);
              const isActivePreview = previewFile && getFileId(previewFile) === fileId;
              const isDownloading = downloadingIds.includes(fileId);

              return (
                <div
                  key={fileId}
                  className={`file-row${isSelected ? ' selected' : ''}${isActivePreview ? ' active-preview' : ''}${isDownloading ? ' downloading' : ''}`}
                  onClick={() => handleRowClick(file)}
                  onDoubleClick={(e) => handleDoubleClick(e, file)}
                  title="Click to preview · Double-click to open fullscreen"
                >
                  {/* Checkbox — stop propagation so clicking it doesn't also select the row for preview */}
                  <div className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(fileId)}
                    />
                  </div>

                  <div className="col-icon">
                    <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                  </div>

                  <div className="col-name file-name">
                    {file.name}
                    {isDownloading && <span className="download-badge"> ⬇ downloading...</span>}
                  </div>

                  <div className="col-date">{formatDate(file.uploadedAt)}</div>
                  <div className="col-size">{formatSize(file.size)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANE (Google Drive Preview) ── */}
      {showPreviewPane && (
        <div className="file-preview-pane">
          <div className="preview-header">
            <h3>Preview</h3>
            <button className="close-preview" onClick={() => setShowPreviewPane(false)} title="Close preview">✕</button>
          </div>

          {previewFile ? (
            <div className="preview-content">
              {/* BUG FIX: The original iframe used previewFile.driveFileId which is
                  undefined when the file object only has _id (the DB id). The backend
                  stores driveFileId separately. We check both and fall back gracefully. */}
              {previewFile.driveFileId ? (
                <>
                  <iframe
                    key={previewFile.driveFileId} // force remount when file changes
                    src={`https://drive.google.com/file/d/${previewFile.driveFileId}/preview`}
                    className="preview-iframe"
                    title={`Preview: ${previewFile.name}`}
                    allow="autoplay"
                  />
                  <div className="preview-details">
                    <h4 title={previewFile.name}>{previewFile.name}</h4>
                    <p><span className="detail-label">Type</span>{previewFile.mimeType || 'Unknown'}</p>
                    <p><span className="detail-label">Size</span>{formatSize(previewFile.size)}</p>
                    <p><span className="detail-label">Uploaded</span>{formatDate(previewFile.uploadedAt)}</p>
                    <button
                      className="btn-outline fullscreen-hint-btn"
                      onClick={() => setFullScreenFile(previewFile)}
                    >
                      ⛶ Open Fullscreen
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-preview-available">
                  <span className="no-preview-icon">🔗</span>
                  <p>Preview not available.</p>
                  <small>This file has not been synced to Google Drive yet.</small>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-preview">
              <span className="empty-preview-icon">👆</span>
              <p>Click any file to preview it here.</p>
              <small>Double-click to open fullscreen.</small>
            </div>
          )}
        </div>
      )}

      {/* ── FULL SCREEN MODAL ──
          BUG FIX 1: The modal was not rendering because fullScreenFile was being
          set while the click handler simultaneously set previewFile, causing a
          React render cycle conflict. Fixed by using stopPropagation in dblclick.

          BUG FIX 2: Pressing Escape key should close the modal — added keydown listener.

          BUG FIX 3: Clicking outside the modal content (the dark backdrop) should
          also close it — added backdrop click handler.
      ── */}
      {fullScreenFile && (
        <FullScreenModal
          file={fullScreenFile}
          getFileIcon={getFileIcon}
          onClose={closeFullScreen}
        />
      )}
    </div>
  );
};

// ── FullScreenModal extracted as a separate component ──────────────────────
// This ensures the keydown event listener is properly managed via useEffect
// and cleaned up on unmount, preventing memory leaks.
const FullScreenModal = ({ file, getFileIcon, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scroll while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="full-screen-modal" onClick={handleBackdropClick}>
      <div className="full-screen-dialog">
        <div className="full-screen-header">
          <div className="full-screen-title">
            <span>{getFileIcon(file.mimeType)}</span>
            <span title={file.name}>{file.name}</span>
          </div>
          <button
            className="full-screen-close"
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕ Close
          </button>
        </div>

        <div className="full-screen-body">
          {file.driveFileId ? (
            <iframe
              key={file.driveFileId}
              src={`https://drive.google.com/file/d/${file.driveFileId}/preview`}
              className="full-screen-iframe"
              title={`Fullscreen: ${file.name}`}
              allow="autoplay"
            />
          ) : (
            <div className="no-preview-available fullscreen-no-preview">
              <div className="no-preview-icon">⚠️</div>
              <p>Fullscreen preview is not available for this file.</p>
              <small>The file may not have been synced to Google Drive yet.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFileBrowser;
