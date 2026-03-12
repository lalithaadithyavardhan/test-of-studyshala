/**
 * FacultyMaterials  v2
 * ====================
 * Shows sub-folder structure per material and faculty message.
 * "Browse" opens FileManager with full sub-folder navigation.
 */
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import { MdBook, MdFolder, MdDelete, MdContentCopy, MdCheck, MdCampaign, MdFolderOpen } from 'react-icons/md';
import './FacultyMaterials.css';

const FacultyMaterials = () => {
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [copiedId,     setCopiedId]     = useState(null);

  const [fmOpen,       setFmOpen]       = useState(false);
  const [fmLoading,    setFmLoading]    = useState(false);
  const [fmMaterial,   setFmMaterial]   = useState(null);
  const [fmFiles,      setFmFiles]      = useState([]);
  const [fmSubFolders, setFmSubFolders] = useState([]);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed and students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted'); setTimeout(() => setSuccess(''), 3000);
      fetchMaterials();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const openFileManager = async (m) => {
    setFmMaterial(m);
    setFmFiles(m.files || []);
    setFmSubFolders(m.subFolders || []);
    setFmLoading(true);
    setFmOpen(true);
    try {
      // Refresh to get latest files
      const res = await api.get(`/faculty/folders/${m._id}`);
      const updated = res.data.folder;
      setFmFiles(updated.files || []);
      setFmSubFolders(updated.subFolders || []);
      setFmMaterial(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally { setFmLoading(false); }
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
              <div className="empty-state-icon"><MdFolder /></div>
              <h3>No Materials</h3>
              <p>Create materials from the Dashboard to see them here</p>
            </div>
          ) : (
            <div className="faculty-materials-grid">
              {materials.map(m => {
                const code       = m.accessCode || m.departmentCode;
                const rootFiles  = m.files?.length || 0;
                const sfCount    = m.subFolders?.length || 0;
                const totalFiles = rootFiles + (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
                const hasMsg     = !!m.messageToStudents?.trim();

                return (
                  <Card key={m._id} className="faculty-material-card">
                    <div className="faculty-material-header">
                      <div className="material-icon"><MdBook /></div>
                      <h3 className="material-title">{m.subjectName}</h3>
                    </div>
                    <div className="faculty-material-body">
                      <div className="detail-row"><span className="detail-label">Faculty</span><span className="detail-value">{m.facultyName}</span></div>
                      <div className="detail-row"><span className="detail-label">Dept</span><span className="detail-value">{m.department}</span></div>
                      <div className="detail-row"><span className="detail-label">Semester</span><span className="detail-value">{m.semester}</span></div>
                      <div className="detail-row">
                        <span className="detail-label">Files</span>
                        <span className="detail-value">{totalFiles} file(s)</span>
                      </div>
                      {sfCount > 0 && (
                        <div className="detail-row">
                          <span className="detail-label">Folders</span>
                          <span className="detail-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {m.subFolders.map(sf => (
                              <span key={sf._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eef2ff', color: '#4338ca', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                                <MdFolderOpen style={{ fontSize: '0.85rem' }} /> {sf.name} ({sf.files?.length || 0})
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {hasMsg && (
                        <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                          <span className="detail-label" style={{ paddingTop: '0.15rem' }}>
                            <MdCampaign style={{ color: '#d97706', verticalAlign: 'middle' }} />
                          </span>
                          <span className="detail-value" style={{ color: '#92400e', fontSize: '0.8rem', background: '#fffbeb', borderRadius: '6px', padding: '0.3rem 0.5rem' }}>
                            {m.messageToStudents.slice(0, 100)}{m.messageToStudents.length > 100 ? '…' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="access-code-section">
                      <span className="access-code-label-sm">Access Code</span>
                      <div className="access-code-row-sm">
                        <code className="access-code-sm">{code}</code>
                        <button className={`copy-btn-sm ${copiedId === m._id ? 'copied' : ''}`} onClick={() => copyCode(code, m._id)} title="Copy">
                          {copiedId === m._id ? <MdCheck /> : <MdContentCopy />}
                        </button>
                      </div>
                    </div>

                    <div className="faculty-material-actions">
                      <Button variant="primary" size="sm" onClick={() => openFileManager(m)}>
                        📂 Browse Files
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(m._id)}>
                        <MdDelete /> Delete
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fmOpen && !fmLoading && fmMaterial && (
        <FileManager
          files={fmFiles}
          subFolders={fmSubFolders}
          materialName={fmMaterial.subjectName}
          onClose={() => { setFmOpen(false); setFmFiles([]); setFmSubFolders([]); setFmMaterial(null); }}
        />
      )}
    </div>
  );
};

export default FacultyMaterials;
