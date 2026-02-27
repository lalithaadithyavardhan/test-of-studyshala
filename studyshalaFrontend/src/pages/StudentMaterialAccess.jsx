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
  const [loading, setLoading] = useState(!location.state?.material);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ---------- FETCH MATERIAL IF PAGE REFRESHED ---------- */
  useEffect(() => {
    if (!material) {
      fetchMaterial();
    }
  }, [id]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student/material/${id}`);
      setMaterial(res.data.material);
    } catch {
      setError('Failed to load material');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SAVE MATERIAL ---------- */
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/student/save-material', { materialId: id });

      setSuccess(
        res.data.alreadySaved
          ? 'Already saved. Redirecting...'
          : 'Material saved successfully. Redirecting...'
      );

      setTimeout(() => navigate('/student/saved-materials'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- PREVIEW & DOWNLOAD ---------- */
  const handlePreview = (file) => {
    const url =
      file.previewLink ||
      `${import.meta.env.VITE_API_BASE_URL}/files/preview/${file._id}`;

    if (!url) {
      setError('Preview is not available for this file');
      return;
    }
    window.open(url, '_blank');
  };

  const handleDownload = (file) => {
    const url =
      file.downloadLink ||
      `${import.meta.env.VITE_API_BASE_URL}/files/download/${file._id}`;

    if (!url) {
      setError('Download is not available for this file');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ---------- FILE ICON ---------- */
  const getFileIcon = (fileName = '') => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.pdf')) return '📕';
    if (name.match(/\.(doc|docx)$/)) return '📘';
    if (name.match(/\.(xls|xlsx|csv)$/)) return '📊';
    if (name.match(/\.(ppt|pptx)$/)) return '📙';
    if (name.match(/\.(jpeg|jpg|png|gif|svg)$/)) return '🖼️';
    if (name.match(/\.(mp4|webm|avi|mov)$/)) return '🎥';
    if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return '🗜️';
    return '📄';
  };

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    return (
      <div className="app-container">
        <Sidebar role="student" />
        <div className="main-content">
          <Navbar />
          <div className="page-container">
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!material) return null;

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <Card title="Material Details">
            <div className="material-access-info">
              <div><strong>Subject:</strong> {material.subjectName}</div>
              <div><strong>Faculty:</strong> {material.facultyName}</div>
              <div><strong>Department:</strong> {material.department}</div>
              <div><strong>Semester:</strong> {material.semester}</div>
              <div><strong>Files:</strong> {material.files?.length || 0}</div>
            </div>
          </Card>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="action-cards-grid">

            <Card>
              <h3>Save to My Materials</h3>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Material'}
              </Button>
            </Card>

            <Card>
              <h3>Files</h3>

              {material.files?.length > 0 ? (
                material.files.map(file => (
                  <div
                    key={file._id}
                    className="download-file-item"
                    onDoubleClick={() => handlePreview(file)}
                  >
                    <span>{getFileIcon(file.fileName)}</span>
                    <span>{file.fileName}</span>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                      >
                        Preview
                      </Button>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No files available</p>
              )}
            </Card>

          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Button variant="secondary" onClick={() => navigate('/student/enter-code')}>
              Back
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentMaterialAccess;
