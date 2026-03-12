/**
 * StudentHistory  v2
 * ==================
 * Shows message indicator on history cards.
 * "Open" button launches FileManager with sub-folder support.
 */
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import FileManager from '../components/FileManager';
import { MdMenuBook, MdHistory, MdCampaign } from 'react-icons/md';
import './StudentHistory.css';

const StudentHistory = () => {
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // FileManager state
  const [fmOpen,      setFmOpen]      = useState(false);
  const [fmLoading,   setFmLoading]   = useState(false);
  const [fmFiles,     setFmFiles]     = useState([]);
  const [fmSubFolders,setFmSubFolders]= useState([]);
  const [fmMaterial,  setFmMaterial]  = useState(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/access-history');
      setHistory(res.data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch access history');
    } finally { setLoading(false); }
  };

  const handleSave = async (id) => {
    try {
      await api.post('/student/save-material', { materialId: id });
      setSuccess('✅ Material saved!');
      setTimeout(() => setSuccess(''), 3000);
      fetchHistory();
    } catch { setError('Failed to save material'); }
  };

  const openMaterial = async (item) => {
    setFmMaterial(item);
    setFmLoading(true);
    setFmOpen(true);
    try {
      const res = await api.get(`/student/materials/${item._id}/files`);
      setFmFiles(res.data.files || []);
      setFmSubFolders(res.data.subFolders || []);
      setFmMaterial(prev => ({ ...prev, ...res.data.material }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
      setFmOpen(false);
    } finally { setFmLoading(false); }
  };

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1>Access History</h1>
              <p className="page-description">Materials you've accessed using codes</p>
            </div>
          </div>

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><MdHistory /></div>
              <h3>No Access History</h3>
              <p>Materials you access will appear here</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(item => {
                const hasMsg  = !!item.messageToStudents?.trim();
                const sfCount = item.subFolderCount || 0;
                return (
                  <Card key={item._id} className="history-card">
                    <div className="history-card-content">
                      <div className="history-icon"><MdMenuBook /></div>
                      <div className="history-info">
                        <h3 className="history-title">{item.subjectName}</h3>
                        <div className="history-meta">
                          <span>{item.facultyName}</span>
                          <span>{item.department}</span>
                          <span>Sem {item.semester}</span>
                          <span>{item.fileCount} files{sfCount > 0 ? ` · ${sfCount} folders` : ''}</span>
                        </div>
                        <div className="history-details">
                          <span className="code-badge">{item.accessCode}</span>
                          <span className="date-badge">Accessed {new Date(item.accessedAt).toLocaleDateString()}</span>
                          {hasMsg && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: '#d97706', background: '#fef3c7', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                              <MdCampaign /> Msg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="history-actions">
                        {item.isSaved ? (
                          <Button variant="secondary" size="sm" disabled>✓ Saved</Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={() => handleSave(item._id)}>💾 Save</Button>
                        )}
                        <Button variant="primary" size="sm" onClick={() => openMaterial(item)}>
                          📂 Open
                        </Button>
                      </div>
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

export default StudentHistory;
