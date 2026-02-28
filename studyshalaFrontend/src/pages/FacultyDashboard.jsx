/**
 * FacultyDashboard
 * ================
 * Create materials, upload files, view access codes.
 * Permission dropdown removed — all materials are always anyoneWithLink reader.
 */
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
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFolder,  setSelectedFolder]  = useState(null);
  const [copiedId,   setCopiedId]  = useState(null);

  const [formData, setFormData] = useState({
    department: '', semester: '', subjectName: '', facultyName: ''
    // permission field removed — always 'view'
  });
  const [submitting, setSubmitting] = useState(false);

  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);

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
      setFormData({ department: '', semester: '', subjectName: '', facultyName: '' });
      const code = res.data.folder.accessCode || res.data.folder.departmentCode;
      setSuccess(`Material created! Share this code with students: ${code}`);
      setTimeout(() => setSuccess(''), 10000);
      fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create material');
    } finally {
      setSubmitting(false);
    }
  };

  const addFiles = (files) => {
    const valid = files.filter(f => {
      if (f.size > 50 * 1024 * 1024) { setError(`${f.name} exceeds 50 MB limit.`); return false; }
      return true;
    });
    setUploadFiles(prev => [...prev, ...valid]);
  };

  const handleFilesChange = (e) => addFiles(Array.from(e.target.files));

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFiles.length || !selectedFolder) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      uploadFiles.forEach(f => form.append('files', f));
      await api.post(`/faculty/folders/${selectedFolder._id}/files`, form, {
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

  const openUploadModal = (material) => {
    setSelectedFolder(material);
    setUploadFiles([]);
    setShowUploadModal(true);
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmtSize = (bytes) => {
    if (!bytes) return '0 B';
    const u = ['B','KB','MB','GB'], i = Math.floor(Math.log(bytes)/Math.log(1024));
    return (bytes/1024**i).toFixed(1)+' '+u[i];
  };

  const totalSize = uploadFiles.reduce((s, f) => s + f.size, 0);

  return (
    <div className="app-container">
      <Sidebar role="faculty" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1>Faculty Dashboard</h1>
              <p className="page-description">Create materials, upload files, share access codes</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>➕ Create Material</Button>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

          <Card title="Profile Information">
            <div className="profile-grid">
              <div className="profile-item"><span className="profile-label">Name</span><span className="profile-value">{user?.name}</span></div>
              <div className="profile-item"><span className="profile-label">Email</span><span className="profile-value">{user?.email}</span></div>
              <div className="profile-item"><span className="profile-label">Role</span><span className="badge badge-primary">{user?.role}</span></div>
            </div>
          </Card>

          <div className="section-header" style={{ marginTop: '1.5rem' }}>
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
                const code      = m.accessCode || m.departmentCode;
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
                          title="Copy code"
                        >
                          {copiedId === m._id ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>

                    <div className="material-actions">
                      <Button variant="primary" size="sm" onClick={() => openUploadModal(m)}>
                        📤 Upload
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

      {/* ── Create Material Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-light)', marginBottom: '1rem' }}>
            A unique 8-character code will be generated automatically for students.
          </p>

          <Input
            label="Faculty Name *"
            value={formData.facultyName}
            onChange={e => setFormData(p => ({ ...p, facultyName: e.target.value }))}
            placeholder="e.g., Dr. John Smith"
            required
          />

          <div className="form-group">
            <label className="form-label">Department *</label>
            <select
              className="form-select"
              value={formData.department}
              onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester *</label>
            <select
              className="form-select"
              value={formData.semester}
              onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))}
              required
            >
              <option value="">Select</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <Input
            label="Subject Name *"
            value={formData.subjectName}
            onChange={e => setFormData(p => ({ ...p, subjectName: e.target.value }))}
            placeholder="e.g., Data Structures"
            required
          />

          {/* NOTE: Permission field removed — all materials are always publicly 
              accessible via Google Drive anyoneWithLink. This is invisible to users. */}
        </form>
      </Modal>

      {/* ── Upload Files Modal ── */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setUploadFiles([]); }}
        title={`Upload Files — ${selectedFolder?.subjectName || ''}`}
        size="large"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowUploadModal(false); setUploadFiles([]); }}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={uploading || !uploadFiles.length}>
              {uploading
                ? `⏳ Uploading ${uploadFiles.length} file(s)…`
                : `📤 Upload ${uploadFiles.length} file(s)`}
            </Button>
          </>
        }
      >
        <div className="upload-container">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-light)', marginBottom: '1rem' }}>
            Max 50 MB per file • Up to 20 files • PDF, DOC, PPT, XLS, images, videos, ZIP
          </p>

          <div
            className={`drag-drop-zone ${isDragging ? 'drag-drop-zone--active' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div className="drag-drop-icon">📂</div>
            <p className="drag-drop-text">Drag &amp; drop files here</p>
            <p className="drag-drop-subtext">or click to browse</p>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFilesChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.mp4,.mp3"
            />
          </div>

          {uploadFiles.length > 0 && (
            <div className="upload-files-list">
              <div className="upload-files-header">
                <span>{uploadFiles.length} file(s) • {fmtSize(totalSize)}</span>
                <button className="clear-all-btn" onClick={() => setUploadFiles([])}>Clear All</button>
              </div>
              {uploadFiles.map((file, i) => (
                <div key={i} className="upload-file-item">
                  <span className="file-icon">📄</span>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{fmtSize(file.size)}</div>
                  </div>
                  <button
                    className="remove-file-btn"
                    onClick={() => setUploadFiles(p => p.filter((_, j) => j !== i))}
                    title="Remove"
                  >✕</button>
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
