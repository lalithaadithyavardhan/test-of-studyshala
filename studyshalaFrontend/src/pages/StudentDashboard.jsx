import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [materials, setMaterials]        = useState([]);
  const [filteredMaterials, setFiltered] = useState([]);
  const [loading, setLoading]            = useState(false);
  const [error, setError]                = useState('');
  const [validated, setValidated]        = useState(false);
  const [accessCode, setAccessCode]      = useState('');
  const [validating, setValidating]      = useState(false);
  const [currentPage, setCurrentPage]    = useState(1);
  const [filters, setFilters]            = useState({ search: '', semester: '', faculty: '' });
  
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const itemsPerPage = 6;

  // Check if user has a saved code on mount
  useEffect(() => {
    if (user?.departmentCode) {
      setAccessCode(user.departmentCode);
      setValidated(true);
      fetchMaterials();
    }
  }, []);

  useEffect(() => { applyFilters(); }, [materials, filters]);

  const applyFilters = () => {
    let list = [...materials];
    if (filters.search)   list = list.filter(m => m.subjectName.toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.semester) list = list.filter(m => m.semester === filters.semester);
    if (filters.faculty)  list = list.filter(m => m.facultyName?.toLowerCase().includes(filters.faculty.toLowerCase()));
    setFiltered(list);
    setCurrentPage(1);
  };

  const handleValidation = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setValidating(true);
    setError('');

    try {
      const res = await api.post('/student/validate', { departmentCode: accessCode.trim() });

      if (res.data.valid) {
        const mat = res.data.material;
        setMaterials(mat ? [mat] : []);
        setValidated(true);
        fetchMaterials();
      } else {
        setError('❌ Invalid code or no active materials found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/materials');
      setMaterials(res.data.materials || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const openFileBrowser = async (material) => {
    setSelectedMaterial(material);
    setFiles([]);
    setShowFilesModal(true);
    setLoadingFiles(true);

    try {
      const res = await api.get(`/student/folders/${material._id}/files`);
      setFiles(res.data.files || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloading(fileId);
    try {
      const res = await api.get(
        `/student/folders/${selectedMaterial._id}/files/${fileId}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📄';
  };

  const totalPages   = Math.ceil(filteredMaterials.length / itemsPerPage);
  const currentItems = filteredMaterials.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
  const uniqueSemesters = [...new Set(materials.map(m => m.semester))].sort();
  const uniqueFaculty   = [...new Set(materials.map(m => m.facultyName).filter(Boolean))].sort();

  // ── Code entry (only shows if no saved code) ──────────────────────────────
  if (!validated) {
    return (
      <div className="app-container">
        <Sidebar role="student" />
        <div className="main-content">
          <Navbar />
          <div className="page-container">
            <div className="validation-container">
              <Card title="🔑 Enter Access Code">
                <p className="validation-description">
                  Enter the code shared by your faculty to unlock study materials
                </p>

                {error && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{error}</div>}

                <form onSubmit={handleValidation}>
                  <Input label="Access Code" value={accessCode}
                    onChange={e => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g., A3F9K2BX" required
                    style={{fontFamily:'monospace',fontSize:'1.2rem',letterSpacing:'3px',textTransform:'uppercase'}} />
                  <p className="code-hint">8 characters • Case-insensitive • Saved to your account</p>
                  <Button type="submit" disabled={validating || !accessCode.trim()} className="w-full">
                    {validating ? '⏳ Validating…' : '🔓 Unlock Materials'}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Materials browser ──────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          {/* Header with code badge */}
          <div className="page-header">
            <div>
              <h1>Study Materials</h1>
              <div className="active-code-badge">
                🔑 Active Code: <strong>{accessCode}</strong>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{error}</div>}

          {/* Filters */}
          <Card title="🔍 Filter Materials">
            <div className="filters-grid">
              <Input label="Search Subject" value={filters.search}
                onChange={e => setFilters(p => ({...p, search: e.target.value}))}
                placeholder="Search by subject name…" />
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-select" value={filters.semester}
                  onChange={e => setFilters(p => ({...p, semester: e.target.value}))}>
                  <option value="">All Semesters</option>
                  {uniqueSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Faculty</label>
                <select className="form-select" value={filters.faculty}
                  onChange={e => setFilters(p => ({...p, faculty: e.target.value}))}>
                  <option value="">All Faculty</option>
                  {uniqueFaculty.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="section-header" style={{marginTop:'1.5rem'}}>
            <h2>Available Materials</h2>
            <span className="count-badge">{filteredMaterials.length} Materials</span>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : currentItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>No Materials Found</h3>
              <p>{filters.search || filters.semester || filters.faculty ? 'Try adjusting filters' : 'No materials available yet'}</p>
            </div>
          ) : (
            <>
              <div className="materials-grid">
                {currentItems.map(m => (
                  <div key={m._id} className="material-card-modern">
                    <div className="material-card-header">
                      <div className="material-subject-icon">📖</div>
                      <h3 className="material-subject-title">{m.subjectName}</h3>
                    </div>
                    <div className="material-card-body">
                      <div className="material-detail-row">
                        <span className="material-detail-label">👨‍🏫 Faculty</span>
                        <span className="material-detail-value">{m.facultyName}</span>
                      </div>
                      <div className="material-detail-row">
                        <span className="material-detail-label">🏢 Department</span>
                        <span className="material-detail-value">{m.department}</span>
                      </div>
                      <div className="material-detail-row">
                        <span className="material-detail-label">📅 Semester</span>
                        <span className="material-detail-value">Semester {m.semester}</span>
                      </div>
                      <div className="material-detail-row">
                        <span className="material-detail-label">📁 Files</span>
                        <span className="material-detail-value">{m.fileCount} file(s)</span>
                      </div>
                    </div>
                    <div className="material-card-footer">
                      <Button variant="primary" onClick={() => openFileBrowser(m)} className="w-full">
                        📂 Browse Files
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => p-1)} disabled={currentPage===1}>← Previous</button>
                  {[...Array(totalPages)].map((_,i) => (
                    <button key={i+1} onClick={() => setCurrentPage(i+1)}
                      className={currentPage===i+1 ? 'active' : ''}>{i+1}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => p+1)} disabled={currentPage===totalPages}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File Browser Modal */}
      <Modal isOpen={showFilesModal} onClose={() => setShowFilesModal(false)}
        title={`📂 ${selectedMaterial?.subjectName || 'Files'}`}
        size="large">
        {loadingFiles ? (
          <div className="loading-container" style={{padding:'2rem'}}>
            <div className="spinner"></div>
            <p style={{marginTop:'1rem',color:'var(--text-secondary-light)'}}>Loading files…</p>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state" style={{padding:'2rem'}}>
            <div className="empty-state-icon">📭</div>
            <h3>No Files Yet</h3>
            <p>Faculty hasn't uploaded any files to this material</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map(f => (
              <div key={f._id} className="file-item">
                <div className="file-item-icon">{getFileIcon(f.mimeType)}</div>
                <div className="file-item-info">
                  <div className="file-item-name">{f.name}</div>
                  <div className="file-item-meta">
                    {formatFileSize(f.size)} • {new Date(f.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="primary" size="sm"
                  onClick={() => handleDownload(f._id, f.name)}
                  disabled={downloading === f._id}>
                  {downloading === f._id ? '⏳' : '⬇️ Download'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentDashboard;
