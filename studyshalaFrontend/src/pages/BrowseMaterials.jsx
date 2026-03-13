/**
 * BrowseMaterials.jsx
 * ===================
 * Full-screen Windows Explorer-style file browser.
 * Students: preview + download
 * Faculty/Admin: + delete, edit, upload
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MdGridView, MdViewList, MdSearch, MdClose, MdFolder, MdFolderOpen,
  MdInsertDriveFile, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription,
  MdDownload, MdPreview, MdDelete, MdEdit, MdUpload, MdArrowBack,
  MdLightMode, MdDarkMode, MdMoreVert, MdCheck, MdContentCopy,
  MdFilterList, MdSort, MdInfo, MdKeyboardArrowRight, MdHome
} from 'react-icons/md';
import './BrowseMaterials.css';
import MessageBanner from '../components/MessageBanner';

// ── File type icon helper ────────────────────────────────────────────────────
const FileIcon = ({ mimeType, size = 'md' }) => {
  const cls = `bm-file-icon bm-file-icon--${size}`;
  if (!mimeType)                              return <MdInsertDriveFile className={cls} />;
  if (mimeType.includes('pdf'))               return <MdPictureAsPdf    className={`${cls} bm-icon--pdf`} />;
  if (mimeType.includes('image'))             return <MdImage           className={`${cls} bm-icon--img`} />;
  if (mimeType.includes('video'))             return <MdVideoFile       className={`${cls} bm-icon--vid`} />;
  if (mimeType.includes('word') || mimeType.includes('document'))
                                              return <MdDescription     className={`${cls} bm-icon--doc`} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
                                              return <MdDescription     className={`${cls} bm-icon--ppt`} />;
  return <MdInsertDriveFile className={cls} />;
};

// ── Format file size ─────────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ── Format date ──────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
const BrowseMaterials = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const role        = user?.role || 'student';
  const isFaculty   = role === 'faculty' || role === 'admin';

  // ── Data state ──────────────────────────────────────────────────────────
  const [folders,        setFolders]        = useState([]);   // all folders/materials
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');

  // ── UI state ────────────────────────────────────────────────────────────
  const [viewMode,       setViewMode]       = useState('grid');   // 'grid' | 'list'
  const [darkMode,       setDarkMode]       = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterDept,     setFilterDept]     = useState('all');
  const [filterSem,      setFilterSem]      = useState('all');
  const [sortBy,         setSortBy]         = useState('newest');

  // ── Selection & navigation ───────────────────────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState(null);   // folder object
  const [selectedFile,   setSelectedFile]   = useState(null);   // file object
  const [previewFile,    setPreviewFile]     = useState(null);   // file for preview panel

  // ── Modals ───────────────────────────────────────────────────────────────
  const [editModal,      setEditModal]      = useState(false);
  const [uploadModal,    setUploadModal]    = useState(false);
  const [editData,       setEditData]       = useState({});
  const [copiedCode,     setCopiedCode]     = useState(null);

  // ── Sidebar panel ────────────────────────────────────────────────────────
  const [infoPanel,      setInfoPanel]      = useState(true);

  // ── In-app preview modal ─────────────────────────────────────────────────
  const [previewModal,   setPreviewModal]   = useState(null);   // file object

  const searchRef = useRef(null);

  // Close preview on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPreviewModal(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Fetch data ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (isFaculty) {
        res = await api.get('/faculty/folders');
        setFolders(res.data.folders || []);
      } else {
        // Students see saved materials ONLY
        res = await api.get('/student/saved-materials');
        setFolders(res.data.materials || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // ── Load files for selected folder ───────────────────────────────────────
  const openFolder = async (folder) => {
    setSelectedFolder({ ...folder, files: [], subFolders: [] });
    setSelectedFile(null);
    setPreviewFile(null);
    try {
      const res = await api.get(
        isFaculty
          ? `/faculty/folders/${folder._id}`
          : `/student/materials/${folder._id}/files`
      );
      const data = isFaculty ? res.data.folder : res.data;
      setSelectedFolder(prev => ({
        ...prev,
        files:             data.files || [],
        subFolders:        data.subFolders || [],
        messageToStudents: data.messageToStudents || data.material?.messageToStudents || ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    }
  };

  // ── Derived lists ────────────────────────────────────────────────────────
  const departments = ['all', ...new Set(folders.map(f => f.department).filter(Boolean))];
  const semesters   = ['all', ...new Set(folders.map(f => f.semester).filter(Boolean))];

  const filtered = folders
    .filter(f => {
      const q = search.toLowerCase();
      return (
        (!q || f.subjectName?.toLowerCase().includes(q) || f.facultyName?.toLowerCase().includes(q)) &&
        (filterDept === 'all' || f.department === filterDept) &&
        (filterSem  === 'all' || f.semester   === filterSem)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name')   return a.subjectName.localeCompare(b.subjectName);
      return 0;
    });

  // ── Actions ──────────────────────────────────────────────────────────────

  // ── Download progress state ───────────────────────────────────────────────
  const [downloads, setDownloads] = useState([]); // [{id, name, progress, done, error}]

  const handleDownload = (file) => {
    if (!file._id || !selectedFolder?._id) {
      // Fallback: open Google Drive download URL directly
      if (file.downloadUrl) {
        window.open(file.downloadUrl, '_blank', 'noopener');
      } else {
        setError('Download not available for this file.');
      }
      return;
    }

    // Use the backend route — it validates access then redirects to Google Drive.
    // Opening in a new tab lets the browser handle the Google Drive redirect natively,
    // bypassing CORS issues that break fetch()-based downloads.
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${apiBase}/student/materials/${selectedFolder._id}/files/${file._id}/download`;

    // Show a brief toast so the user knows it started
    const dlId = file._id + '_' + Date.now();
    setDownloads(prev => [...prev, { id: dlId, name: file.name, progress: null, done: false, error: null }]);

    window.open(url, '_blank', 'noopener');

    // Mark done after 2s (browser has taken over)
    setTimeout(() => {
      setDownloads(prev => prev.map(d => d.id === dlId ? { ...d, done: true } : d));
      setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== dlId)), 3000);
    }, 2000);
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete this material? Students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted');
      if (selectedFolder?._id === id) { setSelectedFolder(null); setSelectedFile(null); }
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteFile = async (folderId, fileId) => {
    if (!window.confirm('Remove this file?')) return;
    try {
      await api.delete(`/faculty/folders/${folderId}/files/${fileId}`);
      setSuccess('File removed');
      setSelectedFile(null);
      setPreviewFile(null);
      openFolder(selectedFolder);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openEdit = (folder) => {
    setEditData({ id: folder._id, subjectName: folder.subjectName, semester: folder.semester, department: folder.department });
    setEditModal(true);
  };

  const handleEdit = async () => {
    try {
      await api.put(`/faculty/folders/${editData.id}`, {
        subjectName: editData.subjectName,
        semester:    editData.semester,
        department:  editData.department
      });
      setSuccess('Material updated');
      setEditModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  // ── Theme class ──────────────────────────────────────────────────────────
  const themeClass = darkMode ? 'bm-dark' : 'bm-light';

  // ── Breadcrumb ───────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div className="bm-breadcrumb">
      <button onClick={() => { setSelectedFolder(null); setSelectedFile(null); setPreviewFile(null); }}>
        <MdHome /> Materials
      </button>
      {selectedFolder && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          {selectedFolder._activeSubFolder ? (
            <button onClick={() => setSelectedFolder(prev => ({ ...prev, files: prev._parentFiles || [], subFolders: prev._parentSubFolders || [], _activeSubFolder: null, _parentFiles: null, _parentSubFolders: null }))}>
              {selectedFolder.subjectName}
            </button>
          ) : (
            <span>{selectedFolder.subjectName}</span>
          )}
        </>
      )}
      {selectedFolder?._activeSubFolder && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          <span>{selectedFolder._activeSubFolder}</span>
        </>
      )}
      {selectedFile && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          <span>{selectedFile.name}</span>
        </>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={`bm-root ${themeClass}`}>

      {/* ── Top Bar ── */}
      <div className="bm-topbar">
        <div className="bm-topbar-left">
          <button className="bm-back-btn" onClick={() => navigate(-1)} title="Go back">
            <MdArrowBack />
          </button>
          <span className="bm-topbar-title">
            <MdFolderOpen /> Browse Materials
          </span>
          <Breadcrumb />
        </div>

        <div className="bm-topbar-right">
          {/* Search */}
          <div className="bm-search-wrap">
            <MdSearch className="bm-search-icon" />
            <input
              ref={searchRef}
              className="bm-search"
              placeholder="Search materials…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="bm-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
          </div>

          {/* View toggle */}
          <div className="bm-view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid view"><MdGridView /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List view"><MdViewList /></button>
          </div>

          {/* Dark mode */}
          <button className="bm-theme-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
            {darkMode ? <MdLightMode /> : <MdDarkMode />}
          </button>

          {/* Info panel toggle */}
          <button className="bm-theme-btn" onClick={() => setInfoPanel(!infoPanel)} title="Details panel">
            <MdInfo />
          </button>

          {/* Close */}
          <button className="bm-close-btn" onClick={() => navigate(-1)} title="Close">
            <MdClose />
          </button>
        </div>
      </div>

      {/* ── Toolbar (filters + sort) ── */}
      <div className="bm-toolbar">
        <div className="bm-toolbar-left">
          <MdFilterList className="bm-toolbar-icon" />
          <select className="bm-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
          </select>
          <select className="bm-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
            {semesters.map(s => <option key={s} value={s}>{s === 'all' ? 'All Semesters' : `Sem ${s}`}</option>)}
          </select>
        </div>
        <div className="bm-toolbar-right">
          <MdSort className="bm-toolbar-icon" />
          <select className="bm-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
          </select>
          <span className="bm-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error   && <div className="bm-alert bm-alert--error">{error}<button onClick={() => setError('')}><MdClose /></button></div>}
      {success && <div className="bm-alert bm-alert--success">✅ {success}</div>}

      {/* ── Body ── */}
      <div className="bm-body">

        {/* ── Left panel: folder/file list ── */}
        <div className={`bm-main ${infoPanel ? 'bm-main--with-panel' : ''}`}>

          {loading ? (
            <div className="bm-empty"><div className="bm-spinner" /><p>Loading materials…</p></div>
          ) : !selectedFolder ? (
            /* ── Folder listing ── */
            filtered.length === 0 ? (
              <div className="bm-empty">
                <MdFolder className="bm-empty-icon" />
                <p>{search ? 'No results found' : 'No materials available'}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="bm-grid">
                {filtered.map(folder => (
                  <div
                    key={folder._id}
                    className={`bm-folder-card ${selectedFolder?._id === folder._id ? 'selected' : ''}`}
                    onDoubleClick={() => openFolder(folder)}
                    onClick={() => openFolder(folder)}
                  >
                    <div className="bm-folder-card-icon">
                      <MdFolder className="bm-folder-icon" />
                    </div>
                    <div className="bm-folder-card-info">
                      <span className="bm-folder-name">{folder.subjectName}</span>
                      <span className="bm-folder-meta">{folder.department} · Sem {folder.semester}</span>
                      <span className="bm-folder-meta">{folder.fileCount ?? 0} file(s)</span>
                    </div>
                    {isFaculty && (
                      <div className="bm-folder-card-actions" onClick={e => e.stopPropagation()}>
                        <button title="Copy code" onClick={() => copyCode(folder.accessCode || folder.departmentCode, folder._id)}>
                          {copiedCode === folder._id ? <MdCheck className="bm-action--copied" /> : <MdContentCopy />}
                        </button>
                        <button title="Edit" onClick={() => openEdit(folder)}><MdEdit /></button>
                        <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFolder(folder._id)}><MdDelete /></button>
                      </div>
                    )}
                    <button className="bm-open-btn" onClick={() => openFolder(folder)}>Open →</button>
                  </div>
                ))}
              </div>
            ) : (
              /* ── List view ── */
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Faculty</th>
                    <th>Files</th>
                    <th>Date</th>
                    {isFaculty && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(folder => (
                    <tr key={folder._id} onDoubleClick={() => openFolder(folder)} className={selectedFolder?._id === folder._id ? 'selected' : ''}>
                      <td className="bm-table-name">
                        <MdFolder className="bm-folder-icon-sm" />
                        {folder.subjectName}
                      </td>
                      <td>{folder.department}</td>
                      <td>Sem {folder.semester}</td>
                      <td>{folder.facultyName}</td>
                      <td>{folder.fileCount ?? 0}</td>
                      <td>{fmtDate(folder.createdAt)}</td>
                      {isFaculty && (
                        <td className="bm-table-actions" onClick={e => e.stopPropagation()}>
                          <button title="Open" onClick={() => openFolder(folder)}><MdFolderOpen /></button>
                          <button title="Edit" onClick={() => openEdit(folder)}><MdEdit /></button>
                          <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFolder(folder._id)}><MdDelete /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* ── Files inside folder ── */
            <div>
              <div className="bm-folder-header">
                {selectedFolder._activeSubFolder ? (
                  <button className="bm-breadcrumb-back" onClick={() => setSelectedFolder(prev => ({ ...prev, files: prev._parentFiles || [], subFolders: prev._parentSubFolders || [], _activeSubFolder: null, _parentFiles: null, _parentSubFolders: null }))}>
                    <MdArrowBack /> Back to {selectedFolder.subjectName}
                  </button>
                ) : (
                  <button className="bm-breadcrumb-back" onClick={() => { setSelectedFolder(null); setSelectedFile(null); setPreviewFile(null); }}>
                    <MdArrowBack /> Back to Materials
                  </button>
                )}
                {isFaculty && !selectedFolder._activeSubFolder && (
                  <button className="bm-upload-btn" onClick={() => setUploadModal(true)}>
                    <MdUpload /> Upload File
                  </button>
                )}
              </div>

              {/* Faculty message banner */}
              {selectedFolder.messageToStudents && (
                <div style={{ margin: '0.5rem 0 0.75rem' }}>
                  <MessageBanner message={selectedFolder.messageToStudents} facultyName={selectedFolder.facultyName} />
                </div>
              )}

              {!selectedFolder.files ? (
                <div className="bm-empty"><div className="bm-spinner" /></div>
              ) : (
                <>
                  {/* Sub-folder tiles */}
                  {(selectedFolder.subFolders || []).length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                        📁 Folders
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: '0.6rem' }}>
                        {(selectedFolder.subFolders || []).map(sf => (
                          <div
                            key={sf._id}
                            style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem 0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                            onClick={() => setSelectedFolder(prev => ({ ...prev, files: sf.files || [], _activeSubFolder: sf.name, _parentFiles: prev.files, _parentSubFolders: prev.subFolders }))}
                            title={`Open ${sf.name}`}
                          >
                            <MdFolder style={{ fontSize: '2.4rem', color: '#6366f1' }} />
                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', wordBreak: 'break-word' }}>{sf.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#6366f1' }}>{sf.files?.length || 0} file(s)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Root files */}
                  {selectedFolder.files.length === 0 && (selectedFolder.subFolders || []).length === 0 ? (
                    <div className="bm-empty">
                      <MdInsertDriveFile className="bm-empty-icon" />
                      <p>No files in this material yet</p>
                    </div>
                  ) : selectedFolder.files.length > 0 ? (
                    <>
                      {(selectedFolder.subFolders || []).length > 0 && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                          📄 Files
                        </div>
                      )}
                      {viewMode === 'grid' ? (
                <div className="bm-grid">
                  {selectedFolder.files.map(file => (
                    <div
                      key={file._id}
                      className={`bm-file-card ${selectedFile?._id === file._id ? 'selected' : ''}`}
                      onClick={() => { setSelectedFile(file); setPreviewFile(file); }}
                      onDoubleClick={() => file.previewUrl && setPreviewModal(file)}
                    >
                      <div className="bm-file-card-icon">
                        <FileIcon mimeType={file.mimeType} size="lg" />
                      </div>
                      <span className="bm-file-name" title={file.name}>{file.name}</span>
                      <span className="bm-file-size">{fmtSize(file.size)}</span>
                      <div className="bm-file-card-actions" onClick={e => e.stopPropagation()}>
                        {file.previewUrl  && <button title="Preview"  onClick={() => setPreviewModal(file)}><MdPreview /></button>}
                        {file.downloadUrl && <button title="Download" onClick={() => handleDownload(file)}><MdDownload /></button>}
                        {isFaculty        && <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFile(selectedFolder._id, file._id)}><MdDelete /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFolder.files.map(file => (
                      <tr
                        key={file._id}
                        className={selectedFile?._id === file._id ? 'selected' : ''}
                        onClick={() => { setSelectedFile(file); setPreviewFile(file); }}
                      >
                        <td className="bm-table-name">
                          <FileIcon mimeType={file.mimeType} size="sm" />
                          {file.name}
                        </td>
                        <td>{file.mimeType?.split('/')[1]?.toUpperCase() || '—'}</td>
                        <td>{fmtSize(file.size)}</td>
                        <td>{fmtDate(file.uploadedAt)}</td>
                        <td className="bm-table-actions" onClick={e => e.stopPropagation()}>
                          {file.previewUrl  && <button title="Preview"  onClick={() => setPreviewModal(file)}><MdPreview /></button>}
                          {file.downloadUrl && <button title="Download" onClick={() => handleDownload(file)}><MdDownload /></button>}
                          {isFaculty        && <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFile(selectedFolder._id, file._id)}><MdDelete /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Details / Preview panel ── */}
        {infoPanel && (
          <div className="bm-panel">
            {previewFile ? (
              <>
                <div className="bm-panel-header">
                  <span>File Details</span>
                  <button onClick={() => { setPreviewFile(null); setSelectedFile(null); }}><MdClose /></button>
                </div>
                <div className="bm-panel-preview">
                  {previewFile.mimeType?.includes('image') ? (
                    <img src={previewFile.previewUrl} alt={previewFile.name} className="bm-panel-img" />
                  ) : (
                    <div className="bm-panel-file-icon">
                      <FileIcon mimeType={previewFile.mimeType} size="xl" />
                    </div>
                  )}
                </div>
                <div className="bm-panel-info">
                  <p className="bm-panel-filename">{previewFile.name}</p>
                  <div className="bm-panel-row"><span>Size</span><span>{fmtSize(previewFile.size)}</span></div>
                  <div className="bm-panel-row"><span>Type</span><span>{previewFile.mimeType?.split('/')[1]?.toUpperCase() || '—'}</span></div>
                  <div className="bm-panel-row"><span>Uploaded</span><span>{fmtDate(previewFile.uploadedAt)}</span></div>
                </div>
                <div className="bm-panel-actions">
                  {previewFile.previewUrl  && <button className="bm-panel-btn bm-panel-btn--primary"  onClick={() => setPreviewModal(previewFile)}><MdPreview /> Preview</button>}
                  {previewFile.downloadUrl && <button className="bm-panel-btn bm-panel-btn--secondary" onClick={() => handleDownload(previewFile)}><MdDownload /> Download</button>}
                  {isFaculty               && <button className="bm-panel-btn bm-panel-btn--danger"   onClick={() => handleDeleteFile(selectedFolder._id, previewFile._id)}><MdDelete /> Delete</button>}
                </div>
              </>
            ) : selectedFolder ? (
              <>
                <div className="bm-panel-header"><span>Folder Info</span></div>
                <div className="bm-panel-file-icon"><MdFolderOpen className="bm-folder-icon-xl" /></div>
                <div className="bm-panel-info">
                  <p className="bm-panel-filename">{selectedFolder.subjectName}</p>
                  <div className="bm-panel-row"><span>Department</span><span>{selectedFolder.department}</span></div>
                  <div className="bm-panel-row"><span>Semester</span><span>Sem {selectedFolder.semester}</span></div>
                  <div className="bm-panel-row"><span>Faculty</span><span>{selectedFolder.facultyName}</span></div>
                  <div className="bm-panel-row"><span>Files</span><span>{selectedFolder.files?.length ?? '…'}</span></div>
                  <div className="bm-panel-row"><span>Created</span><span>{fmtDate(selectedFolder.createdAt)}</span></div>
                  {isFaculty && selectedFolder.accessCode && (
                    <div className="bm-panel-row bm-panel-code">
                      <span>Code</span>
                      <span className="bm-code-tag">
                        {selectedFolder.accessCode}
                        <button onClick={() => copyCode(selectedFolder.accessCode, 'panel')}>
                          {copiedCode === 'panel' ? <MdCheck /> : <MdContentCopy />}
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                {isFaculty && (
                  <div className="bm-panel-actions">
                    <button className="bm-panel-btn bm-panel-btn--primary"    onClick={() => openEdit(selectedFolder)}><MdEdit /> Edit Details</button>
                    <button className="bm-panel-btn bm-panel-btn--danger"     onClick={() => handleDeleteFolder(selectedFolder._id)}><MdDelete /> Delete</button>
                  </div>
                )}
              </>
            ) : (
              <div className="bm-panel-empty">
                <MdFolder className="bm-panel-empty-icon" />
                <p>Select a folder or file to see details</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="bm-modal-overlay" onClick={() => setEditModal(false)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <h3>Edit Material</h3>
              <button onClick={() => setEditModal(false)}><MdClose /></button>
            </div>
            <div className="bm-modal-body">
              <label>Subject Name</label>
              <input className="bm-input" value={editData.subjectName || ''} onChange={e => setEditData(p => ({ ...p, subjectName: e.target.value }))} />
              <label>Department</label>
              <input className="bm-input" value={editData.department || ''} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} />
              <label>Semester</label>
              <input className="bm-input" value={editData.semester || ''} onChange={e => setEditData(p => ({ ...p, semester: e.target.value }))} />
            </div>
            <div className="bm-modal-footer">
              <button className="bm-btn bm-btn--secondary" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="bm-btn bm-btn--primary" onClick={handleEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload notice modal (redirect to full upload page) ── */}
      {uploadModal && (
        <div className="bm-modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <h3>Upload File</h3>
              <button onClick={() => setUploadModal(false)}><MdClose /></button>
            </div>
            <div className="bm-modal-body">
              <p>To upload files, go to your Materials page and use the upload feature there.</p>
            </div>
            <div className="bm-modal-footer">
              <button className="bm-btn bm-btn--secondary" onClick={() => setUploadModal(false)}>Cancel</button>
              <button className="bm-btn bm-btn--primary" onClick={() => navigate('/faculty/materials')}>Go to Materials</button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-app File Preview — rendered via portal, true top layer ── */}
      {previewModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null); }}
        >
          <div style={{
            width: 'calc(100% - 2rem)', maxWidth: '1100px',
            height: '92vh', background: '#1e293b',
            borderRadius: '12px', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.8)'
          }}>
            {/* Header — just filename + close, no extra buttons */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1.25rem', background: '#0f172a',
              borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0
            }}>
              <span style={{
                flex: 1, color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {previewModal.name}
              </span>
              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', width: '2rem', height: '2rem', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '1.1rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                title="Close (Esc)"
              >✕</button>
            </div>
            {/* Preview body */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#f8fafc', position: 'relative' }}>
              {previewModal.mimeType?.startsWith('image/') ? (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#0f172a', overflow: 'auto', padding: '1rem'
                }}>
                  <img
                    src={`https://drive.google.com/thumbnail?id=${previewModal.driveFileId}&sz=w2000`}
                    alt={previewModal.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              ) : (
                <iframe
                  src={previewModal.previewUrl || `https://drive.google.com/file/d/${previewModal.driveFileId}/preview`}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="autoplay"
                  title={previewModal.name}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Download progress toasts ── */}
      {downloads.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
          minWidth: '320px', maxWidth: '420px', width: '90vw',
        }}>
          {downloads.map(dl => (
            <div key={dl.id} style={{
              background: dl.error ? '#fef2f2' : dl.done ? '#f0fdf4' : '#1e293b',
              border: `1px solid ${dl.error ? '#fca5a5' : dl.done ? '#86efac' : '#334155'}`,
              borderRadius: '10px', padding: '0.75rem 1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: dl.done || dl.error ? '0' : '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: dl.error ? '#dc2626' : dl.done ? '#16a34a' : '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                  {dl.error ? '❌ ' : dl.done ? '✅ ' : '⬇️ '}{dl.name}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dl.error ? '#dc2626' : dl.done ? '#16a34a' : '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>
                  {dl.error ? 'Failed' : dl.done ? 'Opening…' : 'Starting…'}
                </span>
              </div>
              {!dl.done && !dl.error && (
                <div style={{ height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '40%',
                    background: 'linear-gradient(90deg,#6366f1,#818cf8)',
                    borderRadius: '3px',
                    animation: 'bmSlide 1.2s ease-in-out infinite',
                  }} />
                </div>
              )}
              {dl.error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>{dl.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseMaterials;
