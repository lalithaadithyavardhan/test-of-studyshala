/**
 * FilePreviewModal
 * ================
 * Full-screen preview using Google Drive's /preview embed.
 * Works for PDF, Word, PowerPoint, Excel, images, video, audio.
 *
 * IMPORTANT: Uses Google Drive's built-in viewer — no Axios, no fetch,
 * no file data passes through our server. Pure browser→Drive communication.
 *
 * All files have anyoneWithLink reader access, so the iframe loads
 * without any login requirement for the student.
 */
import { useEffect } from 'react';
import './FilePreviewModal.css';

const FilePreviewModal = ({ file, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const renderBody = () => {
    if (!file.driveFileId) {
      return (
        <div className="fpv-unavail">
          <span className="fpv-unavail-icon">📄</span>
          <h3>Preview not available</h3>
          <p>This file has no Drive ID. Ask your faculty to re-upload it.</p>
        </div>
      );
    }

    // Images — use Drive thumbnail API for faster inline display
    if (file.mimeType?.startsWith('image/')) {
      return (
        <div className="fpv-img-wrap">
          <img
            src={`https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w2000`}
            alt={file.name}
            className="fpv-img"
          />
        </div>
      );
    }

    // Everything else: PDF, Word, PPT, Excel, video, audio — Drive /preview iframe
    const src = file.previewUrl || `https://drive.google.com/file/d/${file.driveFileId}/preview`;
    return (
      <iframe
        src={src}
        className="fpv-iframe"
        allow="autoplay"
        title={file.name}
      />
    );
  };

  return (
    <div
      className="fpv-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fpv-modal">
        <div className="fpv-header">
          <span className="fpv-filename" title={file.name}>{file.name}</span>
          {file.downloadUrl && (
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fpv-dl-btn"
              title="Download file"
            >
              ⬇️ Download
            </a>
          )}
          <button className="fpv-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>
        <div className="fpv-body">{renderBody()}</div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
