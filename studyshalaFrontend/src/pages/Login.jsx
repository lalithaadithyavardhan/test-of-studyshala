import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
import { MdMenuBook, MdEmail } from 'react-icons/md';

/* ── Import assets from src/assets/ (Vite handles bundling) ────────────── */
import heroBgMp4  from '../assets/hero-bg.mp4';
import teacher1Svg from '../assets/teacher1.svg';
import teacher2Svg from '../assets/teacher2.svg';
import student1Svg from '../assets/student1.svg';
import student2Svg from '../assets/student2.svg';
import student3Svg from '../assets/student3.svg';

import './Login.css';

/* ══════════════════════════════════════════════════════════════════════════
   HOOKS
   ══════════════════════════════════════════════════════════════════════════ */
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

const useScrollReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

/* ══════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */
const Reveal = ({ children, delay = 0, from = 'bottom', className = '' }) => {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className={`clay-reveal clay-reveal--${from} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const StatItem = ({ value, label }) => {
  const [visible, setVisible] = useState(false);
  const count = useCounter(value, 2000, visible);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="clay-stat">
      <span className="clay-stat-num">{count.toLocaleString()}<span className="clay-stat-plus">+</span></span>
      <span className="clay-stat-lbl">{label}</span>
    </div>
  );
};

const FloatingIllustration = ({ src, className, delay = 0 }) => (
  <div className={`clay-float ${className}`} style={{ animationDelay: `${delay}s` }}>
    <img src={src} alt="" aria-hidden="true" draggable="false" />
  </div>
);

const TestimonialCard = ({ message, from, role, delay }) => {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="clay-testimonial clay-reveal clay-reveal--bottom"
      style={{ transitionDelay: `${delay}ms` }}>
      <p className="clay-testimonial-msg">"{message}"</p>
      <div className="clay-testimonial-footer">
        <span className="clay-testimonial-from">{from}</span>
        <span className="clay-testimonial-role">{role}</span>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text, delay, colorClass }) => {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="clay-feature-item clay-reveal clay-reveal--left"
      style={{ transitionDelay: `${delay}ms` }}>
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

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN CARD
   ══════════════════════════════════════════════════════════════════════════ */
const LoginCard = ({ selectedRole, setSelectedRole, onSignIn, loading, error }) => (
  <div className="clay-login-card">
    <div className="clay-login-header">
      <div className="clay-login-logo"><MdMenuBook /></div>
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
      onClick={onSignIn}
      disabled={loading || !selectedRole}
    >
      {loading
        ? <><ImSpinner8 className="clay-spin" /><span>Redirecting…</span></>
        : <><FcGoogle className="clay-google-ico" />
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

/* ══════════════════════════════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [stats,        setStats]        = useState({ totalStudents: 120, totalFaculty: 18, totalMaterials: 95, totalVisits: 540 });
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [pageReady,    setPageReady]    = useState(false);

  useEffect(() => { const t = setTimeout(() => setPageReady(true), 60); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetch_ = async (attempt) => {
      try {
        const res = await api.get('/stats');
        if (!cancelled) setStats(res.data);
      } catch {
        if (attempt < 5 && !cancelled)
          setTimeout(() => fetch_(attempt + 1), attempt === 1 ? 8000 : 15000);
      }
    };
    fetch_(1);
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
      <div className="clay-auth-loading">
        <div className="clay-auth-loading-inner">
          <div className="clay-auth-loading-logo"><MdMenuBook /></div>
          <div className="clay-auth-loading-name">StudyShala</div>
          <div className="clay-auth-loading-ring" />
        </div>
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

  const navLinks = ['features', 'how', 'stats', 'postcards', 'about'];

  return (
    <div className={`clay-page ${pageReady ? 'clay-ready' : ''}`}>

      {/* ── Navbar ── */}
      <nav className={`clay-nav ${navScrolled ? 'clay-nav--solid' : ''}`}>
        <div className="clay-nav-inner">
          <div className="clay-brand clay-enter" style={{ animationDelay: '0ms' }}>
            <MdMenuBook className="clay-brand-ico" />
            <span className="clay-brand-name">StudyShala</span>
          </div>
          <div className="clay-nav-links">
            {navLinks.map((id, i) => (
              <a key={id} href={`#${id}`} className="clay-nav-link clay-enter"
                style={{ animationDelay: `${80 + i * 50}ms` }}>
                {id === 'how' ? 'How it works' : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
          </div>
          <Link to="/admin/login" className="clay-admin-link clay-enter" style={{ animationDelay: '360ms' }}>
            Admin ↗
          </Link>
          <button className={`clay-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="clay-mobile-nav">
            {navLinks.map(id => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {id === 'how' ? 'How it works' : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
            <Link to="/admin/login" onClick={() => setMenuOpen(false)}>Admin</Link>
          </div>
        )}
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="clay-hero">
        <video className="clay-hero-video" autoPlay muted loop playsInline>
          <source src={heroBgMp4} type="video/mp4" />
        </video>
        <div className="clay-hero-overlay" />

        <FloatingIllustration src={teacher1Svg} className="clay-float--tl" delay={0} />
        <FloatingIllustration src={student3Svg} className="clay-float--br" delay={1.5} />
        <FloatingIllustration src={teacher2Svg} className="clay-float--bl" delay={0.8} />

        <div className="clay-hero-inner">
          <div className="clay-hero-left">
            <div className="clay-hero-badge clay-enter" style={{ animationDelay: '80ms' }}>
              📚 study material platform
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

          <div className="clay-hero-right clay-enter" style={{ animationDelay: '300ms' }}>
            <LoginCard
              selectedRole={selectedRole}
              setSelectedRole={(r) => { setSelectedRole(r); setError(''); }}
              onSignIn={handleSignIn}
              loading={loading}
              error={error}
            />
            <div className="clay-hero-hint">← sign in to get started :)</div>
          </div>
        </div>

        <div className="clay-hero-student clay-enter" style={{ animationDelay: '600ms' }}>
          <img src={student1Svg} alt="Student illustration" draggable="false" />
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════════════ */}
      <section className="clay-stats-section" id="stats">
        <div className="clay-wrap">
          <Reveal><div className="clay-section-label">— live numbers</div></Reveal>
          <div className="clay-stats-grid">
            <StatItem value={stats.totalStudents}  label="Students joined" />
            <StatItem value={stats.totalFaculty}   label="Faculty members" />
            <StatItem value={stats.totalMaterials} label="Materials shared" />
            <StatItem value={stats.totalVisits}    label="Total visits" />
          </div>
        </div>
      </section>

      <div className="clay-divider" />

      {/* ══ FEATURES ══════════════════════════════════════════════════════ */}
      <section className="clay-features-section" id="features">
        <div className="clay-wrap">
          <Reveal><div className="clay-section-label">Features</div></Reveal>
          <div className="clay-features-grid">
            <div className="clay-features-intro">
              <Reveal delay={0}>
                <h2 className="clay-section-h2">Everything you need,<br/>nothing you don't.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="clay-section-body">
                  Powerful tools built for both sides of education. Students get instant access, faculty get full control.
                </p>
              </Reveal>
              <Reveal delay={200}>
                <div className="clay-features-illustration">
                  <img src={student2Svg} alt="Student illustration" draggable="false" />
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
                  <FeatureItem key={i} icon={f.icon} text={f.text} delay={i * 60} colorClass="clay-ico--student" />
                ))}
              </div>
              <div className="clay-feature-col">
                <Reveal delay={100}>
                  <div className="clay-feature-col-title clay-faculty-title">
                    <FaChalkboardTeacher /> For Faculty
                  </div>
                </Reveal>
                {facultyFeatures.map((f, i) => (
                  <FeatureItem key={i} icon={f.icon} text={f.text} delay={100 + i * 60} colorClass="clay-ico--faculty" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="clay-divider" />

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section className="clay-how-section" id="how">
        <div className="clay-wrap">
          <Reveal><div className="clay-section-label">How it works</div></Reveal>
          <div className="clay-how-intro">
            <Reveal delay={0}><h2 className="clay-section-h2">Three steps.<br/>For everyone.</h2></Reveal>
            <Reveal delay={100}><p className="clay-section-body">Simple by design. No manuals needed.</p></Reveal>
          </div>
          <div className="clay-how-grid">
            <Reveal delay={0}>
              <div className="clay-how-block clay-how-student">
                <div className="clay-how-block-label">Student flow</div>
                <HowStep num="01" title="Sign in with Google" desc="Use your institutional Google account to log in." delay={60} />
                <HowStep num="02" title="Enter Access Code" desc="Get the 8-character code from your faculty and enter it." delay={120} />
                <HowStep num="03" title="Save or Download" desc="Preview, save materials, or download files to your device." delay={180} />
                <div className="clay-how-illustration">
                  <img src={student3Svg} alt="" draggable="false" />
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="clay-how-block clay-how-faculty">
                <div className="clay-how-block-label">Faculty flow</div>
                <HowStep num="01" title="Login & Create" desc="Sign in and create a new material folder instantly." delay={60} />
                <HowStep num="02" title="Upload Files" desc="Drag & drop PDFs, docs, presentations, images." delay={120} />
                <HowStep num="03" title="Share the Code" desc="Copy the auto-generated code and share with your class." delay={180} />
                <div className="clay-how-illustration clay-how-illustration--right">
                  <img src={teacher1Svg} alt="" draggable="false" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="clay-divider" />

      {/* ══ TESTIMONIALS ══════════════════════════════════════════════════ */}
      <section className="clay-testimonials-section" id="postcards">
        <div className="clay-wrap">
          <Reveal><div className="clay-section-label">Postcards</div></Reveal>
          <div className="clay-testimonials-intro">
            <Reveal delay={0}><h2 className="clay-section-h2">From the community.</h2></Reveal>
            <Reveal delay={100}><p className="clay-section-body">Real words from students and faculty who use StudyShala every day.</p></Reveal>
          </div>
          <div className="clay-testimonials-grid">
            <TestimonialCard message="This is so helpful!! My faculty shared the code and I had all notes in seconds. Absolutely love this." from="Priya M." role="Student · Hyderabad" delay={0} />
            <TestimonialCard message="Finally no more WhatsApp forwards with broken Drive links. StudyShala is a blessing for our department." from="Dr. Ramesh K." role="Faculty · Bangalore" delay={100} />
            <TestimonialCard message="Simple, clean, fast. The code system is genius. All my students accessed notes within 2 minutes." from="Sunita V." role="Faculty · Pune" delay={200} />
            <TestimonialCard message="I saved so much time not having to email files individually. The download feature works perfectly!" from="Arjun D." role="Student · Chennai" delay={300} />
          </div>
        </div>
      </section>

      <div className="clay-divider" />

      {/* ══ ABOUT ═════════════════════════════════════════════════════════ */}
      <section className="clay-about-section" id="about">
        <div className="clay-wrap">
          <Reveal><div className="clay-section-label">About</div></Reveal>
          <div className="clay-about-grid">
            <Reveal from="left" delay={0}>
              <div className="clay-about-avatar-wrap">
                <img src="https://avatars.githubusercontent.com/lalithaadithyavardhan"
                  alt="Borra Adithya" className="clay-about-avatar"
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
            </Reveal>
            <div className="clay-about-right">
              <Reveal delay={80}><h2 className="clay-section-h2">Borra Adithya.</h2></Reveal>
              <Reveal delay={140}><div className="clay-about-role">Student · Developer</div></Reveal>
              <Reveal delay={200}>
                <p className="clay-section-body">
                  Hi! I built StudyShala to solve a real problem — making it easy for
                  faculty to share study materials and for students to access them without friction.
                  Built with love for my college community.
                </p>
              </Reveal>
              <Reveal delay={280}>
                <blockquote className="clay-about-quote">
                  "StudyShala is free, ad-free, and will always remain so. If it helps even one student, that's all the reward I need."
                </blockquote>
              </Reveal>
              <Reveal delay={360}>
                <div className="clay-about-links">
                  <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer" className="clay-about-link"><FaGithub /> GitHub</a>
                  <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer" className="clay-about-link"><FaLinkedin /> LinkedIn</a>
                  <a href="mailto:adithyasai533@gmail.com" className="clay-about-link"><MdEmail /> Email</a>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="clay-footer">
        <div className="clay-wrap clay-footer-inner">
          <div className="clay-footer-brand"><MdMenuBook className="clay-footer-brand-ico" /><span>StudyShala</span></div>
          <p className="clay-footer-tagline">Empowering education through seamless material sharing.</p>
          <div className="clay-footer-links">
            <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer"><FaGithub /> GitHub</a>
            <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer"><FaLinkedin /> LinkedIn</a>
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
