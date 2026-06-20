/**
 * StudentStarred.jsx
 * ==================
 * Shows all DB-backed starred files grouped by subject.
 * Clicking a file or the open button navigates to BrowseMaterials
 * and auto-opens the parent folder — same experience as History.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  MdStar, MdStarBorder, MdFolderOpen,
  MdInsertDriveFile, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription,
  MdSearch, MdClose, MdOpenInNew
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './StudentStarred.css';

// ── File icon ──────────────────────────────────────────────────────────────
const FileIcon = ({ mimeType }) => {
  if (!mimeType)                                              return <MdInsertDriveFile className="ss-file-icon" />;
  if (mimeType.includes('pdf'))                               return <MdPictureAsPdf   className="ss-file-icon ss-icon--pdf" />;
  if (mimeType.includes('image'))                             return <MdImage          className="ss-file-icon ss-icon--img" />;
  if (mimeType.includes('video'))                             return <MdVideoFile      className="ss-file-icon ss-icon--vid" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <MdDescription className="ss-file-icon ss-icon--doc" />;
  return <MdInsertDriveFile className="ss-file-icon" />;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
  const [sortBy,    setSortBy]    = useState('latest');  // 'latest' | 'oldest' | 'name'

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
    // Optimistic update
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

  // Navigate to BrowseMaterials and auto-open the parent folder.
  // Pass via navigate state (synchronous, always available on mount).
  const handleOpenInBrowser = (materialId) => {
    navigate('/browse-materials', { state: { openFolderId: materialId } });
  };

  const filtered = [...starred]
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.fileName?.toLowerCase().includes(q) || s.subjectName?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'latest') return new Date(b.starredAt) - new Date(a.starredAt);
      if (sortBy === 'oldest') return new Date(a.starredAt) - new Date(b.starredAt);
      if (sortBy === 'name')   return (a.fileName || '').localeCompare(b.fileName || '');
      return 0;
    });

  // Group by subject
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
            <div className="ss-hero-label ss-enter" style={{ animationDelay: '80ms' }}>— favourites</div>
            <h1 className="ss-title ss-enter" style={{ animationDelay: '160ms' }}>
              Your favourites,<br /><span className="ss-title-accent">all here.</span>
            </h1>
            <p className="ss-subtitle ss-enter" style={{ animationDelay: '240ms' }}>
              Mark any file as favourite while browsing to pin it here.
              Tap <strong>Open in Browser</strong> to jump straight to that material.
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
                placeholder="Search favourites or subjects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="ss-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
            </div>
            <div className="ss-sort-btns">
              {[
                { key: 'latest', label: '🕐 Latest' },
                { key: 'oldest', label: '🕰 Oldest' },
                { key: 'name',   label: '🔤 A–Z'    },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`ss-sort-btn ${sortBy === opt.key ? 'ss-sort-btn--active' : ''}`}
                  onClick={() => setSortBy(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="ss-count">
              {starred.length} favourite{starred.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="ss-loading">
              <ImSpinner8 className="ss-spinner" />
              <span>Loading favourites…</span>
            </div>
          ) : starred.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon"><MdStarBorder /></div>
              <h3 className="ss-empty-title">No favourites yet</h3>
              <p className="ss-empty-sub">
                While browsing any material, click the ★ icon on a file to favourite it.
                It will appear here instantly — across every device.
              </p>
              <button className="ss-go-btn" onClick={() => navigate('/browse-materials')}>
                <MdFolderOpen /> All Materials
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
                    {/* Group header — click opens the whole material folder */}
                    <div className="ss-group-header">
                      <span className="ss-group-title">{group.subjectName}</span>
                      <button
                        className="ss-group-open"
                        onClick={() => handleOpenInBrowser(group.materialId)}
                        title="Open this material in Browse Materials"
                      >
                        <MdFolderOpen /> Open Folder
                      </button>
                    </div>

                    {/* File rows */}
                    <div className="ss-group-files">
                      {group.files.map((sf, fi) => (
                        <Reveal key={sf.fileId} delay={gi * 60 + fi * 35}>
                          {/* Clicking the row also opens the parent folder in BrowseMaterials */}
                          <div
                            className="ss-file-row ss-file-row--clickable"
                            onClick={() => handleOpenInBrowser(sf.materialId)}
                            title="Open in Browse Materials"
                          >
                            <div className="ss-file-icon-wrap">
                              <FileIcon mimeType={sf.mimeType} />
                            </div>
                            <div className="ss-file-info">
                              <div className="ss-file-name">{sf.fileName}</div>
                              <div className="ss-file-meta">
                                {sf.subjectName} · Added {fmtDate(sf.starredAt)}
                              </div>
                            </div>
                            {/* Open in BrowseMaterials */}
                            <button
                              className="ss-open-btn"
                              onClick={(e) => { e.stopPropagation(); handleOpenInBrowser(sf.materialId); }}
                              title="Open in Browse Materials"
                            >
                              <MdOpenInNew />
                            </button>
                            {/* Unstar */}
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
    </div>
  );
};

export default StudentStarred;
