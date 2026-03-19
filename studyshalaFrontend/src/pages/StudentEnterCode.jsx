import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { MdKey, MdLockOpen, MdFolderOpen, MdHistory, MdCampaign, MdClose } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './StudentEnterCode.css';

/* ── Announcement Banner ─────────────────────────────────────────────────────
   Fetches announcements for the logged-in student and shows them one at a time.
   Each can be dismissed. Dismissed IDs are stored in sessionStorage so they
   don't reappear on the same session, but come back on next login.
────────────────────────────────────────────────────────────────────────────── */
const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed,     setDismissed]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_ann') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    api.get('/announcements')
      .then(res => setAnnouncements(res.data.announcements || []))
      .catch(() => {});
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { sessionStorage.setItem('dismissed_ann', JSON.stringify(next)); } catch {}
  };

  const visible = announcements.filter(a => !dismissed.includes(a._id));
  if (visible.length === 0) return null;

  return (
    <div className="ann-banner-wrap">
      {visible.map(a => (
        <div key={a._id} className="ann-banner">
          <MdCampaign className="ann-banner-icon" />
          <div className="ann-banner-body">
            <span className="ann-banner-title">{a.title}</span>
            <span className="ann-banner-msg">{a.message}</span>
          </div>
          <button className="ann-banner-close" onClick={() => dismiss(a._id)} title="Dismiss">
            <MdClose />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────────*/
const StudentEnterCode = () => {
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/student/validate-code', { accessCode: code.trim() });
      if (res.data.valid) {
        navigate(`/student/material-access/${res.data.material._id}`, {
          state: { material: res.data.material }
        });
      } else {
        setError('Invalid code or material not found. Please check and try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { icon: <MdFolderOpen />, label: 'All Materials',    sub: 'View all your saved materials',  path: '/browse-materials' },
    { icon: <MdHistory />,    label: 'Recently Opened',  sub: 'Materials you accessed before', path: '/student/history'  },
  ];

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`ec-page ${pageReady ? 'ec-ready' : ''}`}>

          {/* ── Announcement banner — shows at the very top ── */}
          <AnnouncementBanner />

          {/* Hero */}
          <div className="ec-hero">
            <div className="ec-hero-label ec-enter" style={{ animationDelay: '80ms' }}>
              — student access
            </div>
            <h1 className="ec-title ec-enter" style={{ animationDelay: '160ms' }}>
              Enter your<br />
              <span className="ec-title-accent">access code.</span>
            </h1>
            <p className="ec-subtitle ec-enter" style={{ animationDelay: '240ms' }}>
              Get the 8-character code from your faculty and type it below
              to unlock your study materials instantly.
            </p>
          </div>

          {/* Card */}
          <div className="ec-card ec-enter" style={{ animationDelay: '320ms' }}>
            <div className="ec-card-header">
              <div className="ec-card-icon"><MdKey /></div>
              <div>
                <div className="ec-card-title">Access Code</div>
                <div className="ec-card-sub">8 characters · case-insensitive</div>
              </div>
            </div>

            {error && (
              <div className="ec-error">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleValidate} className="ec-form">
              <div
                className="ec-input-wrap"
                onClick={() => inputRef.current?.focus()}
              >
                <div className="ec-input-chars" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const isFilled  = !!code[i];
                    const isActive  = i === code.length && code.length < 8; // next empty slot
                    return (
                      <div
                        key={i}
                        className={[
                          'ec-char-box',
                          isFilled  ? 'ec-char-box--filled'  : '',
                          isActive  ? 'ec-char-box--active'  : '',
                        ].join(' ').trim()}
                      >
                        {isFilled ? code[i] : isActive ? <span className="ec-caret" /> : ''}
                      </div>
                    );
                  })}
                </div>
                <input
                  ref={inputRef}
                  className="ec-real-input"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 8)); setError(''); }}
                  maxLength={8}
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Access code"
                />
              </div>

              <button
                type="submit"
                className={`ec-submit ${loading ? 'ec-submit--loading' : ''} ${!code.trim() ? 'ec-submit--off' : ''}`}
                disabled={loading || !code.trim()}
              >
                {loading
                  ? <><ImSpinner8 className="ec-spin" /><span>Validating…</span></>
                  : <><MdLockOpen /><span>Unlock Materials</span></>
                }
              </button>
            </form>
          </div>

          {/* Quick links */}
          <div className="ec-quick">
            {quickLinks.map((ql, i) => (
              <button
                key={ql.path}
                className="ec-quick-btn ec-enter"
                style={{ animationDelay: `${420 + i * 80}ms` }}
                onClick={() => navigate(ql.path)}
              >
                <span className="ec-quick-icon">{ql.icon}</span>
                <div className="ec-quick-text">
                  <span className="ec-quick-label">{ql.label}</span>
                  <span className="ec-quick-sub">{ql.sub}</span>
                </div>
                <span className="ec-quick-arrow">→</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentEnterCode;
