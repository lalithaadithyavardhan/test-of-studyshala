import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Added for full-screen navigation
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import './StudentSavedMaterials.css';
// Note: Modal import is removed because we are using full-screen now

const StudentSavedMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate(); // <-- Initialize navigation

  useEffect(() => { 
    fetchMaterials(); 
  }, []);

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

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this material from your saved list?')) return;
    try {
      await api.delete(`/student/saved-materials/${id}`);
      fetchMaterials(); // Refresh the list after removing
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
                    <div className="detail-row">
                      <span className="detail-label">Faculty</span>
                      <span className="detail-value">{m.facultyName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Department</span>
                      <span className="detail-value">{m.department}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Semester</span>
                      <span className="detail-value">Semester {m.semester}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Files</span>
                      <span className="detail-value">{m.fileCount} file(s)</span>
                    </div>
                  </div>
                  <div className="saved-material-footer">
                    {/* CHANGED: This button now redirects to the new full-screen File Browser */}
                    <Button variant="primary" size="sm" onClick={() => navigate(`/student/browse/${m._id}`)}>
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
    </div>
  );
};

export default StudentSavedMaterials;
