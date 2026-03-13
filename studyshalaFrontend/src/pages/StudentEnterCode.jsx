import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { MdKey, MdLockOpen, MdFolderOpen, MdHistory } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './StudentEnterCode.css';

/* ── Scroll-reveal hook ── */
const useReveal = () => {
  const refs = [];
  const register = (el) => {
    if (!el || refs.includes(el)) return;
    refs.push(el);
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
  };
  return register;
};

const StudentEnterCode = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
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
    { icon: <MdFolderOpen />, label: 'Browse Materials', sub: 'View your saved materials', path: '/browse-materials' },
    { icon: <MdHistory />,    label: 'History',          sub: 'See codes you\'ve used',    path: '/student/history'  },
  ];

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className={`ec-page ${pageReady ? 'ec-ready' : ''}`}>

          {/* Page heading */}
          <div className="ec-hero">
            <div className="ec-hero-label ec-enter" style={{ animationDelay: '80ms' }}>
              — student access
            </div>
            <h1 className="ec-title ec-enter" style={{ animationDelay: '160ms' }}>
              Enter your<br />
              <span className="ec-title-accent">access code.</span>
            </h1>
            <p className="ec-subtitle ec-enter" style={{ animationDelay: '240ms' }}>
              Get the 8-character code from your faculty and paste it below
              to unlock your study materials instantly.
            </p>
          </div>

          {/* Code form */}
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
              <div className="ec-input-wrap">
                <input
                  className="ec-input"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="A3F9K2BX"
                  maxLength={8}
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="ec-input-chars">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`ec-char-box ${code[i] ? 'ec-char-box--filled' : ''}`}>
                      {code[i] || ''}
                    </div>
                  ))}
                </div>
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
