import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFolder, setSelectedFolder]   = useState(null);
  const [copiedId, setCopiedId]   = useState(null);

  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjectName: '',
    facultyName: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [isDragging, setIsDragging]   = useState(false);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
  const semesters   = ['1','2','3','4','5','6','7','8'];

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/faculty/folders', formData);

      setShowCreateModal(false);

      setFormData({
        department: '',
        semester: '',
        subjectName: '',
        facultyName: ''
      });

      const code =
        res.data.folder.accessCode ||
        res.data.folder.departmentCode;

      setSuccess(`Material created! Access code: ${code}`);

      setTimeout(() => setSuccess(''), 8000);

      fetchMaterials();

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validFiles = files.filter(f => {
      if (f.size > 50 * 1024 * 1024) {
        setError(`${f.name} is too large. Max 50MB per file.`);
        return false;
      }
      return true;
    });

    setUploadFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setUploadFiles(prev =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);

    addFiles(files);
  };

  const handleUploadSubmit = async (e) => {

    e.preventDefault();

    if (!selectedFolder || uploadFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {

      const fd = new FormData();

      uploadFiles.forEach(file => {
        fd.append('files', file);
      });

      await api.post(
        `/faculty/folders/${selectedFolder._id}/files`,
        fd,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setShowUploadModal(false);
      setUploadFiles([]);
      setSelectedFolder(null);

      setSuccess(`${uploadFiles.length} file(s) uploaded successfully!`);

      setTimeout(() => setSuccess(''), 5000);

      fetchMaterials();

    } catch (err) {

      setError(err.response?.data?.message || 'Upload failed');

    } finally {

      setUploading(false);

    }
  };

  const handleDelete = async (id) => {

    if (!window.confirm('Delete this material? All files will be removed.'))
      return;

    try {

      await api.delete(`/faculty/folders/${id}`);

      setSuccess('Material deleted');

      setTimeout(() => setSuccess(''), 3000);

      fetchMaterials();

    } catch (err) {

      setError(err.response?.data?.message || 'Failed to delete');

    }
  };

  const openUploadModal = (material) => {

    setSelectedFolder(material);

    setUploadFiles([]);

    setShowUploadModal(true);
  };

  const copyCode = (code, id) => {

    navigator.clipboard.writeText(code).then(() => {

      setCopiedId(id);

      setTimeout(() => setCopiedId(null), 2000);

    });
  };

  const openPreview = (file) => {

    if (file.previewLink)
      window.open(file.previewLink, '_blank');

  };

  const downloadFile = (file) => {

    if (file.downloadLink)
      window.open(file.downloadLink, '_blank');

  };

  const formatFileSize = (bytes) => {

    if (!bytes) return '';

    const k = 1024;

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Math.round(bytes / Math.pow(k, i) * 100) / 100 +
      ' ' +
      sizes[i]
    );
  };

  const totalUploadSize =
    uploadFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="app-container">

      <Sidebar role="faculty" />

      <div className="main-content">

        <Navbar />

        <div className="page-container">

          <div className="page-header">

            <div>

              <h1>Faculty Dashboard</h1>

              <p className="page-description">
                Create materials, upload files, share codes
              </p>

            </div>

            <Button onClick={() => setShowCreateModal(true)}>
              ➕ Create Material
            </Button>

          </div>

          {error &&
            <div className="alert alert-error">
              {error}
            </div>
          }

          {success &&
            <div className="alert alert-success">
              {success}
            </div>
          }

          <Card title="Profile Information">

            <div className="profile-grid">

              <div className="profile-item">
                <span className="profile-label">Name</span>
                <span className="profile-value">{user?.name}</span>
              </div>

              <div className="profile-item">
                <span className="profile-label">Email</span>
                <span className="profile-value">{user?.email}</span>
              </div>

              <div className="profile-item">
                <span className="profile-label">Role</span>
                <span className="profile-value">{user?.role}</span>
              </div>

            </div>

          </Card>

          <div className="section-header">

            <h2>Created Materials</h2>

            <span className="count-badge">
              {materials.length} Materials
            </span>

          </div>

          {loading ? (

            <div className="loading-container">
              <div className="spinner"></div>
            </div>

          ) : materials.length === 0 ? (

            <p>No materials yet</p>

          ) : (

            <div className="grid grid-3">

              {materials.map(m => {

                const code =
                  m.accessCode ||
                  m.departmentCode;

                return (

                  <Card key={m._id} className="material-card">

                    <div className="material-icon">📚</div>

                    <h3 className="material-title">
                      {m.subjectName}
                    </h3>

                    <div className="material-info">

                      <span className="material-meta">
                        Faculty: {m.facultyName}
                      </span>

                      <span className="material-meta">
                        Dept: {m.department}
                      </span>

                      <span className="material-meta">
                        Sem: {m.semester}
                      </span>

                    </div>

                    <div className="access-code-box">

                      <span className="access-code-label">
                        Student Access Code
                      </span>

                      <div className="access-code-row">

                        <code className="access-code">
                          {code}
                        </code>

                        <button
                          className="copy-btn"
                          onClick={() => copyCode(code, m._id)}
                        >
                          📋
                        </button>

                      </div>

                    </div>

                    {/* FILE LIST WITH PREVIEW & DOWNLOAD */}

                    {m.files?.length > 0 && (

                      <div className="file-list">

                        {m.files.map(file => (

                          <div key={file.fileId} className="file-item">

                            <span>{file.fileName}</span>

                            <div className="file-actions">

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openPreview(file)}
                              >
                                Preview
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => downloadFile(file)}
                              >
                                Download
                              </Button>

                            </div>

                          </div>

                        ))}

                      </div>

                    )}

                    <div className="material-actions">

                      <Button
                        size="sm"
                        onClick={() => openUploadModal(m)}
                      >
                        Upload
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(m._id)}
                      >
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

      {/* Your existing modals remain unchanged */}

    </div>
  );
};

export default FacultyDashboard;
