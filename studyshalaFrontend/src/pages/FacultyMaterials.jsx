/**
 * FacultyMaterials.jsx — Editorial redesign
 * Same design system: Lora · IBM Plex Mono · Lato · full dark mode
 */

import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FileManager from '../components/FileManager';
import {
  MdBook, MdFolder, MdDelete, MdContentCopy, MdCheck,
  MdCampaign, MdFolderOpen, MdSearch, MdClose
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './FacultyMaterials.css';

// ── Scroll-reveal wrapper ────────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('fm-visible'); obs.unobserve(el); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="fm-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const FacultyMaterials = () => {
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [copiedId,     setCopiedId]     = useState(null);
  const [search,       setSearch]       = useState('');
  const [pageReady,    setPageReady]    = useState(false);

  const [fmOpen,       setFmOpen]       = useState(false);
  const [fmLoading,    setFmLoading]    = useState(false);
  const [fmMaterial,   setFmMaterial]   = useState(null);
  const [fmFiles,      setFmFiles]      = useState([]);
  const [fmSubFolders, setFmSubFolders] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    fetchMaterials();
    return () => clearTimeout(t);
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed and students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted'); setTimeout(() => setSuccess(''), 3000);
      fetchMaterials();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const openFileManager = async (m) => {
    setFmMaterial(m);
    setFmFiles(m.files || []);
    setFmSubFolders(m.subFolders || []);
    setFmLoading(true);
    setFmOpen(true);
    try {
      const res = await api.get(`/faculty/folders/${m._id}`);
      const updated = res.data.folder;
      setFmFiles(updated.files || []);
      setFmSubFolders(updated.subFolders || []);
      setFmMaterial(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally { setFmLoading(false); }
  };

  const filtered = materials.filter(m => {
    const q = search.toLowerCase();
    return !q ||
      m.subjectName?.toLowerCase().includes(q) ||
      m.facultyName?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q);
  });

  return (
    <div className="app-container">
      <Sidebar role="faculty" />
      <div className="main-content">
        <Navbar />
        <div className={`fm-page ${pageReady ? 'fm-ready' : ''}`}>

          {/* ── Hero ── */}
          <div className="fm-hero">
            <div className="fm-hero-label fm-enter" style={{ animationDelay: '80ms' }}>— my materials</div>
            <h1 className="fm-title fm-enter" style={{ animationDelay: '160ms' }}>
              Browse &amp; manage<br /><span className="fm-title-accent">your uploads.</span>
            </h1>
            <p className="fm-subtitle fm-enter" style={{ animationDelay: '240ms' }}>
              View every file you've shared with students, manage sub-folders, and keep everything organised.
            </p>
          </div>

          {/* ── Alerts ── */}
          {error   && <div className="fm-alert fm-alert--err fm-enter"><span>⚠</span> {error}</div>}
          {success && <div className="fm-alert fm-alert--ok  fm-enter"><span>✓</span> {success}</div>}

          {/* ── Search + count bar ── */}
          <div className="fm-toolbar fm-enter" style={{ animationDelay: '300ms' }}>
            <div className="fm-search-wrap">
              <MdSearch className="fm-search-icon" />
              <input
                className="fm-search"
                placeholder="Search by subject, faculty, department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="fm-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
            </div>
            <span className="fm-count">{filtered.length} material{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="fm-loading">
              <ImSpinner8 className="fm-spinner" />
              <span>Loading materials…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="fm-empty">
              <div className="fm-empty-icon"><MdFolder /></div>
              <h3 className="fm-empty-title">{search ? 'No results found' : 'No materials yet'}</h3>
              <p className="fm-empty-sub">
                {search ? `No materials match "${search}"` : 'Create materials from the Dashboard to see them here'}
              </p>
            </div>
          ) : (
            <div className="fm-list">
              {filtered.map((m, i) => {
                const code       = m.accessCode || m.departmentCode;
                const rootFiles  = m.files?.length || 0;
                const sfCount    = m.subFolders?.length || 0;
                const totalFiles = rootFiles + (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
                const hasMsg     = !!m.messageToStudents?.trim();

                return (
                  <Reveal key={m._id} delay={i * 50}>
                    <div className="fm-card">
                      {/* Left icon */}
                      <div className="fm-card-icon"><MdBook /></div>

                      {/* Main info */}
                      <div className="fm-card-body">
                        <div className="fm-card-top">
                          <h3 className="fm-card-title">{m.subjectName}</h3>
                          {hasMsg && <span className="fm-msg-badge"><MdCampaign /> message</span>}
                        </div>

                        <div className="fm-card-meta">
                          <span>{m.facultyName}</span>
                          <span className="fm-dot">·</span>
                          <span>{m.department}</span>
                          <span className="fm-dot">·</span>
                          <span>Sem {m.semester}</span>
                          <span className="fm-dot">·</span>
                          <span>{totalFiles} file{totalFiles !== 1 ? 's' : ''}{sfCount > 0 ? ` · ${sfCount} folder${sfCount !== 1 ? 's' : ''}` : ''}</span>
                        </div>

                        {/* Sub-folder chips */}
                        {sfCount > 0 && (
                          <div className="fm-sf-list">
                            {m.subFolders.map(sf => (
                              <span key={sf._id} className="fm-sf-chip">
                                <MdFolderOpen /> {sf.name} <em>{sf.files?.length || 0}</em>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Message preview */}
                        {hasMsg && (
                          <div className="fm-msg-preview">
                            <MdCampaign />
                            <span>{m.messageToStudents.slice(0, 90)}{m.messageToStudents.length > 90 ? '…' : ''}</span>
                          </div>
                        )}

                        {/* Code row */}
                        <div className="fm-code-row">
                          <code className="fm-code">{code}</code>
                          <button
                            className={`fm-copy-btn ${copiedId === m._id ? 'fm-copy-btn--done' : ''}`}
                            onClick={() => copyCode(code, m._id)}
                            title="Copy code"
                          >
                            {copiedId === m._id ? <><MdCheck /> Copied</> : <><MdContentCopy /> Copy</>}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="fm-card-actions">
                        <button className="fm-btn fm-btn--primary" onClick={() => openFileManager(m)}>
                          <MdFolderOpen /> Browse Files
                        </button>
                        <button className="fm-btn fm-btn--danger" onClick={() => handleDelete(m._id)}>
                          <MdDelete /> Delete
                        </button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fmOpen && !fmLoading && fmMaterial && (
        <FileManager
          files={fmFiles}
          subFolders={fmSubFolders}
          materialName={fmMaterial.subjectName}
          onClose={() => { setFmOpen(false); setFmFiles([]); setFmSubFolders([]); setFmMaterial(null); }}
        />
      )}
    </div>
  );
};

export default FacultyMaterials;
