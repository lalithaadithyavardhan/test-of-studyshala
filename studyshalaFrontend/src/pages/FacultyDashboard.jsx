/**
 * FacultyDashboard  v2
 * ====================
 * New features:
 *  - Message to students field in Create Material modal
 *  - Sub-folder creation + management in Upload modal
 *  - Files can be uploaded to a specific sub-folder or to root
 *  - Message editing via inline modal
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
import {
  MdAdd, MdContentCopy, MdCheck, MdDelete, MdUpload, MdBook,
  MdFolder, MdPerson, MdCampaign, MdEdit, MdCreateNewFolder,
  MdFolderOpen
} from 'react-icons/md';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [materials,        setMaterials]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [success,          setSuccess]          = useState('');
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [showMsgModal,     setShowMsgModal]     = useState(false);
  const [selectedFolder,   setSelectedFolder]   = useState(null);
  const [copiedId,         setCopiedId]         = useState(null);

  const [formData, setFormData] = useState({
    department: '', semester: '', subjectName: '', facultyName: '', messageToStudents: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Upload state
  const [uploadFiles,      setUploadFiles]      = useState([]);
  const [uploading,        setUploading]        = useState(false);
  const [isDragging,       setIsDragging]       = useState(false);
  const [selectedSfId,     setSelectedSfId]     = useState('');        // sub-folder target (empty = root)
  const [newSfName,        setNewSfName]        = useState('');
  const [creatingFolder,   setCreatingFolder]   = useState(false);

  // Message edit state
  const [msgText,          setMsgText]          = useState('');
  const [savingMsg,        setSavingMsg]        = useState(false);

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

  // ── Create material ──────────────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/faculty/folders', formData);
      setShowCreateModal(false);
      setFormData({ department: '', semester: '', subjectName: '', facultyName: '', messageToStudents: '' });
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

  // ── Upload helpers ───────────────────────────────────────────────────────
  const addFiles = (files) => {
    const valid = files.filter(f => {
      if (f.size > 50 * 1024 * 1024) { setError(`${f.name} exceeds 50 MB limit.`); return false; }
      return true;
    });
    setUploadFiles(prev => [...prev, ...valid]);
  };
  const handleFilesChange = (e) => addFiles(Array.from(e.target.files));
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const openUploadModal = (material) => {
    setSelectedFolder(material);
    setUploadFiles([]);
    setSelectedSfId('');
    setNewSfName('');
    setShowUploadModal(true);
  };

  // ── Create sub-folder ────────────────────────────────────────────────────
  const handleCreateSubFolder = async () => {
    if (!newSfName.trim() || !selectedFolder) return;
    setCreatingFolder(true);
    setError('');
    try {
      const res = await api.post(`/faculty/folders/${selectedFolder._id}/subfolders`, { name: newSfName.trim() });
      const newSf = res.data.subFolder;
      // Update local state so the dropdown reflects it immediately
      setSelectedFolder(prev => ({
        ...prev,
        subFolders: [...(prev.subFolders || []), newSf]
      }));
      setSelectedSfId(newSf._id);
      setNewSfName('');
      setSuccess(`Folder "${newSf.name}" created!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── Upload files ─────────────────────────────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFiles.length || !selectedFolder) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      uploadFiles.forEach(f => form.append('files', f));
      if (selectedSfId) form.append('subFolderId', selectedSfId);

      const endpoint = selectedSfId
        ? `/faculty/folders/${selectedFolder._id}/subfolders/${selectedSfId}/files`
        : `/faculty/folders/${selectedFolder._id}/files`;

      await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      setUploadFiles([]);
      setSelectedFolder(null);
      setSelectedSfId('');
      const dest = selectedSfId
        ? `into "${selectedFolder.subFolders?.find(sf => sf._id === selectedSfId)?.name || 'folder'}"`
        : 'to root';
      setSuccess(`${uploadFiles.length} file(s) uploaded successfully ${dest}!`);
      setTimeout(() => setSuccess(''), 5000);
      fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete material ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed and students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted'); setTimeout(() => setSuccess(''), 3000);
      fetchMaterials();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  // ── Message edit ─────────────────────────────────────────────────────────
  const openMsgModal = (material) => {
    setSelectedFolder(material);
    setMsgText(material.messageToStudents || '');
    setShowMsgModal(true);
  };
  const handleSaveMessage = async () => {
    if (!selectedFolder) return;
    setSavingMsg(true);
    setError('');
    try {
      await api.patch(`/faculty/folders/${selectedFolder._id}/message`, { messageToStudents: msgText });
      setShowMsgModal(false);
      setSuccess('Message updated!'); setTimeout(() => setSuccess(''), 3000);
      fetchMaterials();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save message');
    } finally { setSavingMsg(false); }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
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
            <Button onClick={() => setShowCreateModal(true)}><MdAdd /> Create Material</Button>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

          <Card title="Profile Information">
            <div className="profile-grid">
              <div className="profile-item"><span className="profile-label"><MdPerson style={{marginRight:'0.3rem'}}/>Name</span><span className="profile-value">{user?.name}</span></div>
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
              <div className="empty-state-icon"><MdFolder /></div>
              <h3>No Materials Yet</h3>
              <p>Create your first material to share with students</p>
              <Button onClick={() => setShowCreateModal(true)}>Create Material</Button>
            </div>
          ) : (
            <div className="grid grid-3">
              {materials.map(m => {
                const code       = m.accessCode || m.departmentCode;
                const rootFiles  = m.files?.length || 0;
                const sfCount    = m.subFolders?.length || 0;
                const totalFiles = rootFiles + (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
                const hasMsg     = !!m.messageToStudents?.trim();
                return (
                  <Card key={m._id} className="material-card">
                    <div className="material-icon-wrap"><MdBook /></div>
                    <h3 className="material-title">{m.subjectName}</h3>
                    <div className="material-info">
                      <span className="material-meta"><strong>Faculty:</strong> {m.facultyName}</span>
                      <span className="material-meta"><strong>Dept:</strong> {m.department}</span>
                      <span className="material-meta"><strong>Sem:</strong> {m.semester}</span>
                      <span className="material-meta"><strong>Files:</strong> {totalFiles} {sfCount > 0 && `(${sfCount} folder${sfCount !== 1 ? 's' : ''})`}</span>
                    </div>

                    {/* Message indicator */}
                    {hasMsg && (
                      <div className="material-msg-preview">
                        <MdCampaign style={{ flexShrink: 0 }} />
                        <span>{m.messageToStudents.slice(0, 60)}{m.messageToStudents.length > 60 ? '…' : ''}</span>
                      </div>
                    )}

                    <div className="access-code-box">
                      <span className="access-code-label">Student Access Code</span>
                      <div className="access-code-row">
                        <code className="access-code">{code}</code>
                        <button
                          className={`copy-btn ${copiedId === m._id ? 'copy-btn--copied' : ''}`}
                          onClick={() => copyCode(code, m._id)}
                          title="Copy code"
                        >
                          {copiedId === m._id ? <MdCheck /> : <MdContentCopy />}
                        </button>
                      </div>
                    </div>

                    <div className="material-actions">
                      <Button variant="primary" size="sm" onClick={() => openUploadModal(m)}><MdUpload /> Upload</Button>
                      <Button variant="secondary" size="sm" onClick={() => openMsgModal(m)} title="Edit message to students">
                        <MdCampaign /> {hasMsg ? 'Edit Msg' : 'Add Msg'}
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

      {/* ══ Create Material Modal ══ */}
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

          <Input label="Faculty Name *" value={formData.facultyName}
            onChange={e => setFormData(p => ({ ...p, facultyName: e.target.value }))}
            placeholder="e.g., Dr. John Smith" required />

          <div className="form-group">
            <label className="form-label">Department *</label>
            <select className="form-select" value={formData.department}
              onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} required>
              <option value="">Select</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester *</label>
            <select className="form-select" value={formData.semester}
              onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))} required>
              <option value="">Select</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <Input label="Subject Name *" value={formData.subjectName}
            onChange={e => setFormData(p => ({ ...p, subjectName: e.target.value }))}
            placeholder="e.g., Data Structures" required />

          {/* Message to students */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MdCampaign /> Message to Students <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="form-textarea"
              value={formData.messageToStudents}
              onChange={e => setFormData(p => ({ ...p, messageToStudents: e.target.value }))}
              placeholder="e.g., Unit 1 exam on Friday. Submit assignments by Sunday midnight."
              rows={3}
              maxLength={2000}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
              {formData.messageToStudents.length}/2000
            </div>
          </div>
        </form>
      </Modal>

      {/* ══ Upload Files Modal ══ */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setUploadFiles([]); setSelectedSfId(''); setNewSfName(''); }}
        title={`Upload Files — ${selectedFolder?.subjectName || ''}`}
        size="large"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowUploadModal(false); setUploadFiles([]); setSelectedSfId(''); setNewSfName(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={uploading || !uploadFiles.length}>
              {uploading ? `⏳ Uploading ${uploadFiles.length} file(s)…` : `📤 Upload ${uploadFiles.length} file(s)`}
            </Button>
          </>
        }
      >
        <div className="upload-container">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-light)', marginBottom: '1rem' }}>
            Max 50 MB per file • Up to 20 files • PDF, DOC, PPT, XLS, images, videos, ZIP
          </p>

          {/* ── Destination selector ── */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MdFolder /> Upload destination
            </label>
            <select
              className="form-select"
              value={selectedSfId}
              onChange={e => setSelectedSfId(e.target.value)}
            >
              <option value="">📂 Root (no folder)</option>
              {(selectedFolder?.subFolders || []).map(sf => (
                <option key={sf._id} value={sf._id}>📁 {sf.name} ({sf.files?.length || 0} files)</option>
              ))}
            </select>
          </div>

          {/* ── Create new sub-folder ── */}
          <div className="subfolder-create-row">
            <MdCreateNewFolder style={{ color: '#6366f1', fontSize: '1.2rem', flexShrink: 0 }} />
            <input
              className="subfolder-name-input"
              placeholder="New folder name (e.g. Unit 1, Assignments)"
              value={newSfName}
              onChange={e => setNewSfName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSubFolder(); } }}
              maxLength={60}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCreateSubFolder}
              disabled={!newSfName.trim() || creatingFolder}
              style={{ flexShrink: 0 }}
            >
              {creatingFolder ? '…' : '+ Create'}
            </Button>
          </div>

          {/* ── Drag-drop zone ── */}
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
            <input id="file-input" type="file" multiple onChange={handleFilesChange} style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.mp4,.mp3" />
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
                  <button className="remove-file-btn" onClick={() => setUploadFiles(p => p.filter((_, j) => j !== i))} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}

          {selectedSfId && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#eef2ff', borderRadius: '7px', fontSize: '0.82rem', color: '#4338ca' }}>
              📁 Files will be uploaded into: <strong>{selectedFolder?.subFolders?.find(sf => sf._id === selectedSfId)?.name}</strong>
            </div>
          )}
        </div>
      </Modal>

      {/* ══ Edit Message Modal ══ */}
      <Modal
        isOpen={showMsgModal}
        onClose={() => setShowMsgModal(false)}
        title={`Message to Students — ${selectedFolder?.subjectName || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMsgModal(false)}>Cancel</Button>
            <Button onClick={handleSaveMessage} disabled={savingMsg}>
              {savingMsg ? 'Saving…' : 'Save Message'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-light)', marginBottom: '1rem' }}>
          This message will be shown to students whenever they access or browse this material.
        </p>
        <textarea
          className="form-textarea"
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder="e.g., Unit 2 exam next week. Assignment deadline is Sunday midnight."
          rows={5}
          maxLength={2000}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
          {msgText.length}/2000
        </div>
        {msgText.trim() && (
          <button
            style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setMsgText('')}
          >
            🗑 Clear message
          </button>
        )}
      </Modal>

    </div>
  );
};

export default FacultyDashboard;
