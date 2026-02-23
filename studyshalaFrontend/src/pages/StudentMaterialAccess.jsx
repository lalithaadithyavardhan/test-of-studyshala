import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import './StudentMaterialAccess.css';

const StudentMaterialAccess = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [material, setMaterial] = useState(location.state?.material || null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/student/save-material', { materialId: id });
      
      if (res.data.alreadySaved) {
        setSuccess('✅ Already saved! Redirecting to My Materials...');
      } else {
        setSuccess('✅ Material saved! Redirecting to My Materials...');
      }
      
      setTimeout(() => navigate('/student/saved-materials'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloading(fileId);
    setError('');

    try {
      const res = await api.get(`/student/materials/${id}/files/${fileId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`✅ Downloaded: ${fileName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Download failed: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setDownloading(null);
    }
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
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📄';
  };

  if (!material) {
    return (
      <div className="app-container">
        <Sidebar role="student" />
        <div className="main-content">
          <Navbar />
          <div className="page-container">
            <div className="loading-container"><div className="spinner"></div></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          
          {/* Material Info Card */}
          <Card title="📖 Material Details">
            <div className="material-access-info">
              <div className="info-row">
                <span className="info-label">Subject</span>
                <span className="info-value">{material.subjectName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Faculty</span>
                <span className="info-value">{material.facultyName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Department</span>
                <span className="info-value">{material.department}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Semester</span>
                <span className="info-value">Semester {material.semester}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Files</span>
                <span className="info-value">{material.fileCount} file(s)</span>
              </div>
            </div>
          </Card>

          {error && <div className="alert alert-error" style={{marginTop:'1rem'}}>{error}</div>}
          {success && <div className="alert alert-success" style={{marginTop:'1rem'}}>{success}</div>}

          {/* Action Cards */}
          <div className="action-cards-grid">
            {/* Save Card */}
            <Card className="action-card action-card--save">
              <div className="action-card-icon">💾</div>
              <h3 className="action-card-title">Save to My Materials</h3>
              <p className="action-card-description">
                Bookmark this material for permanent access. You won't need to enter the code again.
              </p>
              <ul className="action-card-benefits">
                <li>✓ Access anytime from "My Materials"</li>
                <li>✓ No code required again</li>
                <li>✓ Download files whenever needed</li>
              </ul>
              <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
                {saving ? '⏳ Saving…' : '💾 Save Material'}
              </Button>
            </Card>

            {/* Download Card */}
            <Card className="action-card action-card--download">
              <div className="action-card-icon">⬇️</div>
              <h3 className="action-card-title">Download Files</h3>
              <p className="action-card-description">
                Download files directly to your device for offline access.
              </p>
              {material.files && material.files.length > 0 ? (
                <div className="download-files-list">
                  {material.files.map(f => (
                    <div key={f._id} className="download-file-item">
                      <span className="file-icon">{getFileIcon(f.mimeType)}</span>
                      <div className="file-info">
                        <div className="file-name">{f.name}</div>
                        <div className="file-size">{formatFileSize(f.size)}</div>
                      </div>
                      <Button size="sm" onClick={() => handleDownload(f._id, f.name)}
                        disabled={downloading === f._id}>
                        {downloading === f._id ? '⏳' : '⬇️'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No files available yet</p>
              )}
            </Card>
          </div>

          <div style={{textAlign:'center',marginTop:'2rem'}}>
            <Button variant="secondary" onClick={() => navigate('/student/enter-code')}>
              ← Back to Enter Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMaterialAccess;
