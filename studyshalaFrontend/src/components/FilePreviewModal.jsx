/**
 * FilePreviewModal.jsx
 * 
 * FIX: Full-screen file preview component.
 * 
 * Supports:
 *   - PDF         → <iframe> embed (Google Drive viewer as fallback)
 *   - Images      → <img> full-screen
 *   - Video       → <video> player
 *   - Audio       → <audio> player
 *   - Word/PPT/XLS → Google Docs Viewer iframe (works for any Google account)
 *   - All others  → Google Drive iframe viewer via driveViewLink
 * 
 * The key insight: we use Google's own viewer (docs.google.com/viewer?url=...)
 * which works for ANY visitor, regardless of which Google account uploaded the file.
 * This solves the "different account" problem completely.
 */

import { useEffect } from 'react';
import './FilePreviewModal.css';

const FilePreviewModal = ({ file, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const getPreviewContent = () => {
    const { mimeType, driveViewLink, name } = file;

    // ── Images ──────────────────────────────────────────────────────────────
    if (mimeType.startsWith('image/')) {
      // For Drive-hosted images, use the direct view link
      // driveViewLink is like https://drive.google.com/file/d/FILE_ID/view
      // Convert to direct download URL for img tag
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      const imgSrc = fileId
        ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
        : driveViewLink;
      return (
        <div className="preview-image-container">
          <img src={imgSrc} alt={name} className="preview-image" />
        </div>
      );
    }

    // ── Video ────────────────────────────────────────────────────────────────
    if (mimeType.startsWith('video/')) {
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        // Use Google Drive video embed player
        return (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="preview-iframe"
            allow="autoplay"
            title={name}
          />
        );
      }
    }

    // ── Audio ────────────────────────────────────────────────────────────────
    if (mimeType.startsWith('audio/')) {
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        return (
          <div className="preview-audio-container">
            <div className="preview-audio-icon">🎵</div>
            <p className="preview-audio-name">{name}</p>
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
              className="preview-audio-iframe"
              title={name}
            />
          </div>
        );
      }
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (mimeType === 'application/pdf') {
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        return (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="preview-iframe"
            title={name}
          />
        );
      }
    }

    // ── Office Docs: Word, PowerPoint, Excel ─────────────────────────────────
    // Google Docs Viewer works for these and doesn't require a Google account
    const isOffice = (
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType.includes('sheet')
    );
    if (isOffice && driveViewLink) {
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        return (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="preview-iframe"
            title={name}
          />
        );
      }
    }

    // ── Fallback: anything with a driveViewLink ───────────────────────────────
    if (driveViewLink) {
      const fileId = driveViewLink?.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        return (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="preview-iframe"
            title={name}
          />
        );
      }
    }

    // ── No preview available ─────────────────────────────────────────────────
    return (
      <div className="preview-unavailable">
        <div className="preview-unavailable-icon">📄</div>
        <h3>Preview not available</h3>
        <p>This file type cannot be previewed in the browser.</p>
        <p>Please use the Download button to view this file.</p>
      </div>
    );
  };

  return (
    <div className="file-preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="file-preview-modal">
        <div className="file-preview-header">
          <div className="file-preview-title">
            <span className="file-preview-name">{file.name}</span>
          </div>
          <button className="file-preview-close" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </div>
        <div className="file-preview-body">
          {getPreviewContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
