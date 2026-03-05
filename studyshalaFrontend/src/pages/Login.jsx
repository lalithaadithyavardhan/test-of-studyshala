import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaUserGraduate, FaChalkboardTeacher, FaCheck,
  FaBookOpen, FaKey, FaCloudUploadAlt, FaShareAlt,
  FaDownload, FaSave, FaHistory, FaUsers, FaFileAlt
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { ImSpinner8 } from 'react-icons/im';
import { MdMenuBook, MdStar } from 'react-icons/md';
import './Login.css';

/* ── Stats counter (animated) ── */
const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
};

const StatCard = ({ icon, value, suffix = '+', label, color }) => {
  const [visible, setVisible] = useState(false);
  const count = useCounter(value, 1800, visible);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="stat-number">{count.toLocaleString()}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

/* ── Login Card (extracted) ── */
const LoginCard = ({ selectedRole, setSelectedRole, onSignIn, loading, error }) => (
  <div className="login-card">
    <div className="login-card-header">
      <span className="login-card-icon"><MdMenuBook /></span>
      <div>
        <h2 className="login-card-title">Sign In</h2>
        <p className="login-card-sub">Choose your role to continue</p>
      </div>
    </div>

    {error && <div className="alert alert-error" style={{ margin: '0 0 1rem' }}>{error}</div>}

    <div className="role-cards">
      <button
        type="button"
        className={`role-card ${selectedRole === 'student' ? 'role-card--active' : ''}`}
        onClick={() => setSelectedRole('student')}
      >
        <FaUserGraduate className="role-card__ico" />
        <div className="role-card__text">
          <span className="role-card__title">Student</span>
          <span className="role-card__desc">Access study materials</span>
        </div>
        {selectedRole === 'student' && <FaCheck className="role-card__check" />}
      </button>

      <button
        type="button"
        className={`role-card ${selectedRole === 'faculty' ? 'role-card--active' : ''}`}
        onClick={() => setSelectedRole('faculty')}
      >
        <FaChalkboardTeacher className="role-card__ico" />
        <div className="role-card__text">
          <span className="role-card__title">Faculty</span>
          <span className="role-card__desc">Upload &amp; manage materials</span>
        </div>
        {selectedRole === 'faculty' && <FaCheck className="role-card__check" />}
      </button>
    </div>

    <button
      className={`google-btn ${!selectedRole ? 'google-btn--disabled' : ''}`}
      onClick={onSignIn}
      disabled={loading || !selectedRole}
    >
      {loading ? (
        <><ImSpinner8 className="google-btn__spin" /><span>Redirecting…</span></>
      ) : (
        <><FcGoogle className="google-btn__ico" />
          <span>{selectedRole
            ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
            : 'Sign in with Google'}</span>
        </>
      )}
    </button>

    <p className="login-card-hint">
      {selectedRole === 'faculty'
        ? '🔒 Faculty accounts verified by your institution'
        : '📚 Use your institutional Google account'}
    </p>
  </div>
);

/* ══════════════════════════════
   Main Login / Landing Page
   ══════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/student/enter-code', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed')
      setError('Google sign-in failed. Please try again.');
  }, [searchParams]);

  const handleSignIn = () => {
    if (!selectedRole) { setError('Please select a role first.'); return; }
    setLoading(true); setError('');
    const BACKEND_URL = 'https://test-of-studyshala.onrender.com';
    window.location.href = `${BACKEND_URL}/api/auth/google?role=${selectedRole}`;
  };

  /* ── Features data ── */
  const studentFeatures = [
    { icon: <FaKey />,      text: 'Enter a code shared by faculty' },
    { icon: <FaBookOpen />, text: 'Preview PDFs, docs, images instantly' },
    { icon: <FaDownload />, text: 'Download files directly to your device' },
    { icon: <FaSave />,     text: 'Save materials for permanent access' },
    { icon: <FaHistory />,  text: 'View your complete access history' },
  ];
  const facultyFeatures = [
    { icon: <FaCloudUploadAlt />, text: 'Upload multiple files via drag & drop' },
    { icon: <FaKey />,            text: 'Auto-generated unique access codes' },
    { icon: <FaShareAlt />,       text: 'Share codes with students instantly' },
    { icon: <FaUsers />,          text: 'Track how many students accessed' },
    { icon: <FaFileAlt />,        text: 'Preview & manage all uploaded files' },
  ];

  const steps = [
    { role: 'Student', num: '01', title: 'Login with Google', desc: 'Use your institutional Google account to sign in as a student.' },
    { role: 'Student', num: '02', title: 'Enter Access Code', desc: 'Get the 8-character code from your faculty and enter it.' },
    { role: 'Student', num: '03', title: 'Save or Download', desc: 'Save materials for later or download files instantly.' },
    { role: 'Faculty', num: '01', title: 'Login & Create', desc: 'Sign in and create a new material with subject details.' },
    { role: 'Faculty', num: '02', title: 'Upload Files', desc: 'Drag & drop PDFs, docs, presentations and more.' },
    { role: 'Faculty', num: '03', title: 'Share Code', desc: 'Copy the auto-generated code and share with students.' },
  ];

  return (
    <div className="landing">

      {/* ── Landing Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <MdMenuBook className="landing-brand-ico" />
            <span>StudyShala</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#stats">Stats</a>
          </div>
          <Link to="/admin/login" className="landing-admin-link">Admin</Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge"><MdStar /> Trusted by students &amp; faculty</div>
            <h1 className="hero-heading">
              Study smarter.<br />
              <span className="hero-accent">Share faster.</span>
            </h1>
            <p className="hero-desc">
              StudyShala connects faculty and students through a seamless, code-based study material platform.
              Upload once, share with a code — access anywhere.
            </p>
            <div className="hero-tags">
              <span>✓ No ads</span>
              <span>✓ Google Drive backed</span>
              <span>✓ Instant access</span>
            </div>
          </div>
          <div className="hero-right">
            <LoginCard
              selectedRole={selectedRole}
              setSelectedRole={(r) => { setSelectedRole(r); setError(''); }}
              onSignIn={handleSignIn}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="stats-section" id="stats">
        <div className="section-inner">
          <h2 className="section-title">Trusted by the community</h2>
          <p className="section-sub">Real numbers from our growing platform</p>
          <div className="stats-grid">
            <StatCard icon={<FaUserGraduate />} value={1200} label="Students joined"   color="#2563eb" />
            <StatCard icon={<FaChalkboardTeacher />} value={150} label="Faculty members" color="#059669" />
            <StatCard icon={<FaFileAlt />}      value={3800} label="Materials shared"  color="#f59e0b" />
            <StatCard icon={<FaDownload />}     value={24000} label="Files downloaded"  color="#8b5cf6" />
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="features-section" id="features">
        <div className="section-inner">
          <h2 className="section-title">Everything you need</h2>
          <p className="section-sub">Powerful features for students and faculty alike</p>
          <div className="features-grid">
            <div className="feature-block">
              <div className="feature-block-header">
                <FaUserGraduate className="feature-block-ico student" />
                <h3>For Students</h3>
              </div>
              <ul className="feature-list">
                {studentFeatures.map((f, i) => (
                  <li key={i} className="feature-item">
                    <span className="feature-item-ico">{f.icon}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-block">
              <div className="feature-block-header">
                <FaChalkboardTeacher className="feature-block-ico faculty" />
                <h3>For Faculty</h3>
              </div>
              <ul className="feature-list">
                {facultyFeatures.map((f, i) => (
                  <li key={i} className="feature-item">
                    <span className="feature-item-ico">{f.icon}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section" id="how">
        <div className="section-inner">
          <h2 className="section-title">How it works</h2>
          <p className="section-sub">Simple 3-step process for everyone</p>
          <div className="how-grid">
            {['Student', 'Faculty'].map(role => (
              <div key={role} className="how-role-block">
                <div className={`how-role-badge ${role.toLowerCase()}`}>{role} Flow</div>
                <div className="how-steps">
                  {steps.filter(s => s.role === role).map(s => (
                    <div key={s.num} className="how-step">
                      <div className={`how-step-num ${role.toLowerCase()}`}>{s.num}</div>
                      <div>
                        <h4>{s.title}</h4>
                        <p>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand" style={{ color: '#fff' }}>
            <MdMenuBook className="landing-brand-ico" />
            <span>StudyShala</span>
          </div>
          <p className="footer-tagline">Empowering education through seamless material sharing</p>
          <p className="footer-copy">© 2025 StudyShala. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default Login;
