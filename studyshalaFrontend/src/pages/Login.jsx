import { useState, useEffect, useRef, useCallback } from 'react';
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
import './Login.css';

/* ══════════════════════════════════════════════
   HOOKS & UTILITIES
   ══════════════════════════════════════════════ */

/* Smooth eased counter */
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

/* Scroll-reveal hook — adds .is-visible when element enters viewport */
const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

/* ══════════════════════════════════════════════
   CURSOR SPOTLIGHT COMPONENT
   ══════════════════════════════════════════════ */
const CursorSpotlight = () => {
  const spotRef = useRef(null);
  const trailRef = useRef(null);
  const posRef = useRef({ x: -300, y: -300 });
  const trailPos = useRef({ x: -300, y: -300 });
  const rafRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => { posRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove);

    const animate = () => {
      // Trail follows cursor very closely — lerp 0.88 = near-instant
      trailPos.current.x += (posRef.current.x - trailPos.current.x) * 0.88;
      trailPos.current.y += (posRef.current.y - trailPos.current.y) * 0.88;

      if (spotRef.current) {
        spotRef.current.style.transform =
          `translate(${posRef.current.x}px, ${posRef.current.y}px) translate(-50%, -50%)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform =
          `translate(${trailPos.current.x}px, ${trailPos.current.y}px) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* Large ambient glow */}
      <div ref={spotRef} className="cursor-glow" aria-hidden="true" />
      {/* Small lagging dot */}
      <div ref={trailRef} className="cursor-trail" aria-hidden="true" />
    </>
  );
};

/* ══════════════════════════════════════════════
   MAGNETIC BUTTON WRAPPER
   Subtle pull-toward-cursor on hover
   ══════════════════════════════════════════════ */
const Magnetic = ({ children, strength = 0.25 }) => {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, [strength]);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="magnetic">
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════════
   REVEAL WRAPPER — wraps any element for scroll animation
   ══════════════════════════════════════════════ */
const Reveal = ({ children, delay = 0, className = '', from = 'bottom' }) => {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal reveal--${from} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════════
   STAT ITEM
   ══════════════════════════════════════════════ */
const StatItem = ({ value, label, index }) => {
  const [visible, setVisible] = useState(false);
  const count = useCounter(value, 1800, visible);
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
    <div ref={ref} className="stat-item reveal reveal--bottom is-visible"
      style={{ transitionDelay: `${index * 100}ms` }}>
      <span className="stat-num">{count.toLocaleString()}<span className="stat-plus">+</span></span>
      <span className="stat-lbl">{label}</span>
    </div>
  );
};

/* ══════════════════════════════════════════════
   POSTCARD
   ══════════════════════════════════════════════ */
const Postcard = ({ message, from, location, date, color, delay }) => {
  const ref = useScrollReveal({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className="postcard reveal reveal--bottom"
      style={{ '--pc-color': color, transitionDelay: `${delay}ms` }}
    >
      <div className="postcard-left">
        <p className="postcard-msg">{message}</p>
      </div>
      <div className="postcard-right">
        <div className="postcard-stamp">
          <div className="postcard-stamp-inner">
            <MdMenuBook />
            <span>StudyShala</span>
          </div>
        </div>
        <div className="postcard-divider" />
        <div className="postcard-meta">
          <div className="postcard-location">{location}</div>
          <div className="postcard-row"><span>From:</span><span className="postcard-from">{from}</span></div>
          <div className="postcard-row"><span>Date:</span><span>{date}</span></div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   LOGIN CARD
   ══════════════════════════════════════════════ */
const LoginCard = ({ selectedRole, setSelectedRole, onSignIn, loading, error }) => (
  <div className="lc-wrap">
    <div className="lc-header">
      <div className="lc-logo"><MdMenuBook /></div>
      <div>
        <div className="lc-title">Sign in to StudyShala</div>
        <div className="lc-sub">Pick your role, then continue with Google</div>
      </div>
    </div>

    {error && <div className="lc-error">{error}</div>}

    <div className="lc-roles">
      <button
        className={`lc-role ${selectedRole === 'student' ? 'lc-role--on' : ''}`}
        onClick={() => setSelectedRole('student')}
      >
        <FaUserGraduate className="lc-role-ico" />
        <div className="lc-role-body">
          <span className="lc-role-name">Student</span>
          <span className="lc-role-desc">Access study materials with a code</span>
        </div>
        {selectedRole === 'student' && <FaCheck className="lc-role-tick" />}
      </button>
      <button
        className={`lc-role ${selectedRole === 'faculty' ? 'lc-role--on' : ''}`}
        onClick={() => setSelectedRole('faculty')}
      >
        <FaChalkboardTeacher className="lc-role-ico" />
        <div className="lc-role-body">
          <span className="lc-role-name">Faculty</span>
          <span className="lc-role-desc">Upload &amp; manage study materials</span>
        </div>
        {selectedRole === 'faculty' && <FaCheck className="lc-role-tick" />}
      </button>
    </div>

    <Magnetic strength={0.18}>
      <button
        className={`lc-google ${!selectedRole ? 'lc-google--off' : ''}`}
        onClick={onSignIn}
        disabled={loading || !selectedRole}
      >
        {loading
          ? <><ImSpinner8 className="lc-spin" /><span>Redirecting…</span></>
          : <><FcGoogle className="lc-google-ico" />
              <span>{selectedRole
                ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                : 'Sign in with Google'}</span>
              {selectedRole && <FaArrowRight className="lc-arrow" />}
            </>
        }
      </button>
    </Magnetic>

    <p className="lc-hint">
      {selectedRole === 'faculty' ? '🔒 Verified by your institution'
       : selectedRole === 'student' ? '📚 Use your institutional Google account'
       : '🔐 Secure Google OAuth — no password needed'}
    </p>
  </div>
);

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  /* Fallback numbers shown immediately — replaced with live data once backend wakes */
  const [stats,        setStats]        = useState({ totalStudents: 120, totalFaculty: 18, totalMaterials: 95, totalVisits: 540 });
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [pageReady,    setPageReady]    = useState(false);

  /* Trigger hero entrance after mount */
  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

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
        if (attempt < 5 && !cancelled) setTimeout(() => fetch_(attempt + 1), attempt === 1 ? 8000 : 15000);
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
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <div className="auth-loading-logo"><MdMenuBook /></div>
          <div className="auth-loading-name">StudyShala</div>
          <div className="auth-loading-ring" />
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
  const steps = [
    { role: 'Student', num: '01', title: 'Sign in with Google', desc: 'Use your institutional Google account to log in.' },
    { role: 'Student', num: '02', title: 'Enter Access Code',   desc: 'Get the code from your faculty and enter it.' },
    { role: 'Student', num: '03', title: 'Save or Download',    desc: 'Preview, save materials, or download files.' },
    { role: 'Faculty', num: '01', title: 'Login & Create',      desc: 'Sign in and create a new material folder.' },
    { role: 'Faculty', num: '02', title: 'Upload Files',        desc: 'Drag & drop PDFs, docs, presentations.' },
    { role: 'Faculty', num: '03', title: 'Share the Code',      desc: 'Copy the auto-generated code for your class.' },
  ];
  const postcards = [
    { message: "This is so helpful!! My faculty shared the code and I had all notes in seconds. Absolutely love this.", from: 'Priya M.', location: 'HYDERABAD', date: 'Mar 2026', color: '#f0f4ff', delay: 0 },
    { message: "Finally no more WhatsApp forwards with broken Drive links. StudyShala is a blessing for our department.", from: 'Dr. Ramesh K.', location: 'BANGALORE', date: 'Feb 2026', color: '#fff8f0', delay: 100 },
    { message: "Simple, clean, fast. The code system is genius. All my students accessed notes within 2 minutes.", from: 'Sunita V.', location: 'PUNE', date: 'Feb 2026', color: '#f0fff8', delay: 200 },
    { message: "I saved so much time not having to email files individually. The download feature works perfectly!", from: 'Arjun D.', location: 'CHENNAI', date: 'Jan 2026', color: '#fdf0ff', delay: 300 },
  ];

  return (
    <div className={`landing ${pageReady ? 'page-ready' : ''}`}>
      <CursorSpotlight />

      {/* ── Navbar ── */}
      <nav className={`l-nav ${navScrolled ? 'l-nav--solid' : ''}`}>
        <div className="l-nav-inner">
          <Magnetic strength={0.3}>
            <div className="l-brand hero-enter" style={{ animationDelay: '0ms' }}>
              <MdMenuBook className="l-brand-ico" />
              <span className="l-brand-name">StudyShala</span>
            </div>
          </Magnetic>
          <div className="l-nav-links">
            {['features','how','stats','postcards','about'].map((id, i) => (
              <a key={id} href={`#${id}`}
                className="hero-enter nav-link-item"
                style={{ animationDelay: `${80 + i * 50}ms` }}>
                {id === 'how' ? 'How it works' : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
          </div>
          <Link to="/admin/login" className="l-admin-link hero-enter" style={{ animationDelay: '380ms' }}>
            Admin ↗
          </Link>
          <button className={`l-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="l-mobile-nav">
            {['features','how','stats','postcards','about'].map(id => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {id === 'how' ? 'How it works' : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
            <Link to="/admin/login" onClick={() => setMenuOpen(false)}>Admin</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-annotation hero-enter" style={{ animationDelay: '100ms' }}>
              — study material platform
            </div>
            <h1 className="hero-h1">
              <span className="hero-h1-word hero-enter" style={{ animationDelay: '180ms' }}>
                Hey <span className="hero-emoji">📚</span> Study smarter.
              </span>
              <br />
              <span className="hero-h1-word hero-enter" style={{ animationDelay: '280ms' }}>
                Share <span className="hero-underline">faster.</span>
              </span>
              <br />
              <span className="hero-h1-word hero-enter" style={{ animationDelay: '380ms' }}>
                <span className="hero-h1-sub">Access anywhere.</span>
              </span>
            </h1>
            <p className="hero-body hero-enter" style={{ animationDelay: '460ms' }}>
              StudyShala is a code-based study material platform connecting
              faculty and students. Upload once, generate a code, share with
              your class — no logins for students, no broken links, no friction.
            </p>
            <div className="hero-tags hero-enter" style={{ animationDelay: '540ms' }}>
              <span>✓ No ads</span>
              <span>✓ Google Drive backed</span>
              <span>✓ Free forever</span>
              <span>✓ Instant access</span>
            </div>
          </div>
          <div className="hero-right hero-enter" style={{ animationDelay: '320ms' }}>
            <LoginCard
              selectedRole={selectedRole}
              setSelectedRole={(r) => { setSelectedRole(r); setError(''); }}
              onSignIn={handleSignIn}
              loading={loading}
              error={error}
            />
            <div className="hero-annotation-right">← sign in to get started :)</div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" id="stats">
        <div className="section-wrap">
          <Reveal delay={0}>
            <div className="stats-label">— live numbers from our platform</div>
          </Reveal>
          <div className="stats-row">
            <StatItem value={stats.totalStudents}  label="Students joined"   index={0} />
            <div className="stats-sep" />
            <StatItem value={stats.totalFaculty}   label="Faculty members"   index={1} />
            <div className="stats-sep" />
            <StatItem value={stats.totalMaterials} label="Materials shared"  index={2} />
            <div className="stats-sep" />
            <StatItem value={stats.totalVisits}    label="Total visits"      index={3} />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-wrap">
          <Reveal><div className="section-side-label">Features</div></Reveal>
          <div className="features-grid">
            <div className="features-intro">
              <Reveal delay={0}>
                <h2 className="section-h2">Everything you need,<br />nothing you don't.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="section-body">Powerful tools built for both sides of education. Students get instant access, faculty get full control.</p>
              </Reveal>
            </div>
            <div className="feature-cols">
              <div className="feature-col">
                <Reveal delay={0}>
                  <div className="feature-col-title student-col-title">
                    <FaUserGraduate /> For Students
                  </div>
                </Reveal>
                <ul>
                  {studentFeatures.map((f, i) => (
                    <Reveal key={i} delay={i * 60} from="left">
                      <li className="feature-li">
                        <span className="feature-li-ico student-ico">{f.icon}</span>
                        <span>{f.text}</span>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </div>
              <div className="feature-col">
                <Reveal delay={80}>
                  <div className="feature-col-title faculty-col-title">
                    <FaChalkboardTeacher /> For Faculty
                  </div>
                </Reveal>
                <ul>
                  {facultyFeatures.map((f, i) => (
                    <Reveal key={i} delay={80 + i * 60} from="left">
                      <li className="feature-li">
                        <span className="feature-li-ico faculty-ico">{f.icon}</span>
                        <span>{f.text}</span>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── How it works ── */}
      <section className="how-section" id="how">
        <div className="section-wrap">
          <Reveal><div className="section-side-label">How it works</div></Reveal>
          <div className="how-intro">
            <Reveal delay={0}><h2 className="section-h2">Three steps.<br />For everyone.</h2></Reveal>
            <Reveal delay={100}><p className="section-body">Simple by design. No manuals needed.</p></Reveal>
          </div>
          <div className="how-grid">
            {['Student', 'Faculty'].map((role, ri) => (
              <Reveal key={role} delay={ri * 120} from="bottom">
                <div className={`how-block how-${role.toLowerCase()}`}>
                  <div className="how-block-label">{role} flow</div>
                  {steps.filter(s => s.role === role).map((s, i) => (
                    <div key={s.num} className="how-step" style={{ transitionDelay: `${i * 60}ms` }}>
                      <div className="how-step-num">{s.num}</div>
                      <div>
                        <div className="how-step-title">{s.title}</div>
                        <div className="how-step-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Postcards ── */}
      <section className="postcards-section" id="postcards">
        <div className="section-wrap">
          <Reveal><div className="section-side-label">Postcards</div></Reveal>
          <div className="postcards-intro">
            <Reveal delay={0}><h2 className="section-h2">From the community.</h2></Reveal>
            <Reveal delay={100}>
              <p className="section-body">Real words from students and faculty who use StudyShala every day.</p>
            </Reveal>
          </div>
          <div className="postcards-grid">
            {postcards.map((pc, i) => (
              <Postcard key={i} {...pc} />
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── About ── */}
      <section className="about-section" id="about">
        <div className="section-wrap">
          <Reveal><div className="section-side-label">About</div></Reveal>
          <div className="about-grid">
            <Reveal from="left" delay={0}>
              <div className="about-avatar-wrap">
                <img
                  src="https://avatars.githubusercontent.com/lalithaadithyavardhan"
                  alt="Borra Adithya"
                  className="about-avatar"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            </Reveal>
            <div className="about-right">
              <Reveal delay={80}><h2 className="section-h2">Borra Adithya.</h2></Reveal>
              <Reveal delay={140}><div className="about-role">Student · Developer</div></Reveal>
              <Reveal delay={200}>
                <p className="section-body">
                  Hi! I built StudyShala to solve a real problem — making it easy for
                  faculty to share study materials and for students to access them without
                  friction. This platform was built with love for my college community.
                </p>
              </Reveal>
              <Reveal delay={280}>
                <blockquote className="about-quote">
                  "StudyShala is free, ad-free, and will always remain so. If it helps even one student, that's all the reward I need."
                </blockquote>
              </Reveal>
              <Reveal delay={360}>
                <div className="about-links">
                  {[
                    { href: 'https://github.com/lalithaadithyavardhan', icon: <FaGithub />, label: 'GitHub' },
                    { href: 'https://linkedin.com/in/borra-adithya-95a885352', icon: <FaLinkedin />, label: 'LinkedIn' },
                    { href: 'mailto:adithyasai533@gmail.com', icon: <MdEmail />, label: 'Email' },
                  ].map(({ href, icon, label }) => (
                    <Magnetic key={label} strength={0.35}>
                      <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'}
                        rel="noopener noreferrer" className="about-link">
                        {icon} {label}
                      </a>
                    </Magnetic>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div className="l-footer-top">
            <div className="l-footer-brand">
              <MdMenuBook className="l-footer-brand-ico" />
              <span>StudyShala</span>
            </div>
            <p className="l-footer-tagline">Empowering education through seamless material sharing.</p>
          </div>
          <div className="l-footer-links">
            <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer"><FaGithub /> GitHub</a>
            <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer"><FaLinkedin /> LinkedIn</a>
            <a href="mailto:adithyasai533@gmail.com"><MdEmail /> Email</a>
          </div>
          <div className="l-footer-bottom">
            <span>© {new Date().getFullYear()} StudyShala · Built by Borra Adithya</span>
            <span>Made with <FaHeart className="footer-heart" /> for the community</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
