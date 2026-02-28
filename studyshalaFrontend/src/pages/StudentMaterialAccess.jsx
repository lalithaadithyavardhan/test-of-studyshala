import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import './StudentMaterialAccess.css';

const StudentMaterialAccess = () => {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();

  // Files come from validate-code response (already include downloadUrl + previewUrl)
  const [material, setMaterial]   = useState(location.state?.material || null);
  const [files,    setFiles]      = useState(location.state?.material?.files || []);
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState('');
  const [success,  setSuccess]    = useState('');
  const [fmOpen,   setFmOpen]     = useState(false);
  const [fetching, setFetching]   = useState(false);

  // If arriving from History page (no state), fetch files fresh
  useEffect(() => {
    if (!material) fetchFiles();
  }, [id]);

  const fetchFiles = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/student/materials/${id}/files`);
      setMaterial({ ...res.data.material, fileCount: res.data.files.length });
      setFiles(res.data.files || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load material. Enter the access code first.');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await api.post('/student/save-material', { materialId: id });
      setSuccess(res.data.alreadySaved ? '✅ Already saved!' : '✅ Material saved!');
      setTimeout(() => navigate('/student/saved-materials'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return (
    <div className="app-container"><Sidebar role="student" /><div className="main-content"><Navbar />
      <div className="page-container"><div className="loading-container"><div className="spinner"></div></div></div>
    </div></div>
  );

  if (!material) return (
    <div className="app-container"><Sidebar role="student" /><div className="main-content"><Navbar />
      <div className="page-container">
        <div className="alert alert-error">{error || 'Material not found. Please enter the access code first.'}</div>
        <div style={{marginTop:'1rem'}}>
          <Button onClick={() => navigate('/student/enter-code')}>← Enter Access Code</Button>
        </div>
      </div>
    </div></div>
  );

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <Card title="📖 Material Details">
            <div className="material-access-info">
              {[['Subject',material.subjectName],['Faculty',material.facultyName],
                ['Department',material.department],['Semester',`Semester ${material.semester}`],
                ['Files',`${material.fileCount ?? files.length} file(s)`]
              ].map(([l,v]) => (
                <div className="info-row" key={l}>
                  <span className="info-label">{l}</span>
                  <span className="info-value">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {error   && <div className="alert alert-error"   style={{marginTop:'1rem'}}>{error}</div>}
          {success && <div className="alert alert-success" style={{marginTop:'1rem'}}>{success}</div>}

          <div className="action-cards-grid">
            {/* Save card — unchanged from original */}
            <Card className="action-card action-card--save">
              <div className="action-card-icon">💾</div>
              <h3 className="action-card-title">Save to My Materials</h3>
              <p className="action-card-description">Bookmark this material for permanent access. You won't need to enter the code again.</p>
              <ul className="action-card-benefits">
                <li>✓ Access anytime from "My Materials"</li>
                <li>✓ No code required again</li>
                <li>✓ Preview & download files anytime</li>
              </ul>
              <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
                {saving ? '⏳ Saving…' : '💾 Save Material'}
              </Button>
            </Card>

            {/* FIX: Browse files card → opens full-screen FileManager */}
            <Card className="action-card action-card--download">
              <div className="action-card-icon">📂</div>
              <h3 className="action-card-title">Browse Files</h3>
              <p className="action-card-description">
                Open the file manager to preview or download all files. Double-click any file for full-screen view.
              </p>
              <ul className="action-card-benefits">
                <li>✓ Grid &amp; list view</li>
                <li>✓ Preview PDFs, images, videos, docs</li>
                <li>✓ Direct download to your device</li>
              </ul>
              <Button variant="primary"
                onClick={() => setFmOpen(true)}
                disabled={!files.length}
                className="w-full">
                {files.length ? `📂 Open Files (${files.length})` : 'No files uploaded yet'}
              </Button>
            </Card>
          </div>

          <div style={{textAlign:'center',marginTop:'2rem'}}>
            <Button variant="secondary" onClick={() => navigate('/student/enter-code')}>
              ← Back to Enter Code
            </Button>
          </div>
        </div>
      </div>

      {fmOpen && (
        <FileManager
          files={files}
          materialName={material?.subjectName || 'Files'}
          onClose={() => setFmOpen(false)}
        />
      )}
    </div>
  );
};

export default StudentMaterialAccess;
