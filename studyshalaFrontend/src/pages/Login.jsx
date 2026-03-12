import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  FaUserGraduate, FaChalkboardTeacher, FaCheck,
  FaBookOpen, FaKey, FaCloudUploadAlt, FaShareAlt,
  FaDownload, FaSave, FaHistory, FaUsers, FaFileAlt,
  FaGithub, FaLinkedin, FaHeart
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { ImSpinner8 } from 'react-icons/im';
import { MdMenuBook, MdEmail, MdArrowForward, MdStar, MdAutoAwesome } from 'react-icons/md';
import './Login.css';

/* ── Animated counter ── */
const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
};

/* ── Floating orb canvas background ── */
const OrbCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const orbs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 180 + Math.random() * 220,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      hue: [220, 260, 180, 200, 240, 170][i],
      alpha: 0.07 + Math.random() * 0.07,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r) o.x = canvas.width + o.r;
        if (o.x > canvas.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = canvas.height + o.r;
        if (o.y > canvas.height + o.r) o.y = -o.r;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `hsla(${o.hue},80%,65%,${o.alpha})`);
        g.addColorStop(1, `hsla(${o.hue},80%,65%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="orb-canvas" />;
};

/* ── Stat card ── */
const StatCard = ({ icon, value, label, color, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const count = useCounter(value, 1800, visible);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon-wrap" style={{ '--accent': color }}>{icon}</div>
      <div className="stat-number" style={{ '--accent': color }}>{count.toLocaleString()}+</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

/* ── Login Card ── */
const LoginCard = ({ selectedRole, setSelectedRole, onSignIn, loading, error }) => (
  <div className="login-glass">
    <div className="login-glass-glow" />
    <div className="login-glass-inner">
      <div className="login-logo-row">
        <div className="login-logo-icon"><MdMenuBook /></div>
        <div>
          <div className="login-logo-name">StudyShala</div>
          <div className="login-logo-sub">Sign in to continue</div>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="login-role-label">Select your role</div>
      <div className="login-roles">
        <button
          className={`login-role-btn ${selectedRole === 'student' ? 'active' : ''}`}
          onClick={() => setSelectedRole('student')}
        >
          <div className="login-role-icon student-icon"><FaUserGraduate /></div>
          <div className="login-role-text">
            <span className="login-role-title">Student</span>
            <span className="login-role-desc">Access study materials</span>
          </div>
          {selectedRole === 'student' && <div className="login-role-check"><FaCheck /></div>}
        </button>
        <button
          className={`login-role-btn ${selectedRole === 'faculty' ? 'active' : ''}`}
          onClick={() => setSelectedRole('faculty')}
        >
          <div className="login-role-icon faculty-icon"><FaChalkboardTeacher /></div>
          <div className="login-role-text">
            <span className="login-role-title">Faculty</span>
            <span className="login-role-desc">Upload & manage</span>
          </div>
          {selectedRole === 'faculty' && <div className="login-role-check"><FaCheck /></div>}
        </button>
      </div>

      <button
        className={`login-google-btn ${!selectedRole ? 'disabled' : ''}`}
        onClick={onSignIn}
        disabled={loading || !selectedRole}
      >
        {loading ? (
          <><ImSpinner8 className="spin-icon" /><span>Redirecting…</span></>
        ) : (
          <>
            <FcGoogle className="google-ico" />
            <span>{selectedRole ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}` : 'Sign in with Google'}</span>
            {selectedRole && <MdArrowForward className="arrow-ico" />}
          </>
        )}
      </button>

      <p className="login-hint">
        {selectedRole === 'faculty'
          ? '🔒 Faculty accounts verified by institution'
          : selectedRole === 'student'
          ? '📚 Use your institutional Google account'
          : '🔐 Secure Google OAuth — no password needed'}
      </p>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   Main Landing Page
   ══════════════════════════════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [stats,        setStats]        = useState({ totalStudents: 0, totalFaculty: 0, totalMaterials: 0, totalVisits: 0 });
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async (attempt) => {
      try {
        const res = await api.get('/stats');
        if (!cancelled) setStats(res.data);
      } catch {
        if (attempt < 3 && !cancelled) setTimeout(() => fetchStats(attempt + 1), 2000 * attempt);
      }
    };
    fetchStats(1);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/student/enter-code', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') setError('Google sign-in failed. Please try again.');
  }, [searchParams]);

  if (authLoading) {
    return (
      <div className="auth-spinner-screen">
        <div className="auth-spinner-logo"><MdMenuBook /></div>
        <div className="auth-spinner-ring" />
      </div>
    );
  }

  const handleSignIn = () => {
    if (!selectedRole) { setError('Please select a role first.'); return; }
    setLoading(true); setError('');
    window.location.href = 'https://test-of-studyshala.onrender.com/api/auth/google?role=' + selectedRole;
  };

  const studentFeatures = [
    { icon: <FaKey />,      text: 'Enter a code shared by your faculty' },
    { icon: <FaBookOpen />, text: 'Preview PDFs, docs, images instantly' },
    { icon: <FaDownload />, text: 'Download files directly to your device' },
    { icon: <FaSave />,     text: 'Save materials for permanent access' },
    { icon: <FaHistory />,  text: 'View your complete access history' },
  ];
  const facultyFeatures = [
    { icon: <FaCloudUploadAlt />, text: 'Upload multiple files via drag & drop' },
    { icon: <FaKey />,            text: 'Auto-generated unique access codes' },
    { icon: <FaShareAlt />,       text: 'Share codes with students instantly' },
    { icon: <FaUsers />,          text: 'Track student access in real time' },
    { icon: <FaFileAlt />,        text: 'Preview & manage all uploaded files' },
  ];
  const steps = [
    { role: 'Student', num: '01', title: 'Sign in with Google', desc: 'Use your institutional Google account to sign in securely.' },
    { role: 'Student', num: '02', title: 'Enter Access Code',   desc: 'Get the 8-character code from your faculty and enter it.' },
    { role: 'Student', num: '03', title: 'Save or Download',    desc: 'Save materials for later or download files instantly.' },
    { role: 'Faculty', num: '01', title: 'Login & Create',      desc: 'Sign in and create a new material with subject details.' },
    { role: 'Faculty', num: '02', title: 'Upload Files',        desc: 'Drag & drop PDFs, docs, presentations and more.' },
    { role: 'Faculty', num: '03', title: 'Share the Code',      desc: 'Copy the auto-generated code and share with your class.' },
  ];

  return (
    <div className="landing">

      {/* ── Navbar ── */}
      <nav className={`l-nav ${navScrolled ? 'l-nav--scrolled' : ''}`}>
        <div className="l-nav-inner">
          <div className="l-brand">
            <div className="l-brand-icon"><MdMenuBook /></div>
            <span className="l-brand-name">StudyShala</span>
          </div>
          <div className="l-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#stats">Stats</a>
            <a href="#about">About</a>
          </div>
          <div className="l-nav-right">
            <Link to="/admin/login" className="l-admin-link">Admin ↗</Link>
          </div>
          <button className="l-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="l-mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)}>Stats</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
            <Link to="/admin/login" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <OrbCanvas />
        <div className="hero-grid-overlay" />
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <MdAutoAwesome className="eyebrow-star" />
              <span>Free for students &amp; faculty</span>
            </div>
            <h1 className="hero-h1">
              <span className="hero-h1-line1">Study smarter.</span>
              <span className="hero-h1-line2">
                Share <span className="hero-gradient-text">faster.</span>
              </span>
            </h1>
            <p className="hero-para">
              StudyShala connects faculty and students through a seamless,
              code-based study material platform. Upload once, share with
              a code — access anywhere, anytime.
            </p>
            <div className="hero-pills">
              <span className="hero-pill"><FaCheck /> No ads, ever</span>
              <span className="hero-pill"><FaCheck /> Google Drive backed</span>
              <span className="hero-pill"><FaCheck /> Instant access</span>
            </div>
            <div className="hero-cta-row">
              <a href="#features" className="hero-cta-secondary">Explore features <MdArrowForward /></a>
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
        <div className="hero-scroll-hint">
          <div className="scroll-mouse"><div className="scroll-dot" /></div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" id="stats">
        <div className="section-wrap">
          <div className="section-eyebrow">Live numbers</div>
          <h2 className="section-h2">Trusted by the community</h2>
          <p className="section-p">Real data from our platform, updated live</p>
          <div className="stats-grid">
            <StatCard icon={<FaUserGraduate />}      value={stats.totalStudents}  label="Students joined"   color="#4f8ef7" delay={0}   />
            <StatCard icon={<FaChalkboardTeacher />} value={stats.totalFaculty}   label="Faculty members"   color="#34d399" delay={100} />
            <StatCard icon={<FaFileAlt />}           value={stats.totalMaterials} label="Materials shared"  color="#f59e0b" delay={200} />
            <StatCard icon={<FaDownload />}          value={stats.totalVisits}    label="Total visits"      color="#a78bfa" delay={300} />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-wrap">
          <div className="section-eyebrow">What's included</div>
          <h2 className="section-h2">Everything you need</h2>
          <p className="section-p">Powerful tools for both sides of education</p>
          <div className="features-grid">
            <div className="feature-card student-card">
              <div className="feature-card-header">
                <div className="feature-card-badge student-badge">
                  <FaUserGraduate /> Students
                </div>
              </div>
              <ul className="feature-list">
                {studentFeatures.map((f, i) => (
                  <li key={i} className="feature-item" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="feature-item-icon student-ico">{f.icon}</div>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-card faculty-card">
              <div className="feature-card-header">
                <div className="feature-card-badge faculty-badge">
                  <FaChalkboardTeacher /> Faculty
                </div>
              </div>
              <ul className="feature-list">
                {facultyFeatures.map((f, i) => (
                  <li key={i} className="feature-item" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="feature-item-icon faculty-ico">{f.icon}</div>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section" id="how">
        <div className="section-wrap">
          <div className="section-eyebrow">Simple process</div>
          <h2 className="section-h2">How it works</h2>
          <p className="section-p">Three steps for everyone — no complexity, just clarity</p>
          <div className="how-grid">
            {['Student', 'Faculty'].map((role) => (
              <div key={role} className={`how-block how-block--${role.toLowerCase()}`}>
                <div className="how-block-title">
                  {role === 'Student' ? <FaUserGraduate /> : <FaChalkboardTeacher />}
                  {role} Flow
                </div>
                <div className="how-steps">
                  {steps.filter(s => s.role === role).map((s, i) => (
                    <div key={s.num} className="how-step">
                      <div className={`how-step-num how-num--${role.toLowerCase()}`}>{s.num}</div>
                      {i < 2 && <div className={`how-step-line how-line--${role.toLowerCase()}`} />}
                      <div className="how-step-body">
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

      {/* ── About ── */}
      <section className="about-section" id="about">
        <div className="section-wrap">
          <div className="section-eyebrow">The maker</div>
          <h2 className="section-h2">Built with purpose</h2>
          <p className="section-p">One developer. One real problem. One solution.</p>
          <div className="about-card">
            <div className="about-avatar-wrap">
              <img
                src="https://avatars.githubusercontent.com/lalithaadithyavardhan"
                alt="Borra Adithya"
                className="about-avatar"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div className="about-avatar-ring" />
            </div>
            <div className="about-content">
              <h3 className="about-name">Borra Adithya</h3>
              <div className="about-role-pill">Student · Developer</div>
              <p className="about-bio">
                Hi! I'm a passionate developer and student who built StudyShala to solve a real
                problem — making it easy for faculty to share study materials and for students to
                access them without any friction. Built with love for my college community.
              </p>
              <p className="about-quote">
                "StudyShala is free, ad-free, and will always remain so. If it helps even one
                student, that's all the reward I need."
              </p>
              <div className="about-links">
                <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer" className="about-btn about-btn--gh">
                  <FaGithub /> GitHub
                </a>
                <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer" className="about-btn about-btn--li">
                  <FaLinkedin /> LinkedIn
                </a>
                <a href="mailto:adithyasai533@gmail.com" className="about-btn about-btn--em">
                  <MdEmail /> Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div className="l-footer-brand">
            <div className="l-brand-icon"><MdMenuBook /></div>
            <span className="l-brand-name">StudyShala</span>
          </div>
          <p className="l-footer-tagline">Empowering education through seamless material sharing</p>
          <div className="l-footer-links">
            <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer"><FaGithub /> GitHub</a>
            <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer"><FaLinkedin /> LinkedIn</a>
            <a href="mailto:adithyasai533@gmail.com"><MdEmail /> Email</a>
          </div>
          <div className="l-footer-divider" />
          <p className="l-footer-copy">
            Made with <FaHeart className="footer-heart" /> for the community ·
            © {new Date().getFullYear()} StudyShala · Built by Borra Adithya
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
