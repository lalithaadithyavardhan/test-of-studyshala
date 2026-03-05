/**
 * StudentHistory
 * ==============
 * Shows all materials a student has previously accessed.
 *
 * FIX: "Open" now navigates with correct material state.
 * StudentMaterialAccess will fetch fresh files (with downloadUrl) when FileManager opens.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import { MdMenuBook, MdPerson, MdBusiness, MdCalendarToday, MdFolder, MdBookmark, MdOpenInNew, MdHistory } from 'react-icons/md';
import './StudentHistory.css';

const StudentHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/access-history');
      setHistory(res.data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch access history');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id) => {
    try {
      await api.post('/student/save-material', { materialId: id });
      setSuccess('✅ Material saved!');
      setTimeout(() => setSuccess(''), 3000);
      fetchHistory();
    } catch {
      setError('Failed to save material');
    }
  };

  const openMaterial = (item) => {
    // Pass material info in state — StudentMaterialAccess fetches fresh files on open
    navigate(`/student/material-access/${item._id}`, {
      state: {
        material: {
          _id:         item._id,
          subjectName: item.subjectName,
          department:  item.department,
          semester:    item.semester,
          facultyName: item.facultyName,
          fileCount:   item.fileCount,
          // NOTE: Do NOT pass files here — they'll be fetched fresh with downloadUrl
          // when the student clicks "Open Files" in StudentMaterialAccess
        }
      }
    });
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
              {history.map(item => (
                <Card key={item._id} className="history-card">
                  <div className="history-card-content">
                    <div className="history-icon"><MdMenuBook /></div>
                    <div className="history-info">
                      <h3 className="history-title">{item.subjectName}</h3>
                      <div className="history-meta">
                        <span>{item.facultyName}</span>
                        <span>{item.department}</span>
                        <span>Sem {item.semester}</span>
                        <span>{item.fileCount} files</span>
                      </div>
                      <div className="history-details">
                        <span className="code-badge">{item.accessCode}</span>
                        <span className="date-badge">
                          Accessed {new Date(item.accessedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="history-actions">
                      {item.isSaved ? (
                        <Button variant="secondary" size="sm" disabled>✓ Saved</Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => handleSave(item._id)}>
                          💾 Save
                        </Button>
                      )}
                      <Button variant="primary" size="sm" onClick={() => openMaterial(item)}>
                        📂 Open
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHistory;
