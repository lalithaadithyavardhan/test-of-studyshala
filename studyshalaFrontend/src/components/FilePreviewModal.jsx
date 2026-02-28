/**
 * FilePreviewModal — full-screen preview
 * Uses Google Drive's /preview embed which works for any visitor (no login needed).
 * Supports: PDF, Word, PPT, Excel, images, video, audio.
 */
import { useEffect } from 'react';
import './FilePreviewModal.css';

const FilePreviewModal = ({ file, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const renderContent = () => {
    const { driveFileId, previewUrl, mimeType, name } = file;

    if (!driveFileId) return (
      <div className="fpv-unavail">
        <span className="fpv-unavail-icon">📄</span>
        <h3>Preview not available</h3>
        <p>This file has no Drive ID. Ask your faculty to re-upload it.</p>
      </div>
    );

    // Images — show thumbnail directly (avoids iframe login prompt on some browsers)
    if (mimeType?.startsWith('image/')) return (
      <div className="fpv-img-wrap">
        <img
          src={`https://drive.google.com/thumbnail?id=${driveFileId}&sz=w2000`}
          alt={name}
          className="fpv-img"
        />
      </div>
    );

    // Everything else: PDF, video, audio, Word, PPT, Excel → Drive /preview iframe
    return (
      <iframe
        src={previewUrl || `https://drive.google.com/file/d/${driveFileId}/preview`}
        className="fpv-iframe"
        allow="autoplay"
        title={name}
      />
    );
  };

  return (
    <div className="fpv-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fpv-modal">
        <div className="fpv-header">
          <span className="fpv-name" title={file.name}>{file.name}</span>
          <button className="fpv-close" onClick={onClose}>✕</button>
        </div>
        <div className="fpv-body">{renderContent()}</div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
