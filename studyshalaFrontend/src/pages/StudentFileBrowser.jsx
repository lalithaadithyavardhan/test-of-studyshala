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
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [fullScreenFile, setFullScreenFile] = useState(null); // For double-click

  useEffect(() => {
    const fetchFilesAndDetails = async () => {
      try {
        setLoading(true);
        const fileRes = await api.get(`/student/materials/${id}/files`);
        const fetchedFiles = fileRes.data.files || [];
        setFiles(fetchedFiles);
        
        if (fetchedFiles.length > 0) {
          setPreviewFile(fetchedFiles[0]);
        }

        const savedRes = await api.get('/student/saved-materials');
        const allMaterials = savedRes.data.materials || [];
        const currentMaterial = allMaterials.find(m => m._id === id);
        
        if (currentMaterial) {
          setMaterial(currentMaterial);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFilesAndDetails();
  }, [id]);

  // Handle Selection
  const toggleSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]); 
    } else {
      setSelectedFiles(files.map(f => f._id || f.driveFileId));
    }
  };

  // Double Click handler for Full Screen
  const handleDoubleClick = (file) => {
    setFullScreenFile(file);
  };

  // Actions
  const handleDownloadSelected = async () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(f._id || f.driveFileId));
    
    for (let file of filesToDownload) {
      try {
        // Attempt backend proxy download
        const res = await api.get(`/student/materials/${id}/files/${file._id}/download`, {
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Backend download failed for ${file.name}, using fallback.`);
        // Fallback: Direct Google Drive download link
        if (file.driveFileId) {
          window.open(`https://drive.google.com/uc?export=download&id=${file.driveFileId}`, '_blank');
        } else {
          alert(`Failed to download ${file.name}`);
        }
      }
    }
  };

  const handleSaveToDrive = () => {
    alert(`Saving ${selectedFiles.length} files to your personal Google Drive.\n\n(Note: This requires Google Drive integration to be enabled on your account settings).`);
  };

  // Formatting helpers
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-GB'); 
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📕';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('word')) return '📘';
    if (mimeType?.includes('presentation')) return '📙';
    return '📄';
  };

  if (loading) return <div className="loading-screen">Loading Files...</div>;

  return (
    <div className="file-browser-layout">
      
      {/* LEFT PANE: File List */}
      <div className="file-list-pane">
        
        {/* Top Action Bar */}
        <div className="file-browser-header">
          <div className="breadcrumbs">
            <span onClick={() => navigate('/student/saved-materials')}>My Materials</span> 
            {' / '} 
            <span className="current-path">{material?.subjectName || 'Folder'}</span>
          </div>
          
          <div className="header-actions">
            <button className="btn-outline toggle-preview-btn" onClick={() => setShowPreviewPane(!showPreviewPane)}>
              {showPreviewPane ? 'Hide Preview 🗙' : 'Show Preview 👁️'}
            </button>
            <div className="action-divider"></div>
            <button className="btn-outline" onClick={handleSelectAll}>
              {selectedFiles.length === files.length && files.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              className="btn-outline" 
              disabled={selectedFiles.length === 0}
              onClick={handleDownloadSelected}
            >
              ⬇️ Download ({selectedFiles.length})
            </button>
            <button 
              className="btn-primary" 
              disabled={selectedFiles.length === 0}
              onClick={handleSaveToDrive}
            >
              💾 Save to Drive ({selectedFiles.length})
            </button>
          </div>
        </div>

        {/* File List Grid Details */}
        <div className="file-list-header">
          <div className="col-checkbox"></div>
          <div className="col-icon">Type</div>
          <div className="col-name">Name</div>
          <div className="col-date">Date Modified</div>
          <div className="col-size">Size</div>
        </div>

        {/* File List */}
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
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelection(fileId)}
                    />
                  </div>
                  
                  <div className="col-icon">
                    <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                  </div>
                  
                  <div className="col-name file-name">{file.name}</div>
                  <div className="col-date">{formatDate(file.uploadedAt)}</div>
                  <div className="col-size">{formatSize(file.size)}</div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer Stats */}
        <div className="file-browser-footer">
          <span>📁 {files.length} items</span>
          <span>✅ {selectedFiles.length} selected</span>
        </div>
      </div>

      {/* RIGHT PANE: Live Preview (Collapsible) */}
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
                  title="File Preview"
                  className="preview-iframe"
                  allow="autoplay"
                ></iframe>
              ) : (
                <div className="no-preview-available">
                  <div className="big-icon">{getFileIcon(previewFile.mimeType)}</div>
                  <p>Preview not available</p>
                </div>
              )}
              
              <div className="preview-details">
                <h4>{previewFile.name}</h4>
                <p><strong>Type:</strong> {previewFile.mimeType}</p>
                <p><strong>Size:</strong> {formatSize(previewFile.size)}</p>
              </div>
            </div>
          ) : (
            <div className="empty-preview">
              <p>Select a file to preview its contents here.</p>
            </div>
          )}
        </div>
      )}

      {/* FULL SCREEN MODAL (Opens on Double Click) */}
      {fullScreenFile && (
        <div className="full-screen-modal">
          <div className="full-screen-header">
            <div className="full-screen-title">
              {getFileIcon(fullScreenFile.mimeType)} {fullScreenFile.name}
            </div>
            <button className="full-screen-close" onClick={() => setFullScreenFile(null)}>Close ✕</button>
          </div>
          <div className="full-screen-body">
            {fullScreenFile.driveFileId ? (
              <iframe 
                src={`https://drive.google.com/file/d/${fullScreenFile.driveFileId}/preview`} 
                title="Full Screen Preview"
                className="full-screen-iframe"
              ></iframe>
            ) : (
              <div className="no-preview-available">Preview not supported for this file type.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentFileBrowser;
