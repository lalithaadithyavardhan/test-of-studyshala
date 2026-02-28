/**
 * FacultyMaterials
 * ================
 * Shows all materials a faculty member has created.
 * "Browse" opens the full-screen FileManager — files already include
 * previewUrl + downloadUrl from getFolders, so no extra API call needed.
 */
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import './FacultyMaterials.css';

const FacultyMaterials = () => {
  const [materials,   setMaterials]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [copiedId,    setCopiedId]    = useState(null);

  const [fmOpen,      setFmOpen]      = useState(false);
  const [fmMaterial,  setFmMaterial]  = useState(null);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      // getFolders returns files with previewUrl + downloadUrl already
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed and students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted');
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

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h3>No Materials</h3>
              <p>Create materials from the Dashboard to see them here</p>
            </div>
          ) : (
            <div className="faculty-materials-grid">
              {materials.map(m => {
                const code      = m.accessCode || m.departmentCode;
                const fileCount = m.files?.length || 0;
                return (
                  <Card key={m._id} className="faculty-material-card">
                    <div className="faculty-material-header">
                      <div className="material-icon">📚</div>
                      <h3 className="material-title">{m.subjectName}</h3>
                    </div>
                    <div className="faculty-material-body">
                      <div className="detail-row"><span className="detail-label">Faculty</span><span className="detail-value">{m.facultyName}</span></div>
                      <div className="detail-row"><span className="detail-label">Dept</span><span className="detail-value">{m.department}</span></div>
                      <div className="detail-row"><span className="detail-label">Semester</span><span className="detail-value">{m.semester}</span></div>
                      <div className="detail-row"><span className="detail-label">Files</span><span className="detail-value">{fileCount}</span></div>
                      <div className="detail-row"><span className="detail-label">Views</span><span className="detail-value">{m.accessCount || 0}</span></div>

                      <div className="code-display">
                        <span className="code-label">Access Code</span>
                        <div className="code-row">
                          <code className="code">{code}</code>
                          <button
                            className={`copy-btn ${copiedId === m._id ? 'copied' : ''}`}
                            onClick={() => copyCode(code, m._id)}
                          >
                            {copiedId === m._id ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="faculty-material-footer">
                      {/* Opens full-screen FileManager — no extra API call needed */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => { setFmMaterial(m); setFmOpen(true); }}
                      >
                        📂 Browse ({fileCount})
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

      {/* Full-screen FileManager — files already have Drive URLs from getFolders */}
      {fmOpen && fmMaterial && (
        <FileManager
          files={fmMaterial.files || []}
          materialName={fmMaterial.subjectName}
          onClose={() => { setFmOpen(false); setFmMaterial(null); }}
        />
      )}
    </div>
  );
};

export default FacultyMaterials;
