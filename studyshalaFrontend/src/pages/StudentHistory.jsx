import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FileManager from '../components/FileManager';
import { MdMenuBook, MdHistory, MdCampaign, MdFolderOpen } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './StudentHistory.css';

const RevealItem = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="sh-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const StudentHistory = () => {
  const [history,      setHistory]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [pageReady,    setPageReady]    = useState(false);
  const [fmOpen,       setFmOpen]       = useState(false);
  const [fmLoading,    setFmLoading]    = useState(false);
  const [fmFiles,      setFmFiles]      = useState([]);
  const [fmSubFolders, setFmSubFolders] = useState([]);
  const [fmMaterial,   setFmMaterial]   = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    fetchHistory();
    return () => clearTimeout(t);
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/access-history');
      setHistory(res.data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch access history');
    } finally { setLoading(false); }
  };

  const handleSave = async (id) => {
    try {
      await api.post('/student/save-material', { materialId: id });
      setSuccess('Material saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchHistory();
    } catch { setError('Failed to save material'); }
  };

  const openMaterial = async (item) => {
    setFmMaterial(item);
    setFmLoading(true);
    setFmOpen(true);
    try {
      const res = await api.get(`/student/materials/${item._id}/files`);
      setFmFiles(res.data.files || []);
      setFmSubFolders(res.data.subFolders || []);
      setFmMaterial(prev => ({ ...prev, ...res.data.material }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
      setFmOpen(false);
    } finally { setFmLoading(false); }
  };

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`sh-page ${pageReady ? 'sh-ready' : ''}`}>

          <div className="sh-hero">
            <div className="sh-hero-label sh-enter" style={{ animationDelay: '80ms' }}>— access history</div>
            <h1 className="sh-title sh-enter" style={{ animationDelay: '160ms' }}>
              Your history,<br /><span className="sh-title-accent">all in one place.</span>
            </h1>
            <p className="sh-subtitle sh-enter" style={{ animationDelay: '240ms' }}>
              Every material you've accessed using a code appears below.
              Save ones you want to keep, or open them again anytime.
            </p>
          </div>

          {error   && <div className="sh-alert sh-alert--err sh-enter" style={{ animationDelay: '280ms' }}><span>⚠</span> {error}</div>}
          {success && <div className="sh-alert sh-alert--ok  sh-enter" style={{ animationDelay: '280ms' }}><span>✓</span> {success}</div>}

          {loading ? (
            <div className="sh-loading sh-enter" style={{ animationDelay: '300ms' }}>
              <ImSpinner8 className="sh-spinner" />
              <span>Loading your history…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="sh-empty sh-enter" style={{ animationDelay: '320ms' }}>
              <div className="sh-empty-icon"><MdHistory /></div>
              <h3 className="sh-empty-title">No history yet</h3>
              <p className="sh-empty-sub">Materials you access with codes will appear here</p>
            </div>
          ) : (
            <div className="sh-list">
              {history.map((item, i) => {
                const hasMsg  = !!item.messageToStudents?.trim();
                const sfCount = item.subFolderCount || 0;
                return (
                  <RevealItem key={item._id} delay={i * 55}>
                    <div className="sh-card">
                      <div className="sh-card-icon"><MdMenuBook /></div>
                      <div className="sh-card-info">
                        <div className="sh-card-top">
                          <h3 className="sh-card-title">{item.subjectName}</h3>
                          {hasMsg && (
                            <span className="sh-msg-badge"><MdCampaign /> msg</span>
                          )}
                        </div>
                        <div className="sh-card-meta">
                          <span>{item.facultyName}</span>
                          <span className="sh-meta-dot">·</span>
                          <span>{item.department}</span>
                          <span className="sh-meta-dot">·</span>
                          <span>Sem {item.semester}</span>
                          <span className="sh-meta-dot">·</span>
                          <span>{item.fileCount} file{item.fileCount !== 1 ? 's' : ''}{sfCount > 0 ? ` · ${sfCount} folder${sfCount !== 1 ? 's' : ''}` : ''}</span>
                        </div>
                        <div className="sh-card-badges">
                          <span className="sh-code-badge">{item.accessCode}</span>
                          <span className="sh-date-badge">
                            {new Date(item.accessedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="sh-card-actions">
                        {item.isSaved ? (
                          <button className="sh-btn sh-btn--saved" disabled>✓ Saved</button>
                        ) : (
                          <button className="sh-btn sh-btn--save" onClick={() => handleSave(item._id)}>💾 Save</button>
                        )}
                        <button className="sh-btn sh-btn--open" onClick={() => openMaterial(item)}>
                          <MdFolderOpen /> Open
                        </button>
                      </div>
                    </div>
                  </RevealItem>
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

export default StudentHistory;
