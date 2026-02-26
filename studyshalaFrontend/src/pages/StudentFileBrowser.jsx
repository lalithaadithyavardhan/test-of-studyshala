import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Adjust path if needed
import './StudentFileBrowser.css';

const StudentFileBrowser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [material, setMaterial] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch material details and files on load
  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        // Replace with your actual endpoint for fetching a single material's files
        const response = await api.get(`/student/materials/${id}`);
        setMaterial(response.data.material);
        setFiles(response.data.material.files);
        // Auto-select the first file for preview if available
        if (response.data.material.files.length > 0) {
          setPreviewFile(response.data.material.files[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching material:", error);
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [id]);

  // Handle Checkbox Selection
  const toggleSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]); // Deselect all
    } else {
      setSelectedFiles(files.map(f => f._id || f.driveFileId)); // Select all
    }
  };

  // Actions
  const handleDownloadSelected = () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(f._id || f.driveFileId));
    console.log("Downloading:", filesToDownload);
    // Add your bulk download logic here (e.g., triggering individual downloads)
    alert(`Downloading ${filesToDownload.length} files...`);
  };

  const handleSaveToDrive = () => {
    // Note: Saving directly to the student's personal Google Drive requires
    // the backend to request Google Drive scopes during student login.
    // If you mean saving to "My Materials" in StudyShala, call your save endpoint here.
    alert(`Saving ${selectedFiles.length} files to Drive/My Materials...`);
  };

  // Formatting helpers
  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown Size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-GB'); // DD-MM-YYYY format
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄 PDF';
    if (mimeType?.includes('image')) return '🖼️ IMG';
    return '📁 FILE';
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
            {' > '} 
            <span className="current-path">{material?.subjectName || 'Material Files'}</span>
          </div>
          
          <div className="header-actions">
            <button className="btn-outline" onClick={handleSelectAll}>
              {selectedFiles.length === files.length ? '🔓 Deselect All' : '🔒 Select All'}
            </button>
            <button 
              className="btn-outline" 
              disabled={selectedFiles.length === 0}
              onClick={handleDownloadSelected}
            >
              ⬇️ Download Selected ({selectedFiles.length})
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

        {/* File List */}
        <div className="file-list-container">
          {files.map((file) => {
            const fileId = file._id || file.driveFileId;
            const isSelected = selectedFiles.includes(fileId);
            const isPreviewing = previewFile?._id === file._id;

            return (
              <div 
                key={fileId} 
                className={`file-row ${isSelected ? 'selected' : ''} ${isPreviewing ? 'active-preview' : ''}`}
                onClick={() => setPreviewFile(file)}
              >
                <div className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleSelection(fileId)}
                  />
                </div>
                
                <div className="icon-col">
                  <div className={`file-icon ${file.mimeType?.includes('pdf') ? 'pdf-icon' : 'img-icon'}`}>
                    {getFileIcon(file.mimeType)}
                  </div>
                </div>
                
                <div className="details-col">
                  <h4 className="file-name">{file.name}</h4>
                  <div className="file-meta">
                    <span>Date modified: {formatDate(file.uploadedAt)}</span>
                    <span>Size: {formatSize(file.size)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer Stats */}
        <div className="file-browser-footer">
          <span>📁 {files.length} items</span>
          <span>✅ {selectedFiles.length} selected</span>
        </div>
      </div>

      {/* RIGHT PANE: Live Preview */}
      <div className="file-preview-pane">
        <div className="preview-header">
          <h3>Preview</h3>
          <button className="close-preview" onClick={() => setPreviewFile(null)}>✕</button>
        </div>
        
        {previewFile ? (
          <div className="preview-content">
            {/* Google Drive trick: Use /preview endpoint to embed PDFs and Images securely */}
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
                <p>Preview not available for this file type.</p>
              </div>
            )}
            
            <div className="preview-details">
              <h4>{previewFile.name}</h4>
              <p><strong>Type:</strong> {previewFile.mimeType}</p>
              <p><strong>Size:</strong> {formatSize(previewFile.size)}</p>
              <p><strong>Uploaded:</strong> {formatDate(previewFile.uploadedAt)}</p>
            </div>
          </div>
        ) : (
          <div className="empty-preview">
            <p>Select a file to preview its contents here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFileBrowser;
