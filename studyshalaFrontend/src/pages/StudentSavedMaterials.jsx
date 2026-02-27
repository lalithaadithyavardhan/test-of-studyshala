import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './StudentSavedMaterials.css';

const StudentSavedMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/saved-materials');
      setMaterials(res.data.materials || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch saved materials');
    } finally {
      setLoading(false);
    }
  };

  const openFileBrowser = async (material) => {
    setSelectedMaterial(material);
    setFiles([]);
    setShowFilesModal(true);
    setLoadingFiles(true);

    try {
      const res = await api.get(`/student/materials/${material._id}/files`);
      setFiles(res.data.files || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownload = (downloadLink) => {
    if (downloadLink) {
      window.open(downloadLink, "_blank");
    } else {
      setError('Download link is not available.');
    }
  };

  const handlePreview = (previewLink) => {
    if (previewLink) {
      window.open(previewLink, "_blank");
    } else {
      setError('Preview link is not available.');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this material from your saved list?')) return;
    try {
      await api.delete(`/student/saved-materials/${id}`);
      fetchMaterials();
    } catch (err) {
      setError('Failed to remove material');
    }
  };

  // Updated to check file extension instead of mimeType
  const getFileIcon = (fileName = '') => {
    const name = fileName.toLowerCase();
    if (name.includes('.pdf')) return '📕';
    if (name.includes('.doc') || name.includes('.docx')) return '📘';
    if (name.includes('.xls') || name.includes('.csv')) return '📊';
    if (name.includes('.ppt')) return '📙';
    if (name.match(/\.(jpeg|jpg|png|gif|svg)$/)) return '🖼️';
    if (name.match(/\.(mp4|webm|avi|mov)$/)) return '🎥';
    if (name.match(/\.(zip|rar|tar|gz)$/)) return '🗜️';
    return '📄';
  };

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1>My Saved Materials</h1>
              <p className="page-description">Materials you've saved for permanent access</p>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>No Saved Materials</h3>
              <p>Materials you save will appear here for easy access</p>
            </div>
          ) : (
            <div className="saved-materials-grid">
              {materials.map(m => (
                <Card key={m._id} className="saved-material-card">
                  <div className="saved-material-header">
                    <div className="material-icon">📖</div>
                    <h3 className="material-title">{m.subjectName}</h3>
                  </div>
                  <div className="saved-material-body">
                    <div className="detail-row">
                      <span className="detail-label">Faculty</span>
                      <span className="detail-value">{m.facultyName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Department</span>
                      <span className="detail-value">{m.department}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Semester</span>
                      <span className="detail-value">Semester {m.semester}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Files</span>
                      <span className="detail-value">{m.fileCount} file(s)</span>
                    </div>
                  </div>
                  <div className="saved-material-footer">
                    <Button variant="primary" size="sm" onClick={() => openFileBrowser(m)}>
                      📂 Browse Files
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRemove(m._id)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Files Modal */}
      <Modal isOpen={showFilesModal} onClose={() => setShowFilesModal(false)}
        title={`📂 ${selectedMaterial?.subjectName || 'Files'}`} size="large">
        {loadingFiles ? (
          <div className="loading-container" style={{padding:'2rem'}}>
            <div className="spinner"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state" style={{padding:'2rem'}}>
            <div className="empty-state-icon">📭</div>
            <h3>No Files</h3>
            <p>No files available yet</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map(f => (
              <div 
                key={f._id} 
                className="file-item" 
                onDoubleClick={() => handlePreview(f.previewLink)}
                title="Double-click to preview"
                style={{ cursor: 'pointer' }}
              >
                <div className="file-item-icon">{getFileIcon(f.fileName)}</div>
                <div className="file-item-info">
                  <div className="file-item-name">{f.fileName}</div>
                  {/* Removed size and upload metadata since it is no longer in schema */}
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handlePreview(f.previewLink); }}>
                    👁️
                  </Button>
                  <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(f.downloadLink); }}>
                    ⬇️
                  </Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentSavedMaterials;
