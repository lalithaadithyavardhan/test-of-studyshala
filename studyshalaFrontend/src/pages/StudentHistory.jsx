import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
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
  const navigate = useNavigate();
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [pageReady, setPageReady] = useState(false);
  const [sortBy,    setSortBy]    = useState('latest');  // 'latest' | 'oldest' | 'name'

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

  // Open the material in BrowseMaterials — pass the folder ID via navigate state
  // so BrowseMaterials can auto-open it immediately and reliably on mount
  const openMaterial = (item) => {
    navigate('/browse-materials', { state: { openFolderId: item._id } });
  };

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`sh-page ${pageReady ? 'sh-ready' : ''}`}>

          <div className="sh-hero">
            <div className="sh-hero-label sh-enter" style={{ animationDelay: '80ms' }}>— recently opened</div>
            <h1 className="sh-title sh-enter" style={{ animationDelay: '160ms' }}>
              Recently opened,<br /><span className="sh-title-accent">all in one place.</span>
            </h1>
            <p className="sh-subtitle sh-enter" style={{ animationDelay: '240ms' }}>
              Every material you've recently opened appears below.
              Save ones you want to keep, or open them again anytime.
            </p>
          </div>

          {error   && <div className="sh-alert sh-alert--err sh-enter" style={{ animationDelay: '280ms' }}><span>⚠</span> {error}</div>}
          {success && <div className="sh-alert sh-alert--ok  sh-enter" style={{ animationDelay: '280ms' }}><span>✓</span> {success}</div>}

          {/* ── Sort toolbar ── */}
          {!loading && history.length > 0 && (
            <div className="sh-toolbar sh-enter" style={{ animationDelay: '280ms' }}>
              <span className="sh-toolbar-label">Sort by</span>
              <div className="sh-sort-btns">
                {[
                  { key: 'latest', label: '🕐 Latest first' },
                  { key: 'oldest', label: '🕰 Oldest first' },
                  { key: 'name',   label: '🔤 Name A–Z'    },
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`sh-sort-btn ${sortBy === opt.key ? 'sh-sort-btn--active' : ''}`}
                    onClick={() => setSortBy(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="sh-count">{history.length} item{history.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {loading ? (
            <div className="sh-loading sh-enter" style={{ animationDelay: '300ms' }}>
              <ImSpinner8 className="sh-spinner" />
              <span>Loading recently opened…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="sh-empty sh-enter" style={{ animationDelay: '320ms' }}>
              <div className="sh-empty-icon"><MdHistory /></div>
              <h3 className="sh-empty-title">Nothing opened yet</h3>
              <p className="sh-empty-sub">Materials you open with codes will appear here</p>
            </div>
          ) : (
            <div className="sh-list">
              {[...history]
                .sort((a, b) => {
                  if (sortBy === 'latest') return new Date(b.accessedAt) - new Date(a.accessedAt);
                  if (sortBy === 'oldest') return new Date(a.accessedAt) - new Date(b.accessedAt);
                  if (sortBy === 'name')   return (a.subjectName || '').localeCompare(b.subjectName || '');
                  return 0;
                })
                .map((item, i) => {
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
    </div>
  );
};

export default StudentHistory;
