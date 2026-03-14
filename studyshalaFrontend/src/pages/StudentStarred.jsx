import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  MdStar, MdStarBorder, MdDelete, MdFolderOpen,
  MdInsertDriveFile, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription, MdSearch, MdClose,
  MdOpenInNew, MdDownload
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './StudentStarred.css';

// ── File icon ──────────────────────────────────────────────────────────────
const FileIcon = ({ mimeType }) => {
  if (!mimeType)                    return <MdInsertDriveFile className="ss-file-icon" />;
  if (mimeType.includes('pdf'))     return <MdPictureAsPdf   className="ss-file-icon ss-icon--pdf" />;
  if (mimeType.includes('image'))   return <MdImage          className="ss-file-icon ss-icon--img" />;
  if (mimeType.includes('video'))   return <MdVideoFile      className="ss-file-icon ss-icon--vid" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
                                    return <MdDescription    className="ss-file-icon ss-icon--doc" />;
  return <MdInsertDriveFile className="ss-file-icon" />;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Inline file preview modal ──────────────────────────────────────────────
const FilePreview = ({ file, onClose }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const driveId = file.driveFileId;
  const previewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;
  const downloadUrl = driveId
    ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download&authuser=0`
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: '900px', height: '88vh',
        background: '#fff', borderRadius: '14px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 100px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', background: '#0891b2',
          flexShrink: 0
        }}>
          <span style={{ flex: 1, color: '#fff', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.fileName}
          </span>
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '7px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              <MdDownload /> Download
            </a>
          )}
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', width: '32px', height: '32px', borderRadius: '7px',
            cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#f0f9ff' }}>
          {!driveId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: '#0369a1' }}>
              <MdInsertDriveFile style={{ fontSize: '3rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem' }}>Preview not available. Ask faculty to re-upload this file.</p>
            </div>
          ) : file.mimeType?.startsWith('image/') ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
              <img src={`https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`} alt={file.fileName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }} />
            </div>
          ) : (
            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="autoplay" title={file.fileName} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('ss-visible'); obs.unobserve(el); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="ss-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
const StudentStarred = () => {
  const navigate = useNavigate();

  const [starred,     setStarred]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [search,      setSearch]      = useState('');
  const [pageReady,   setPageReady]   = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // file to preview inline

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    fetchStarred();
    return () => clearTimeout(t);
  }, []);

  const fetchStarred = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/starred-files');
      setStarred(res.data.starredFiles || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load starred files');
    } finally { setLoading(false); }
  };

  const handleUnstar = async (fileId, fileName) => {
    setStarred(prev => prev.filter(s => s.fileId !== fileId));
    try {
      await api.delete(`/student/starred-files/${fileId}`);
      setSuccess(`"${fileName}" removed from starred`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to unstar file');
      fetchStarred();
    }
  };

  // Open the file directly in preview — no folder navigation needed
  const handleOpenFile = (sf) => {
    // Build a file-like object that FilePreview understands
    setPreviewFile({
      fileName:   sf.fileName,
      mimeType:   sf.mimeType,
      driveFileId: sf.fileId, // fileId stored in starred is the Drive file ID string
    });
  };

  // Navigate to BrowseMaterials and open the parent folder
  const handleOpenMaterial = (materialId) => {
    sessionStorage.setItem('bm_open_folder', materialId);
    navigate('/browse-materials');
  };

  const filtered = starred.filter(s => {
    const q = search.toLowerCase();
    return !q || s.fileName?.toLowerCase().includes(q) || s.subjectName?.toLowerCase().includes(q);
  });

  const groups = filtered.reduce((acc, f) => {
    const key = f.subjectName || 'Unknown Material';
    if (!acc[key]) acc[key] = { subjectName: key, materialId: f.materialId, files: [] };
    acc[key].files.push(f);
    return acc;
  }, {});

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`ss-page ${pageReady ? 'ss-ready' : ''}`}>

          {/* ── Hero ── */}
          <div className="ss-hero">
            <div className="ss-hero-label ss-enter" style={{ animationDelay: '80ms' }}>— starred files</div>
            <h1 className="ss-title ss-enter" style={{ animationDelay: '160ms' }}>
              Your bookmarked<br /><span className="ss-title-accent">files.</span>
            </h1>
            <p className="ss-subtitle ss-enter" style={{ animationDelay: '240ms' }}>
              Tap any file to preview it instantly. Star any file while browsing to pin it here.
            </p>
          </div>

          {/* ── Alerts ── */}
          {error   && <div className="ss-alert ss-alert--err ss-enter"><span>⚠</span> {error}</div>}
          {success && <div className="ss-alert ss-alert--ok  ss-enter"><span>✓</span> {success}</div>}

          {/* ── Toolbar ── */}
          <div className="ss-toolbar ss-enter" style={{ animationDelay: '300ms' }}>
            <div className="ss-search-wrap">
              <MdSearch className="ss-search-icon" />
              <input
                className="ss-search"
                placeholder="Search starred files or subjects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="ss-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
            </div>
            <span className="ss-count">
              {starred.length} starred file{starred.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="ss-loading">
              <ImSpinner8 className="ss-spinner" />
              <span>Loading starred files…</span>
            </div>
          ) : starred.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon"><MdStarBorder /></div>
              <h3 className="ss-empty-title">No starred files yet</h3>
              <p className="ss-empty-sub">
                While browsing any material, click the ★ icon on a file to star it.<br />
                It will appear here instantly — on every device.
              </p>
              <button className="ss-go-btn" onClick={() => navigate('/browse-materials')}>
                <MdFolderOpen /> Browse Materials
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon"><MdSearch /></div>
              <h3 className="ss-empty-title">No results for "{search}"</h3>
            </div>
          ) : (
            <div className="ss-groups">
              {Object.values(groups).map((group, gi) => (
                <Reveal key={group.subjectName} delay={gi * 60}>
                  <div className="ss-group">
                    <div className="ss-group-header">
                      <span className="ss-group-title">{group.subjectName}</span>
                      <button className="ss-group-open" onClick={() => handleOpenMaterial(group.materialId)}>
                        <MdFolderOpen /> Open Folder
                      </button>
                    </div>
                    <div className="ss-group-files">
                      {group.files.map((sf, fi) => (
                        <Reveal key={sf.fileId} delay={gi * 60 + fi * 35}>
                          <div className="ss-file-row ss-file-row--clickable" onClick={() => handleOpenFile(sf)}>
                            <div className="ss-file-icon-wrap">
                              <FileIcon mimeType={sf.mimeType} />
                            </div>
                            <div className="ss-file-info">
                              <div className="ss-file-name">{sf.fileName}</div>
                              <div className="ss-file-meta">
                                {sf.subjectName} · Starred {fmtDate(sf.starredAt)}
                              </div>
                            </div>
                            {/* Open preview button */}
                            <button
                              className="ss-open-btn"
                              onClick={(e) => { e.stopPropagation(); handleOpenFile(sf); }}
                              title="Preview file"
                            >
                              <MdOpenInNew />
                            </button>
                            {/* Unstar button */}
                            <button
                              className="ss-unstar-btn"
                              onClick={(e) => { e.stopPropagation(); handleUnstar(sf.fileId, sf.fileName); }}
                              title="Remove star"
                            >
                              <MdStar />
                            </button>
                          </div>
                        </Reveal>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline file preview */}
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
};

export default StudentStarred;

// ── File icon ──────────────────────────────────────────────────────────────
const FileIcon = ({ mimeType }) => {
  if (!mimeType)                    return <MdInsertDriveFile className="ss-file-icon" />;
  if (mimeType.includes('pdf'))     return <MdPictureAsPdf   className="ss-file-icon ss-icon--pdf" />;
  if (mimeType.includes('image'))   return <MdImage          className="ss-file-icon ss-icon--img" />;
  if (mimeType.includes('video'))   return <MdVideoFile      className="ss-file-icon ss-icon--vid" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
                                    return <MdDescription    className="ss-file-icon ss-icon--doc" />;
  return <MdInsertDriveFile className="ss-file-icon" />;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('ss-visible'); obs.unobserve(el); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="ss-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
const StudentStarred = () => {
  const navigate = useNavigate();

  const [starred,   setStarred]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [search,    setSearch]    = useState('');
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    fetchStarred();
    return () => clearTimeout(t);
  }, []);

  const fetchStarred = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/starred-files');
      setStarred(res.data.starredFiles || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load starred files');
    } finally { setLoading(false); }
  };

  const handleUnstar = async (fileId, fileName) => {
    // Optimistic
    setStarred(prev => prev.filter(s => s.fileId !== fileId));
    try {
      await api.delete(`/student/starred-files/${fileId}`);
      setSuccess(`"${fileName}" removed from starred`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to unstar file');
      fetchStarred(); // rollback
    }
  };

  const handleOpenMaterial = (materialId) => {
    navigate('/browse-materials');
    // BrowseMaterials will open to that folder when navigated to
    sessionStorage.setItem('bm_open_folder', materialId);
  };

  const filtered = starred.filter(s => {
    const q = search.toLowerCase();
    return !q || s.fileName?.toLowerCase().includes(q) || s.subjectName?.toLowerCase().includes(q);
  });

  // Group by subject for better organisation
  const groups = filtered.reduce((acc, f) => {
    const key = f.subjectName || 'Unknown Material';
    if (!acc[key]) acc[key] = { subjectName: key, materialId: f.materialId, files: [] };
    acc[key].files.push(f);
    return acc;
  }, {});

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`ss-page ${pageReady ? 'ss-ready' : ''}`}>

          {/* ── Hero ── */}
          <div className="ss-hero">
            <div className="ss-hero-label ss-enter" style={{ animationDelay: '80ms' }}>— starred files</div>
            <h1 className="ss-title ss-enter" style={{ animationDelay: '160ms' }}>
              Your bookmarked<br /><span className="ss-title-accent">files.</span>
            </h1>
            <p className="ss-subtitle ss-enter" style={{ animationDelay: '240ms' }}>
              Star any file while browsing to pin it here. Your stars follow you across every device.
            </p>
          </div>

          {/* ── Alerts ── */}
          {error   && <div className="ss-alert ss-alert--err ss-enter"><span>⚠</span> {error}</div>}
          {success && <div className="ss-alert ss-alert--ok  ss-enter"><span>✓</span> {success}</div>}

          {/* ── Toolbar ── */}
          <div className="ss-toolbar ss-enter" style={{ animationDelay: '300ms' }}>
            <div className="ss-search-wrap">
              <MdSearch className="ss-search-icon" />
              <input
                className="ss-search"
                placeholder="Search starred files or subjects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="ss-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
            </div>
            <span className="ss-count">
              {starred.length} starred file{starred.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="ss-loading">
              <ImSpinner8 className="ss-spinner" />
              <span>Loading starred files…</span>
            </div>
          ) : starred.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon"><MdStarBorder /></div>
              <h3 className="ss-empty-title">No starred files yet</h3>
              <p className="ss-empty-sub">
                While browsing any material, click the ★ icon on a file to star it.<br />
                It will appear here instantly — on every device.
              </p>
              <button className="ss-go-btn" onClick={() => navigate('/browse-materials')}>
                <MdFolderOpen /> Browse Materials
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon"><MdSearch /></div>
              <h3 className="ss-empty-title">No results for "{search}"</h3>
            </div>
          ) : (
            <div className="ss-groups">
              {Object.values(groups).map((group, gi) => (
                <Reveal key={group.subjectName} delay={gi * 60}>
                  <div className="ss-group">
                    <div className="ss-group-header">
                      <span className="ss-group-title">{group.subjectName}</span>
                      <button className="ss-group-open" onClick={() => handleOpenMaterial(group.materialId)}>
                        <MdFolderOpen /> Open Material
                      </button>
                    </div>
                    <div className="ss-group-files">
                      {group.files.map((sf, fi) => (
                        <Reveal key={sf.fileId} delay={gi * 60 + fi * 35}>
                          <div className="ss-file-row">
                            <div className="ss-file-icon-wrap">
                              <FileIcon mimeType={sf.mimeType} />
                            </div>
                            <div className="ss-file-info">
                              <div className="ss-file-name">{sf.fileName}</div>
                              <div className="ss-file-meta">
                                Starred {fmtDate(sf.starredAt)}
                              </div>
                            </div>
                            <button
                              className="ss-unstar-btn"
                              onClick={() => handleUnstar(sf.fileId, sf.fileName)}
                              title="Remove star"
                            >
                              <MdStar />
                            </button>
                          </div>
                        </Reveal>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentStarred;
