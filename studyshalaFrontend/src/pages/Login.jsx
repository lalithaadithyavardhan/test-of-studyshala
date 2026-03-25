import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  FaUserGraduate, FaChalkboardTeacher, FaCheck,
  FaBookOpen, FaKey, FaCloudUploadAlt, FaShareAlt,
  FaDownload, FaSave, FaHistory, FaUsers, FaFileAlt,
  FaGithub, FaLinkedin, FaHeart, FaArrowRight
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { ImSpinner8 } from 'react-icons/im';
import { MdEmail } from 'react-icons/md';
import owlLogo from '../assets/logo.svg';

import heroBgMp4  from '../assets/hero-bg.mp4';
import student2Svg from '../assets/student2.svg';
import student3Svg from '../assets/student3.svg';
import teacher1Svg from '../assets/teacher1.svg';

import './Login.css';

const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
};

const useScrollReveal = (threshold = 0.12) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.classList.contains('is-visible')) return;
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) {
      el.classList.add('clay-anim-ready');
    } else {
      el.classList.add('is-visible');
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          obs.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -30px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
};

const Reveal = ({ children, delay = 0, from = 'bottom', className = '' }) => {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`clay-reveal clay-reveal--${from} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const SectionReveal = ({ children, className = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight;
    if (!inView) {
      el.classList.add('clay-animate');
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
        { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }
  }, []);
  return (
    <div ref={ref} className={`clay-section-reveal ${className}`}>
      {children}
    </div>
  );
};

const FeedbackCard = ({ message, name, role, delay }) => {
  const ref = useScrollReveal();
  const roleLabel = role === 'faculty' ? `Faculty` : `Student`;
  return (
    <div
      ref={ref}
      className="clay-testimonial clay-reveal clay-reveal--bottom"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="clay-testimonial-msg">"{message}"</p>
      <div className="clay-testimonial-footer">
        <span className="clay-testimonial-from">{name}</span>
        <span className="clay-testimonial-role">{roleLabel}</span>
      </div>
    </div>
  );
};

const StatItem = ({ value, label }) => {
  const isLoading = value === null || value === undefined;
  const count = useCounter(isLoading ? 0 : value, 2000, !isLoading);
  return (
    <div className="clay-stat">
      <span className="clay-stat-num">
        {isLoading
          ? <span className="clay-stat-loading">—</span>
          : <>{count.toLocaleString()}<span className="clay-stat-plus">+</span></>
        }
      </span>
      <span className="clay-stat-lbl">{label}</span>
    </div>
  );
};

const FeatureItem = ({ icon, text, delay, colorClass }) => {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className="clay-feature-item clay-reveal clay-reveal--left"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className={`clay-feature-ico ${colorClass}`}>{icon}</span>
      <span>{text}</span>
    </div>
  );
};

const HowStep = ({ num, title, desc, delay }) => (
  <Reveal delay={delay}>
    <div className="clay-step">
      <div className="clay-step-num">{num}</div>
      <div>
        <div className="clay-step-title">{title}</div>
        <div className="clay-step-desc">{desc}</div>
      </div>
    </div>
  </Reveal>
);

const LoginCard = ({ selectedRole, setSelectedRole, onSignIn, loading, error }) => (
  <div className="clay-login-card">
    <div className="clay-login-header">
      <div className="clay-login-logo"><img src={owlLogo} alt="StudyShala" style={{ width: '32px', height: '32px', objectFit: 'contain' }} /></div>
      <div>
        <div className="clay-login-title">Sign in to StudyShala</div>
        <div className="clay-login-sub">Pick your role · continue with Google</div>
      </div>
    </div>

    {error && <div className="clay-login-error">{error}</div>}

    <div className="clay-roles">
      <button
        className={`clay-role ${selectedRole === 'student' ? 'clay-role--on' : ''}`}
        onClick={() => setSelectedRole('student')}
      >
        <FaUserGraduate className="clay-role-ico" />
        <div>
          <div className="clay-role-name">Student</div>
          <div className="clay-role-desc">Access materials with a code</div>
        </div>
        {selectedRole === 'student' && <FaCheck className="clay-role-tick" />}
      </button>
      <button
        className={`clay-role ${selectedRole === 'faculty' ? 'clay-role--on' : ''}`}
        onClick={() => setSelectedRole('faculty')}
      >
        <FaChalkboardTeacher className="clay-role-ico" />
        <div>
          <div className="clay-role-name">Faculty</div>
          <div className="clay-role-desc">Upload & manage materials</div>
        </div>
        {selectedRole === 'faculty' && <FaCheck className="clay-role-tick" />}
      </button>
    </div>

    <button
      className={`clay-google-btn ${!selectedRole ? 'clay-google-btn--off' : ''}`}
      onClick={() => onSignIn()}
      disabled={loading || !selectedRole}
    >
      {loading
        ? <><ImSpinner8 className="clay-spin" /><span>Redirecting…</span></>
        : <>
            <FcGoogle className="clay-google-ico" />
            <span>
              {selectedRole
                ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                : 'Sign in with Google'}
            </span>
            {selectedRole && <FaArrowRight className="clay-arrow" />}
          </>
      }
    </button>

    <p className="clay-login-hint">
      {selectedRole === 'faculty' ? '🔒 Verified by your institution'
       : selectedRole === 'student' ? '📚 Use your institutional Google account'
       : '🔐 Secure OAuth · No password needed'}
    </p>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState(() => {
    try { return localStorage.getItem('lastRole') || null; } catch { return null; }
  });
  const lastUserName = (() => {
    try {
      const u = localStorage.getItem('lastUser');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [stats,        setStats]        = useState(null);
  const [feedbacks,    setFeedbacks]    = useState([]);
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [pageReady,    setPageReady]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const wakeAndFetch = async () => {
      api.post('/stats/visit').catch(() => {});

      const DELAYS = [0, 5000, 10000, 15000, 20000, 25000, 30000]; 
      for (let i = 0; i < DELAYS.length; i++) {
        if (cancelled) return;
        if (DELAYS[i] > 0) {
          await new Promise(r => setTimeout(r, DELAYS[i]));
        }
        if (cancelled) return;
        try {
          const res = await api.get('/stats');
          if (!cancelled && res.data) {
            setStats(res.data);
            return; 
          }
        } catch {}
      }
    };

    wakeAndFetch();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    api.get('/feedback')
      .then(res => {
        if (res.data?.feedbacks?.length) setFeedbacks(res.data.feedbacks);
      })
      .catch(() => {});
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
      <div className="clay-auth-loading">
        <div className="clay-auth-loading-inner">
          <div className="clay-auth-loading-logo"><img src={owlLogo} alt="StudyShala" style={{ width: '64px', height: '64px', objectFit: 'contain' }} /></div>
          <div className="clay-auth-loading-name">StudyShala</div>
          <div className="clay-auth-loading-ring" />
        </div>
      </div>
    );
  }

  const handleSignIn = (role) => {
    const roleToUse = (role && typeof role === 'string') ? role : selectedRole;
    if (!roleToUse) { setError('Please select a role first.'); return; }
    setLoading(true); setError('');
    try { localStorage.setItem('lastRole', roleToUse); } catch {}

    let hint = '';
    try {
      const stored = localStorage.getItem('lastUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) hint = parsed.email;
      }
    } catch {}

    // Uses your environment variable for local vs production
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = new URL(`${baseUrl}/auth/google`);
    
    url.searchParams.set('role', roleToUse);
    
    if (hint) {
      url.searchParams.set('hint', hint);
    } else {
      // Force account picker if "Switch Account" was clicked
      url.searchParams.set('prompt', 'select_account');
    }
    
    window.location.href = url.toString();
  };

  const studentFeatures = [
    { icon: <FaKey />,      text: 'Enter a code shared by your faculty' },
    { icon: <FaBookOpen />, text: 'Preview PDFs, docs and images instantly' },
    { icon: <FaDownload />, text: 'Download files directly to your device' },
    { icon: <FaSave />,     text: 'Save materials for permanent access' },
    { icon: <FaHistory />,  text: 'View your complete access history' },
  ];
  const facultyFeatures = [
    { icon: <FaCloudUploadAlt />, text: 'Upload multiple files via drag & drop' },
    { icon: <FaKey />,            text: 'Auto-generated unique access codes' },
    { icon: <FaShareAlt />,       text: 'Share codes with students instantly' },
    { icon: <FaUsers />,          text: 'Track student access in real time' },
    { icon: <FaFileAlt />,        text: 'Preview and manage all uploaded files' },
  ];

  const navLinks = ['features', 'how', 'stats', 'postcards'];

  return (
    <div className={`clay-page ${pageReady ? 'clay-ready' : ''}`}>
      <nav className={`clay-nav ${navScrolled ? 'clay-nav--solid' : ''}`}>
        <div className="clay-nav-inner">
          <div className="clay-brand clay-enter" style={{ animationDelay: '0ms' }}>
            <img src={owlLogo} alt="StudyShala" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span className="clay-brand-name">StudyShala</span>
          </div>
          <div className="clay-nav-links">
            {navLinks.map((id, i) => (
              <a key={id} href={`#${id}`} className="clay-nav-link clay-enter"
                style={{ animationDelay: `${80 + i * 50}ms` }}>
                {id === 'how' ? 'How it works'
                 : id === 'postcards' ? 'Postcards'
                 : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
            <a href="#signin" className="clay-nav-signin clay-enter"
              style={{ animationDelay: '330ms' }}>
              Sign In
            </a>
          </div>
          <button
            className={`clay-burger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="clay-mobile-nav">
            {navLinks.map(id => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {id === 'how' ? 'How it works'
                 : id === 'postcards' ? 'Postcards'
                 : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
            <a href="#signin" onClick={() => setMenuOpen(false)} className="clay-mobile-signin">
              Sign In →
            </a>
          </div>
        )}
      </nav>

      <section className="clay-hero">
        <video className="clay-hero-video" autoPlay muted loop playsInline>
          <source src={heroBgMp4} type="video/mp4" />
        </video>

        <div className="clay-hero-pane">
          <div className="clay-hero-inner">
            <div className="clay-hero-left">
              <div className="clay-hero-badge clay-enter" style={{ animationDelay: '80ms' }}>
                <img src={owlLogo} alt="" style={{ width: "16px", height: "16px", objectFit: "contain", verticalAlign: "middle" }} />
                &nbsp; Study material platform
              </div>
              <h1 className="clay-hero-h1">
                <span className="clay-enter" style={{ animationDelay: '160ms' }}>
                  Study <span className="clay-h1-accent">smarter.</span>
                </span>
                <br />
                <span className="clay-enter" style={{ animationDelay: '260ms' }}>
                  Share <span className="clay-h1-underline">faster.</span>
                </span>
                <br />
                <span className="clay-enter clay-h1-sub" style={{ animationDelay: '360ms' }}>
                  Access anywhere.
                </span>
              </h1>
              <p className="clay-hero-body clay-enter" style={{ animationDelay: '440ms' }}>
                A code-based study material platform connecting faculty and students.
                Upload once, generate a code, share with your class — no broken links, no friction.
              </p>
              <div className="clay-hero-tags clay-enter" style={{ animationDelay: '520ms' }}>
                <span>✓ No ads</span>
                <span>✓ Google Drive backed</span>
                <span>✓ Free forever</span>
                <span>✓ Instant access</span>
              </div>
            </div>

            <div id="signin" className="clay-hero-right clay-enter" style={{ animationDelay: '300ms' }}>
              {lastUserName && !loading && (
                <div className="clay-quick-return">
                  <div className="clay-quick-return-label">Welcome back!</div>
                  <div className="clay-quick-return-name">{lastUserName.name}</div>
                  <div className="clay-quick-return-meta">
                    Last signed in as <strong>{lastUserName.role}</strong>
                  </div>
                  <button
                    className="clay-quick-return-btn"
                    onClick={() => handleSignIn(lastUserName.role)}
                    disabled={loading}
                  >
                    <FcGoogle className="clay-google-ico" style={{ fontSize: '1.1rem', background: '#fff', borderRadius: '50%', padding: '2px' }} />
                    Continue as {lastUserName.name.split(' ')[0]}
                    <FaArrowRight style={{ fontSize: '.85rem', marginLeft: 'auto' }} />
                  </button>
                  <button
                    className="clay-quick-return-switch"
                    onClick={() => {
                      try { localStorage.removeItem('lastUser'); localStorage.removeItem('lastRole'); } catch {}
                      setSelectedRole(null);
                    }}
                  >
                    Switch account or role
                  </button>
                </div>
              )}

              {!lastUserName && (
                <>
                  <LoginCard
                    selectedRole={selectedRole}
                    setSelectedRole={(r) => { setSelectedRole(r); setError(''); }}
                    onSignIn={handleSignIn}
                    loading={loading}
                    error={error}
                  />
                  <div className="clay-hero-hint">← sign in to get started :)</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="clay-scroll-indicator clay-enter" style={{ animationDelay: '900ms' }}>
          <div className="clay-scroll-dot" />
        </div>
      </section>

      <SectionReveal>
        <section className="clay-stats-section" id="stats">
          <div className="clay-wrap">
            <Reveal><div className="clay-section-label">— live numbers</div></Reveal>
            <div className="clay-stats-grid">
              {[
                { key: 'totalStudents',  label: 'Students joined' },
                { key: 'totalFaculty',   label: 'Faculty members' },
                { key: 'totalMaterials', label: 'Materials shared' },
                { key: 'totalVisits',    label: 'Total visits' },
              ].map(s => (
                <StatItem
                  key={s.label}
                  value={stats ? stats[s.key] : null}
                  label={s.label}
                />
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <div className="clay-divider" />

      <SectionReveal>
        <section className="clay-features-section" id="features">
          <div className="clay-wrap">
            <Reveal><div className="clay-section-label">Features</div></Reveal>
            <div className="clay-features-grid">
              <div className="clay-features-intro">
                <Reveal delay={0}>
                  <h2 className="clay-section-h2">Everything you need,<br />nothing you don't.</h2>
                </Reveal>
                <Reveal delay={100}>
                  <p className="clay-section-body">
                    Powerful tools built for both sides of education.
                    Students get instant access, faculty get full control.
                  </p>
                </Reveal>
                <Reveal delay={200}>
                  <div className="clay-features-illustration">
                    <img src={student2Svg} alt="" draggable="false" />
                  </div>
                </Reveal>
              </div>
              <div className="clay-feature-cols">
                <div className="clay-feature-col">
                  <Reveal delay={0}>
                    <div className="clay-feature-col-title clay-student-title">
                      <FaUserGraduate /> For Students
                    </div>
                  </Reveal>
                  {studentFeatures.map((f, i) => (
                    <FeatureItem key={i} icon={f.icon} text={f.text} delay={i * 70} colorClass="clay-ico--student" />
                  ))}
                </div>
                <div className="clay-feature-col">
                  <Reveal delay={100}>
                    <div className="clay-feature-col-title clay-faculty-title">
                      <FaChalkboardTeacher /> For Faculty
                    </div>
                  </Reveal>
                  {facultyFeatures.map((f, i) => (
                    <FeatureItem key={i} icon={f.icon} text={f.text} delay={100 + i * 70} colorClass="clay-ico--faculty" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      <div className="clay-divider" />

      <SectionReveal>
        <section className="clay-how-section" id="how">
          <div className="clay-wrap">
            <Reveal><div className="clay-section-label">How it works</div></Reveal>
            <div className="clay-how-intro">
              <Reveal delay={0}><h2 className="clay-section-h2">Three steps.<br />For everyone.</h2></Reveal>
              <Reveal delay={100}><p className="clay-section-body">Simple by design. No manuals needed.</p></Reveal>
            </div>
            <div className="clay-how-grid">
              <Reveal delay={0} from="left">
                <div className="clay-how-block clay-how-student">
                  <div className="clay-how-block-label">Student flow</div>
                  <HowStep num="01" title="Sign in with Google"
                    desc="Use your institutional Google account to log in." delay={60} />
                  <HowStep num="02" title="Enter Access Code"
                    desc="Get the 8-character code from your faculty and enter it." delay={130} />
                  <HowStep num="03" title="Save or Download"
                    desc="Preview, save materials, or download files to your device." delay={200} />
                  <div className="clay-how-illustration">
                    <img src={student3Svg} alt="" draggable="false" />
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120} from="right">
                <div className="clay-how-block clay-how-faculty">
                  <div className="clay-how-block-label">Faculty flow</div>
                  <HowStep num="01" title="Login & Create"
                    desc="Sign in and create a new material folder instantly." delay={60} />
                  <HowStep num="02" title="Upload Files"
                    desc="Drag & drop PDFs, docs, presentations, images." delay={130} />
                  <HowStep num="03" title="Share the Code"
                    desc="Copy the auto-generated code and share with your class." delay={200} />
                  <div className="clay-how-illustration clay-how-illustration--right">
                    <img src={teacher1Svg} alt="" draggable="false" />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </SectionReveal>

      <div className="clay-divider" />

      <SectionReveal>
        <section className="clay-testimonials-section" id="postcards">
          <div className="clay-wrap">
            <Reveal><div className="clay-section-label">Postcards</div></Reveal>
            <div className="clay-testimonials-intro">
              <Reveal delay={0}><h2 className="clay-section-h2">From the community.</h2></Reveal>
              <Reveal delay={100}>
                <p className="clay-section-body">
                  Real words from students and faculty who use StudyShala every day.
                </p>
              </Reveal>
            </div>
            <div className="clay-testimonials-grid">
              {feedbacks.length > 0
                ? feedbacks.slice(0, 8).map((fb, i) => (
                    <FeedbackCard
                      key={fb._id || i}
                      message={fb.message}
                      name={fb.name}
                      role={fb.role}
                      delay={i * 80}
                    />
                  ))
                : [
                    { message: 'This saved me so much time before exams!', name: 'A Student', role: 'student' },
                    { message: 'My students accessed all notes within minutes of sharing the code.', name: 'A Faculty', role: 'faculty' },
                    { message: 'No more broken WhatsApp links. This is exactly what we needed.', name: 'A Faculty', role: 'faculty' },
                    { message: 'Simple, fast and completely free. Love it!', name: 'A Student', role: 'student' },
                  ].map((fb, i) => (
                    <FeedbackCard key={i} message={fb.message} name={fb.name} role={fb.role} delay={i * 80} />
                  ))
              }
            </div>
          </div>
        </section>
      </SectionReveal>

      <footer className="clay-footer" id="about">
        <div className="clay-wrap clay-footer-inner">
          <div className="clay-footer-brand">
            <img src={owlLogo} alt="StudyShala" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            <span>StudyShala</span>
          </div>
          <p className="clay-footer-tagline">
            Empowering education through seamless material sharing.
          </p>

          <div className="clay-footer-about">
            <div className="clay-footer-about-name">Borra Adithya</div>
            <div className="clay-footer-about-meta">Student · Developer</div>
            <p className="clay-footer-about-bio">
              Built StudyShala to make it easy for faculty to share study materials
              and for students to access them without friction — free, ad-free, always.
            </p>
            <blockquote className="clay-footer-quote">
              "If it helps even one student, that's all the reward I need."
            </blockquote>
          </div>

          <div className="clay-footer-links">
            <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer">
              <FaGithub /> GitHub
            </a>
            <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer">
              <FaLinkedin /> LinkedIn
            </a>
            <a href="mailto:adithyasai533@gmail.com"><MdEmail /> Email</a>
          </div>

          <div className="clay-footer-bottom">
            <span>© {new Date().getFullYear()} StudyShala · Built by Borra Adithya</span>
            <span>Made with <FaHeart className="clay-footer-heart" /> for the community</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
