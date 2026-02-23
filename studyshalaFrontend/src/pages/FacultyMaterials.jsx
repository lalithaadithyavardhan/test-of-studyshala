import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './FacultyMaterials.css';

const FacultyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const openFiles = (material) => {
    setSelectedMaterial(material);
    setFiles(material.files || []);
    setShowFilesModal(true);
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloading(fileId);
    try {
      const res = await api.get(
        `/student/materials/${selectedMaterial._id}/files/${fileId}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed from Google Drive and all students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word')) return '📘';
    if (mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('presentation')) return '📙';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('zip')) return '🗜️';
    return '📄';
  };

  return (
    <div className="app-container">
      <Sidebar role="faculty" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1>My Materials</h1>
              <p className="page-description">View, preview, and manage your uploaded materials</p>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h3>No Materials</h3>
              <p>Create materials from the Dashboard</p>
            </div>
          ) : (
            <div className="faculty-materials-grid">
              {materials.map(m => {
                const code = m.accessCode || m.departmentCode;
                const fileCount = m.files?.length || 0;
                return (
                  <Card key={m._id} className="faculty-material-card">
                    <div className="faculty-material-header">
                      <div className="material-icon">📚</div>
                      <h3 className="material-title">{m.subjectName}</h3>
                    </div>
                    <div className="faculty-material-body">
                      <div className="detail-row">
                        <span className="detail-label">Faculty</span>
                        <span className="detail-value">{m.facultyName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Dept</span>
                        <span className="detail-value">{m.department}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Semester</span>
                        <span className="detail-value">{m.semester}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Files</span>
                        <span className="detail-value">{fileCount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Views</span>
                        <span className="detail-value">{m.accessCount || 0}</span>
                      </div>
                      <div className="code-display">
                        <span className="code-label">Access Code</span>
                        <div className="code-row">
                          <code className="code">{code}</code>
                          <button className={`copy-btn ${copiedId === m._id ? 'copied' : ''}`}
                            onClick={() => copyCode(code, m._id)}>
                            {copiedId === m._id ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="faculty-material-footer">
                      <Button variant="primary" size="sm" onClick={() => openFiles(m)}>
                        📂 Preview ({fileCount})
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(m._id)}>
                        Delete
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Files Preview Modal */}
      <Modal isOpen={showFilesModal} onClose={() => setShowFilesModal(false)}
        title={`📂 ${selectedMaterial?.subjectName || ''}`} size="large">
        {files.length === 0 ? (
          <div className="empty-state" style={{padding:'2rem'}}>
            <div className="empty-state-icon">📭</div>
            <h3>No Files</h3>
            <p>Upload files from Dashboard</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map(f => (
              <div key={f._id} className="file-item">
                <div className="file-item-icon">{getFileIcon(f.mimeType)}</div>
                <div className="file-item-info">
                  <div className="file-item-name">{f.name}</div>
                  <div className="file-item-meta">
                    {formatFileSize(f.size)} • {new Date(f.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="primary" size="sm"
                  onClick={() => handleDownload(f._id, f.name)}
                  disabled={downloading === f._id}>
                  {downloading === f._id ? '⏳' : '⬇️'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FacultyMaterials;
