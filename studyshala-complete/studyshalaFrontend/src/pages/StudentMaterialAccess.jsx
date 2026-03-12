/**
 * StudentMaterialAccess  v2
 * =========================
 * Shows faculty message, sub-folder structure, and passes all data to FileManager.
 */
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import MessageBanner from '../components/MessageBanner';
import { MdSave, MdFolder, MdArrowBack } from 'react-icons/md';
import './StudentMaterialAccess.css';

const StudentMaterialAccess = () => {
  const { id }   = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [material,   setMaterial]   = useState(location.state?.material || null);
  const [files,      setFiles]      = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [fmOpen,     setFmOpen]     = useState(false);
  const [fetching,   setFetching]   = useState(false);
  const [fmLoading,  setFmLoading]  = useState(false);

  useEffect(() => { if (!material) fetchMaterial(); }, [id]);

  const fetchMaterial = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/student/materials/${id}/files`);
      setMaterial(res.data.material);
      setFiles(res.data.files || []);
      setSubFolders(res.data.subFolders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load material. Enter the access code first.');
    } finally { setFetching(false); }
  };

  const openFileManager = async () => {
    setFmLoading(true);
    setFmOpen(true);
    try {
      const res = await api.get(`/student/materials/${id}/files`);
      setFiles(res.data.files || []);
      setSubFolders(res.data.subFolders || []);
      setMaterial(prev => ({ ...prev, ...res.data.material }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files.');
      setFmOpen(false);
    } finally { setFmLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/student/save-material', { materialId: id });
      setSuccess(res.data.alreadySaved ? 'Already saved!' : 'Material saved!');
      setTimeout(() => navigate('/student/saved-materials'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (fetching) {
    return (
      <div className="app-container">
        <Sidebar role="student" />
        <div className="main-content"><Navbar />
          <div className="page-container">
            <div className="loading-container"><div className="spinner"></div></div>
          </div>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="app-container">
        <Sidebar role="student" />
        <div className="main-content"><Navbar />
          <div className="page-container">
            <div className="alert alert-error">{error || 'Material not found. Please enter the access code first.'}</div>
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={() => navigate('/student/enter-code')}>← Enter Access Code</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalFiles = (material.files?.length || files.length) +
    (material.subFolders || subFolders).reduce((s, sf) => s + (sf.files?.length || 0), 0);
  const sfCount = (material.subFolders || subFolders).length;

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          {/* Faculty message */}
          <MessageBanner message={material.messageToStudents} facultyName={material.facultyName} />

          <Card title="Material Details">
            <div className="material-access-info">
              {[
                ['Subject',    material.subjectName],
                ['Faculty',    material.facultyName],
                ['Department', material.department],
                ['Semester',   `Semester ${material.semester}`],
                ['Files',      `${totalFiles} file(s)${sfCount > 0 ? ` in ${sfCount} folder(s)` : ''}`]
              ].map(([label, value]) => (
                <div className="info-row" key={label}>
                  <span className="info-label">{label}</span>
                  <span className="info-value">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {error   && <div className="alert alert-error"   style={{ marginTop: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>{success}</div>}

          <div className="action-cards-grid">
            <Card className="action-card action-card--save">
              <div className="action-card-icon"><MdSave /></div>
              <h3 className="action-card-title">Save to My Materials</h3>
              <p className="action-card-description">
                Bookmark this material for permanent access. You won't need to enter the code again.
              </p>
              <ul className="action-card-benefits">
                <li>✓ Access anytime from "My Materials"</li>
                <li>✓ No code required again</li>
                <li>✓ Preview &amp; download files anytime</li>
              </ul>
              <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save Material'}
              </Button>
            </Card>

            <Card className="action-card action-card--download">
              <div className="action-card-icon"><MdFolder /></div>
              <h3 className="action-card-title">Browse Files</h3>
              <p className="action-card-description">
                Open the file manager to preview or download all files in this material.
              </p>
              <ul className="action-card-benefits">
                <li>✓ Folder-organised view</li>
                <li>✓ Preview PDFs, Word, PPT, images and more</li>
                <li>✓ Direct download via Google Drive</li>
              </ul>
              <Button
                variant="primary"
                onClick={openFileManager}
                disabled={!totalFiles || fmLoading}
                className="w-full"
              >
                {fmLoading ? 'Loading files…' : totalFiles ? `Open Files (${totalFiles})` : 'No files yet'}
              </Button>
            </Card>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Button variant="secondary" onClick={() => navigate('/student/enter-code')}>← Back to Enter Code</Button>
          </div>
        </div>
      </div>

      {fmOpen && !fmLoading && (
        <FileManager
          files={files}
          subFolders={subFolders}
          materialName={material.subjectName}
          onClose={() => setFmOpen(false)}
        />
      )}
    </div>
  );
};

export default StudentMaterialAccess;
