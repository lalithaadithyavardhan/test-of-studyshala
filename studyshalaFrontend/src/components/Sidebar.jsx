import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard, MdLibraryBooks,
  MdHistory, MdKey, MdSettings, MdFolderOpen, MdSchool,
  MdChevronLeft, MdChevronRight, MdMenu, MdClose,
  MdInfoOutline, MdStar, MdChatBubbleOutline
} from 'react-icons/md';
import { FaGithub, FaLinkedin, FaHeart } from 'react-icons/fa';
import { ImSpinner8 } from 'react-icons/im';
import api from '../api/axios';
import owlLogo from '../assets/logo.svg';
import './Sidebar.css';
import StorageWidget from './StorageWidget';

/* ── Feedback Modal ────────────────────────────────────────────────────────── */
const FeedbackModal = ({ onClose }) => {
  const MAX = 60;
  const [text,        setText]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  // On open, check if user already submitted
  useEffect(() => {
    api.get('/feedback/mine')
      .then(res => {
        if (res.data.feedback) setText(res.data.feedback.message);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try {
      await api.post('/feedback', { message: text.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fb-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fb-modal">
        <div className="fb-modal-header">
          <span className="fb-modal-title">Leave a Postcard 💌</span>
          <button className="fb-modal-close" onClick={onClose}><MdClose /></button>
        </div>

        {submitted ? (
          <div className="fb-success">
            <div className="fb-success-icon">🎉</div>
            <div className="fb-success-msg">Thanks! Your postcard will appear on the homepage.</div>
            <button className="fb-btn fb-btn--primary" onClick={onClose}>Close</button>
          </div>
        ) : checking ? (
          <div className="fb-loading"><ImSpinner8 className="fb-spin" /></div>
        ) : (
          <>
            <p className="fb-hint">
              Share a short thought about StudyShala — it'll show up in the <strong>Postcards</strong> section on the landing page.
            </p>
            <div className="fb-field">
              <textarea
                className="fb-textarea"
                placeholder="e.g. This saved me so much time before exams!"
                maxLength={MAX}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className={`fb-counter ${text.length >= MAX ? 'fb-counter--max' : ''}`}>
                {text.length}/{MAX}
              </div>
            </div>
            {error && <div className="fb-error">{error}</div>}
            <div className="fb-actions">
              <button className="fb-btn fb-btn--ghost" onClick={onClose}>Cancel</button>
              <button
                className="fb-btn fb-btn--primary"
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
              >
                {loading ? <><ImSpinner8 className="fb-spin" /> Sending…</> : 'Send Postcard ✉️'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Main Sidebar ──────────────────────────────────────────────────────────── */
const Sidebar = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed,   setIsCollapsed]   = useState(false);
  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [aboutOpen,     setAboutOpen]     = useState(false);
  const [feedbackOpen,  setFeedbackOpen]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const h  = () => { if (mq.matches) setIsMobileOpen(false); };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const menuItems = {
    faculty: [
      { path: '/faculty/dashboard', icon: <MdDashboard />,    label: 'Dashboard'        },
      { path: '/faculty/materials', icon: <MdLibraryBooks />, label: 'My Materials'     },
      { path: '/browse-materials',  icon: <MdFolderOpen />,   label: 'Browse Materials' },
      { path: '/admin-courses',     icon: <MdSchool />,       label: 'Admin Courses'    },
    ],
    student: [
      { path: '/student/enter-code', icon: <MdKey />,        label: 'Enter Code'       },
      { path: '/browse-materials',   icon: <MdFolderOpen />, label: 'Browse Materials' },
      { path: '/admin-courses',      icon: <MdSchool />,     label: 'Admin Courses'    },
      { path: '/student/history',    icon: <MdHistory />,    label: 'History'          },
      { path: '/student/starred',    icon: <MdStar />,       label: 'Starred Files'    },
    ],
    admin: [
      { path: '/admin/dashboard',  icon: <MdSettings />,   label: 'Dashboard'        },
      { path: '/browse-materials', icon: <MdFolderOpen />, label: 'Browse Materials' },
      { path: '/admin-courses',    icon: <MdSchool />,     label: 'Admin Courses'    },
    ],
  };

  const links     = menuItems[role] || [];
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';

  return (
    <>
      <button className="sb-hamburger" onClick={() => setIsMobileOpen(true)} aria-label="Open menu">
        <MdMenu />
      </button>

      {isMobileOpen && <div className="sb-backdrop" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`sb ${isCollapsed ? 'sb--collapsed' : ''} ${isMobileOpen ? 'sb--open' : ''} ${mounted ? 'sb--mounted' : ''}`}>

        <div className="sb-header">
          {!isCollapsed && (
            <div className="sb-brand">
              <div className="sb-brand-icon"><img src={owlLogo} alt="StudyShala" style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'invert(1)' }} /></div>
              <div className="sb-brand-text">
                <span className="sb-brand-name">StudyShala</span>
                <span className="sb-role-pill">{roleLabel}</span>
              </div>
            </div>
          )}
          <div className="sb-header-actions">
            <button className="sb-toggle desktop-only" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'Expand' : 'Collapse'}>
              {isCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
            </button>
            <button className="sb-toggle mobile-only" onClick={() => setIsMobileOpen(false)}>
              <MdClose />
            </button>
          </div>
        </div>

        <nav className="sb-nav">
          {links.map((link, i) => (
            <button
              key={link.path}
              className={`sb-link ${isActive(link.path) ? 'sb-link--active' : ''} ${link.path === '/student/starred' ? 'sb-link--starred' : ''}`}
              style={{ transitionDelay: mounted ? `${i * 60}ms` : '0ms' }}
              onClick={() => navigate(link.path)}
              title={isCollapsed ? link.label : ''}
            >
              <span className="sb-icon">{link.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="sb-label">{link.label}</span>
                  {isActive(link.path) && <span className="sb-active-dot" />}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          {!isCollapsed ? (
            <>
              {/* ── Storage widget (compact) ── */}
              <div className="sb-storage-wrap">
                <StorageWidget role={role === 'student' ? 'student' : 'faculty'} size="compact" />
              </div>

              {/* ── Feedback button ── */}
              <button className="sb-feedback-btn" onClick={() => setFeedbackOpen(true)}>
                <MdChatBubbleOutline className="sb-about-icon" />
                <span>Leave a Postcard</span>
              </button>

              <button className="sb-about-toggle" onClick={() => setAboutOpen(!aboutOpen)}>
                <MdInfoOutline className="sb-about-icon" />
                <span>About</span>
                <span className={`sb-about-caret ${aboutOpen ? 'open' : ''}`}>›</span>
              </button>

              <div className={`sb-about-panel ${aboutOpen ? 'sb-about-panel--open' : ''}`}>
                <div className="sb-about-row">
                  <img
                    src="https://avatars.githubusercontent.com/lalithaadithyavardhan"
                    alt="Borra Adithya"
                    className="sb-about-avatar"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <div className="sb-about-name">Borra Adithya</div>
                    <div className="sb-about-role">Student · Developer</div>
                  </div>
                </div>
                <p className="sb-about-desc">
                  Built StudyShala to make study material sharing effortless — free, ad-free, always.
                </p>
                <div className="sb-about-links">
                  <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer" className="sb-about-link">
                    <FaGithub /> GitHub
                  </a>
                  <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer" className="sb-about-link">
                    <FaLinkedin /> LinkedIn
                  </a>
                </div>
              </div>

              <div className="sb-watermark">
                <span className="sb-footer-text">studyshala</span>
                <FaHeart className="sb-footer-heart" />
              </div>
            </>
          ) : (
            <>
              <button
                className="sb-toggle"
                style={{ margin: '0 auto 4px', display: 'flex' }}
                title="Leave a Postcard"
                onClick={() => setFeedbackOpen(true)}
              >
                <MdChatBubbleOutline />
              </button>
              <button
                className="sb-toggle"
                style={{ margin: '0 auto', display: 'flex' }}
                title="About"
                onClick={() => { setIsCollapsed(false); setTimeout(() => setAboutOpen(true), 310); }}
              >
                <MdInfoOutline />
              </button>
            </>
          )}
        </div>
      </aside>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
};

export default Sidebar;
