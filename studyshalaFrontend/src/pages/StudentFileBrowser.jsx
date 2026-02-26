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
  
  // New States for robust Full Screen Preview
  const [fullScreenFile, setFullScreenFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingBlob, setLoadingBlob] = useState(false);

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

  // 🚀 FIXED: Robust Double Click Viewer
  const handleDoubleClick = async (file) => {
    setFullScreenFile(file);
    setBlobUrl(null);
    
    // If image or PDF, fetch blob directly to bypass Google Drive iframe blocks!
    if (file.mimeType?.includes('image') || file.mimeType?.includes('pdf')) {
      try {
        setLoadingBlob(true);
        const res = await api.get(`/student/materials/${id}/files/${file._id}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
        setBlobUrl(url);
      } catch (err) {
        console.error("Failed to load native preview", err);
      } finally {
        setLoadingBlob(false);
      }
    }
  };

  const closeFullScreen = () => {
    setFullScreenFile(null);
    if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
  };

  const handleDownloadSelected = async () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(f._id || f.driveFileId));
    for (let file of filesToDownload) {
      try {
        const res = await api.get(`/student/materials/${id}/files/${file._id}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        if (file.driveFileId) window.open(`https://drive.google.com/uc?export=download&id=${file.driveFileId}`, '_blank');
      }
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <div className="file-browser-header">
          <div className="breadcrumbs">
            <span onClick={() => navigate('/student/saved-materials')}>My Materials</span> 
            {' / '} <span className="current-path">{material?.subjectName || 'Folder'}</span>
          </div>
          <div className="header-actions">
            <button className="btn-outline toggle-preview-btn" onClick={() => setShowPreviewPane(!showPreviewPane)}>
              {showPreviewPane ? 'Hide Preview 🗙' : 'Show Preview 👁️'}
            </button>
            <div className="action-divider"></div>
            <button className="btn-outline" onClick={handleSelectAll}>
              {selectedFiles.length === files.length && files.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button className="btn-outline" disabled={selectedFiles.length === 0} onClick={handleDownloadSelected}>
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
          {files.map((file) => {
            const fileId = file._id || file.driveFileId;
            const isSelected = selectedFiles.includes(fileId);
            return (
              <div 
                key={fileId} 
                className={`file-row ${isSelected ? 'selected' : ''}`}
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
          })}
        </div>
      </div>

      {/* FULL SCREEN MODAL */}
      {fullScreenFile && (
        <div className="full-screen-modal">
          <div className="full-screen-header">
            <div className="full-screen-title">{getFileIcon(fullScreenFile.mimeType)} {fullScreenFile.name}</div>
            <button className="full-screen-close" onClick={closeFullScreen}>Close ✕</button>
          </div>
          <div className="full-screen-body">
            {loadingBlob ? (
              <div style={{color: 'white'}}>Loading native preview...</div>
            ) : blobUrl ? (
              fullScreenFile.mimeType.includes('image') 
                ? <img src={blobUrl} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                : <iframe src={blobUrl} title="PDF Preview" className="full-screen-iframe"></iframe>
            ) : fullScreenFile.driveFileId ? (
              <iframe src={`https://drive.google.com/file/d/${fullScreenFile.driveFileId}/preview`} className="full-screen-iframe"></iframe>
            ) : (
              <div style={{color: 'white'}}>Preview not supported for this file type.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentFileBrowser;
