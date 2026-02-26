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

  // Fetch files on load
  useEffect(() => {
    const fetchFilesAndDetails = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch the files using the CORRECT endpoint from your backend
        const fileRes = await api.get(`/student/materials/${id}/files`);
        const fetchedFiles = fileRes.data.files || [];
        setFiles(fetchedFiles);
        
        // Auto-select the first file for preview if available
        if (fetchedFiles.length > 0) {
          setPreviewFile(fetchedFiles[0]);
        }

        // 2. Fetch material details for the header (Subject Name, etc.)
        // We pull from the saved materials list to get the info
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
  const handleDownloadSelected = async () => {
    const filesToDownload = files.filter(f => selectedFiles.includes(f._id || f.driveFileId));
    
    // Trigger download for each selected file using your existing logic
    for (let file of filesToDownload) {
      try {
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
        console.error(`Failed to download ${file.name}`);
      }
    }
  };

  const handleSaveToDrive = () => {
    alert(`This will sync ${selectedFiles.length} files. (Backend implementation required for personal Drive saving)`);
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
    if (mimeType?.includes('pdf')) return '📄 PDF';
    if (mimeType?.includes('image')) return '🖼️ IMG';
    return '📁 FILE';
  };

  if (loading) return <div className="loading-screen" style={{color: 'white', padding: '2rem'}}>Loading Files...</div>;

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
              {selectedFiles.length === files.length && files.length > 0 ? '🔓 Deselect All' : '🔒 Select All'}
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
              💾 Save ({selectedFiles.length})
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="file-list-container">
          {files.length === 0 ? (
            <div style={{color: '#888', textAlign: 'center', marginTop: '50px'}}>
              <h2>📭 No Files Found</h2>
              <p>There are currently no files uploaded to this material.</p>
            </div>
          ) : (
            files.map((file) => {
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
                      <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                      <span>Size: {formatSize(file.size)}</span>
                    </div>
                  </div>
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

      {/* RIGHT PANE: Live Preview */}
      <div className="file-preview-pane">
        <div className="preview-header">
          <h3>Preview</h3>
          <button className="close-preview" onClick={() => setPreviewFile(null)}>✕</button>
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
