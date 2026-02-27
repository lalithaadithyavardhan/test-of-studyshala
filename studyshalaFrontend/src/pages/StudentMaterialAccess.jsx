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

  // Completely simplified: No manual blob fetching anymore!
  const handleDownload = (downloadLink) => {
    if (downloadLink) {
      window.open(downloadLink, "_blank");
      setSuccess('✅ Download started');
      setTimeout(() => setSuccess(''), 3000);
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
              <h3 className="action-card-title">Access Files</h3>
              <p className="action-card-description">
                Double-click a file to preview, or use the buttons below.
              </p>
              {material.files && material.files.length > 0 ? (
                <div className="download-files-list">
                  {material.files.map(f => (
                    <div 
                      key={f._id} 
                      className="download-file-item" 
                      onDoubleClick={() => handlePreview(f.previewLink)}
                      title="Double-click to preview"
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="file-icon">{getFileIcon(f.fileName)}</span>
                      <div className="file-info">
                        <div className="file-name">{f.fileName}</div>
                        {/* Removed file size here since it is no longer in the schema */}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePreview(f.previewLink); }}>
                          👁️
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(f.downloadLink); }}>
                          ⬇️
                        </Button>
                      </div>
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
