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
    department: '', semester: '', subjectName: '', facultyName: '', permission: 'view'
  });
  const [submitting, setSubmitting] = useState(false);
  
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [isDragging, setIsDragging]   = useState(false);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
  const semesters   = ['1','2','3','4','5','6','7','8'];
  const permissions = [
    { value: 'view',    label: 'View Only' },
    { value: 'comment', label: 'View & Comment' },
    { value: 'edit',    label: 'Full Edit Access' }
  ];

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
      setFormData({ department: '', semester: '', subjectName: '', facultyName: '', permission: 'view' });
      const code = res.data.folder.accessCode || res.data.folder.departmentCode;
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
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
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
    if (uploadFiles.length === 0 || !selectedFolder) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/faculty/folders/${selectedFolder._id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

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
    if (!window.confirm('Delete this material? All files will be removed.')) return;
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalUploadSize = uploadFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="app-container">
      <Sidebar role="faculty" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1>Faculty Dashboard</h1>
              <p className="page-description">Create materials, upload files, share codes</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>➕ Create Material</Button>
          </div>

          {error   && <div className="alert alert-error"   style={{marginBottom:'1rem'}}>{error}</div>}
          {success && <div className="alert alert-success" style={{marginBottom:'1rem'}}>✅ {success}</div>}

          <Card title="Profile Information">
            <div className="profile-grid">
              <div className="profile-item"><span className="profile-label">Name</span><span className="profile-value">{user?.name}</span></div>
              <div className="profile-item"><span className="profile-label">Email</span><span className="profile-value">{user?.email}</span></div>
              <div className="profile-item"><span className="profile-label">Role</span><span className="badge badge-primary">{user?.role}</span></div>
            </div>
          </Card>

          <div className="section-header" style={{marginTop:'1.5rem'}}>
            <h2>Created Materials</h2>
            <span className="count-badge">{materials.length} Materials</span>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h3>No Materials Yet</h3>
              <p>Create your first material to share with students</p>
              <Button onClick={() => setShowCreateModal(true)}>Create Material</Button>
            </div>
          ) : (
            <div className="grid grid-3">
              {materials.map(m => {
                const code = m.accessCode || m.departmentCode;
                const fileCount = m.files?.length || 0;
                return (
                  <Card key={m._id} className="material-card">
                    <div className="material-icon">📚</div>
                    <h3 className="material-title">{m.subjectName}</h3>
                    <div className="material-info">
                      <span className="material-meta"><strong>Faculty:</strong> {m.facultyName}</span>
                      <span className="material-meta"><strong>Dept:</strong> {m.department}</span>
                      <span className="material-meta"><strong>Sem:</strong> {m.semester}</span>
                      <span className="material-meta"><strong>Files:</strong> {fileCount}</span>
                    </div>

                    <div className="access-code-box">
                      <span className="access-code-label">Student Access Code</span>
                      <div className="access-code-row">
                        <code className="access-code">{code}</code>
                        <button
                          className={`copy-btn ${copiedId === m._id ? 'copy-btn--copied' : ''}`}
                          onClick={() => copyCode(code, m._id)}
                          title="Copy code">
                          {copiedId === m._id ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>

                    <div className="material-actions">
                      <Button variant="primary" size="sm" onClick={() => openUploadModal(m)}>
                        📤 Upload
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(m._id)}>Delete</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}
        title="Create New Material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </>
        }>
        <form onSubmit={handleCreateSubmit}>
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary-light)',marginBottom:'1rem'}}>
            A unique code will be generated for students.
          </p>

          <Input label="Faculty Name *" value={formData.facultyName}
            onChange={e => setFormData(p => ({...p, facultyName: e.target.value}))}
            placeholder="e.g., Dr. John Smith" required />

          <div className="form-group">
            <label className="form-label">Department *</label>
            <select className="form-select" value={formData.department}
              onChange={e => setFormData(p => ({...p, department: e.target.value}))} required>
              <option value="">Select</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester *</label>
            <select className="form-select" value={formData.semester}
              onChange={e => setFormData(p => ({...p, semester: e.target.value}))} required>
              <option value="">Select</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <Input label="Subject Name *" value={formData.subjectName}
            onChange={e => setFormData(p => ({...p, subjectName: e.target.value}))}
            placeholder="e.g., Data Structures" required />

          <div className="form-group">
            <label className="form-label">Permission</label>
            <select className="form-select" value={formData.permission}
              onChange={e => setFormData(p => ({...p, permission: e.target.value}))}>
              {permissions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* Upload Modal with Drag-Drop */}
      <Modal isOpen={showUploadModal} 
        onClose={() => {setShowUploadModal(false); setUploadFiles([]);}}
        title={`Upload Files — ${selectedFolder?.subjectName || ''}`}
        size="large"
        footer={
          <>
            <Button variant="secondary" onClick={() => {setShowUploadModal(false); setUploadFiles([]);}}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={uploading || uploadFiles.length === 0}>
              {uploading ? `⏳ Uploading ${uploadFiles.length} file(s)…` : `📤 Upload ${uploadFiles.length} file(s)`}
            </Button>
          </>
        }>
        <div className="upload-container">
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary-light)',marginBottom:'1rem'}}>
            Max 50MB per file • Up to 20 files • PDF, DOC, PPT, XLS, images, videos, ZIP
          </p>

          {/* Drag-drop zone */}
          <div 
            className={`drag-drop-zone ${isDragging ? 'drag-drop-zone--active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}>
            <div className="drag-drop-icon">📂</div>
            <p className="drag-drop-text">Drag & drop files here</p>
            <p className="drag-drop-subtext">or click to browse</p>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFilesChange}
              style={{display:'none'}}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip,.rar,.7z,.mp4,.mp3" />
          </div>

          {/* File list */}
          {uploadFiles.length > 0 && (
            <div className="upload-files-list">
              <div className="upload-files-header">
                <span>{uploadFiles.length} file(s) selected • {formatFileSize(totalUploadSize)} total</span>
                <button className="clear-all-btn" onClick={() => setUploadFiles([])}>Clear All</button>
              </div>
              {uploadFiles.map((file, i) => (
                <div key={i} className="upload-file-item">
                  <span className="file-icon">📄</span>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatFileSize(file.size)}</div>
                  </div>
                  <button className="remove-file-btn" onClick={() => removeFile(i)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FacultyDashboard;
