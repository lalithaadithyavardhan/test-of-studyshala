/**
 * StudentSavedMaterials
 * =====================
 * Lists all materials a student has saved.
 * "Browse Files" fetches files fresh (with downloadUrl) before opening FileManager.
 */
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import './StudentSavedMaterials.css';

const StudentSavedMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [fmOpen,    setFmOpen]    = useState(false);
  const [fmName,    setFmName]    = useState('');
  const [fmFiles,   setFmFiles]   = useState([]);
  const [fmLoading, setFmLoading] = useState(false);

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

  // FIX: Always fetch files fresh so downloadUrl/previewUrl are present
  const openFileManager = async (material) => {
    setFmName(material.subjectName);
    setFmFiles([]);
    setFmLoading(true);
    setFmOpen(true);
    try {
      const res = await api.get(`/student/materials/${material._id}/files`);
      setFmFiles(res.data.files || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
      setFmOpen(false);
    } finally {
      setFmLoading(false);
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
                    <div className="detail-row"><span className="detail-label">Faculty</span><span className="detail-value">{m.facultyName}</span></div>
                    <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{m.department}</span></div>
                    <div className="detail-row"><span className="detail-label">Semester</span><span className="detail-value">Semester {m.semester}</span></div>
                    <div className="detail-row"><span className="detail-label">Files</span><span className="detail-value">{m.fileCount} file(s)</span></div>
                  </div>
                  <div className="saved-material-footer">
                    <Button variant="primary" size="sm" onClick={() => openFileManager(m)}>
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

      {/* Loading overlay while fetching files */}
      {fmOpen && fmLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '2.5rem',
            textAlign: 'center', minWidth: '200px'
          }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ margin: 0, color: '#475569' }}>Loading files…</p>
          </div>
        </div>
      )}

      {fmOpen && !fmLoading && (
        <FileManager
          files={fmFiles}
          materialName={fmName}
          onClose={() => { setFmOpen(false); setFmFiles([]); }}
        />
      )}
    </div>
  );
};

export default StudentSavedMaterials;
