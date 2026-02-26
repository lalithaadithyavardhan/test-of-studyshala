import React, { useState, useEffect } from 'react';
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
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [fullScreenFile, setFullScreenFile] = useState(null);

  useEffect(() => {
    const fetchFilesAndDetails = async () => {
      try {
        setLoading(true);
        const fileRes = await api.get(`/student/materials/${id}/files`);
        setFiles(fileRes.data.files || []);
        
        if (fileRes.data.files.length > 0) {
          setPreviewFile(fileRes.data.files[0]);
        }

        const savedRes = await api.get('/student/saved-materials');
        const currentMaterial = (savedRes.data.materials || []).find(m => m._id === id);
        if (currentMaterial) setMaterial(currentMaterial);

      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilesAndDetails();
  }, [id]);

  const toggleSelection = (fileId) => {
    setSelectedFiles(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) setSelectedFiles([]); 
    else setSelectedFiles(files.map(f => f._id || f.driveFileId));
  };

  // FIXED: Double-Click opens Google's native secure viewer for all file types
  const handleDoubleClick = (file) => {
    setFullScreenFile(file);
  };

  // FIXED: Bypass Backend to avoid 500 errors. Download directly from Google Drive.
  const handleDownloadSelected = () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(f._id || f.driveFileId));
    
    filesToDownload.forEach(file => {
      if (file.driveFileId) {
        // Direct Google Drive download link
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
        window.open(downloadUrl, '_blank');
      } else {
        alert(`Cannot download ${file.name} - File not synced to Drive properly.`);
      }
    });
    
    // Deselect after downloading
    setSelectedFiles([]);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📄';
  };

  if (loading) return <div className="loading-screen">Loading Files...</div>;

  return (
    <div className="file-browser-layout">
      {/* LEFT PANE: File List */}
      <div className="file-list-pane">
        <div className="file-browser-header">
          <div className="breadcrumbs">
            <span onClick={() => navigate('/student/saved-materials')}>My Materials</span> 
            {' > '} <span className="current-path">{material?.subjectName || 'Folder'}</span>
          </div>
          <div className="header-actions">
            <button className="btn-outline toggle-preview-btn" onClick={() => setShowPreviewPane(!showPreviewPane)}>
              {showPreviewPane ? 'Hide Preview ✕' : 'Show Preview 👁️'}
            </button>
            <div className="action-divider"></div>
            <button className="btn-outline" onClick={handleSelectAll}>
              {selectedFiles.length === files.length && files.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button className="btn-primary" disabled={selectedFiles.length === 0} onClick={handleDownloadSelected}>
              ⬇️ Download ({selectedFiles.length})
            </button>
          </div>
        </div>

        <div className="file-list-header">
          <div className="col-checkbox"></div>
          <div className="col-icon">Type</div>
          <div className="col-name">Name</div>
          <div className="col-date">Uploaded</div>
          <div className="col-size">Size</div>
        </div>

        <div className="file-list-container">
          {files.length === 0 ? (
            <div className="empty-folder">
              <div className="empty-icon">📭</div>
              <h2>This folder is empty</h2>
            </div>
          ) : (
            files.map((file) => {
              const fileId = file._id || file.driveFileId;
              const isSelected = selectedFiles.includes(fileId);
              const isPreviewing = previewFile?._id === file._id;

              return (
                <div 
                  key={fileId} 
                  className={`file-row ${isSelected ? 'selected' : ''} ${isPreviewing && showPreviewPane ? 'active-preview' : ''}`}
                  onClick={() => setPreviewFile(file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  title="Double click to open full screen"
                >
                  <div className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(fileId)}/>
                  </div>
                  <div className="col-icon"><span className="file-icon">{getFileIcon(file.mimeType)}</span></div>
                  <div className="col-name file-name">{file.name}</div>
                  <div className="col-date">{new Date(file.uploadedAt).toLocaleDateString()}</div>
                  <div className="col-size">{formatSize(file.size)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Live Preview */}
      {showPreviewPane && (
        <div className="file-preview-pane">
          <div className="preview-header">
            <h3>Preview</h3>
            <button className="close-preview" onClick={() => setShowPreviewPane(false)}>✕</button>
          </div>
          {previewFile ? (
            <div className="preview-content">
              {previewFile.driveFileId ? (
                <iframe 
                  src={`https://drive.google.com/file/d/${previewFile.driveFileId}/preview`} 
                  className="preview-iframe"
                  allow="autoplay"
                  title="File Preview"
                ></iframe>
              ) : (
                <div className="no-preview-available">File missing from Drive</div>
              )}
              <div className="preview-details">
                <h4>{previewFile.name}</h4>
                <p><strong>Size:</strong> {formatSize(previewFile.size)}</p>
                <p><strong>Type:</strong> {previewFile.mimeType ? previewFile.mimeType.split('/')[1] : 'Unknown'}</p>
              </div>
            </div>
          ) : (
            <div className="empty-preview"><p>Select a file to preview.</p></div>
          )}
        </div>
      )}

      {/* FULL SCREEN MODAL */}
      {fullScreenFile && (
        <div className="full-screen-modal">
          <div className="full-screen-header">
            <div className="full-screen-title">{getFileIcon(fullScreenFile.mimeType)} {fullScreenFile.name}</div>
            <button className="full-screen-close" onClick={() => setFullScreenFile(null)}>Close ✕</button>
          </div>
          <div className="full-screen-body">
            {fullScreenFile.driveFileId ? (
              <iframe 
                src={`https://drive.google.com/file/d/${fullScreenFile.driveFileId}/preview`} 
                className="full-screen-iframe"
                allow="autoplay"
                title="Full Screen Preview"
              ></iframe>
            ) : (
              <div className="no-preview-available">Preview not supported for this file.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentFileBrowser;
