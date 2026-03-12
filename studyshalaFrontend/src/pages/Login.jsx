import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCheck,
  FaBookOpen,
  FaKey,
  FaCloudUploadAlt,
  FaShareAlt,
  FaDownload,
  FaSave,
  FaHistory,
  FaUsers,
  FaFileAlt,
  FaGithub,
  FaLinkedin,
  FaHeart,
  FaArrowRight,
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { ImSpinner8 } from "react-icons/im";
import { MdMenuBook, MdEmail } from "react-icons/md";
import "./Login.css";

/* Animated counter */

const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);

      const ease = 1 - Math.pow(1 - progress, 3);

      setCount(Math.floor(ease * target));

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, duration, start]);

  return count;
};

/* Stat Item */

const StatItem = ({ value, label, index }) => {
  const [visible, setVisible] = useState(false);

  const count = useCounter(value, 1600, visible);

  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.4 }
    );

    if (ref.current) obs.observe(ref.current);

    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="stat-item"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="stat-num">
        {count.toLocaleString()}
        <span className="stat-plus">+</span>
      </span>
      <span className="stat-lbl">{label}</span>
    </div>
  );
};

/* Login Card */

const LoginCard = ({
  selectedRole,
  setSelectedRole,
  onSignIn,
  loading,
  error,
}) => {
  return (
    <div className="lc-wrap">
      <div className="lc-header">
        <div className="lc-logo">
          <MdMenuBook />
        </div>

        <div>
          <div className="lc-title">Sign in to StudyShala</div>
          <div className="lc-sub">Pick your role, then continue with Google</div>
        </div>
      </div>

      {error && <div className="lc-error">{error}</div>}

      <div className="lc-roles">
        <button
          className={`lc-role ${
            selectedRole === "student" ? "lc-role--on" : ""
          }`}
          onClick={() => setSelectedRole("student")}
        >
          <FaUserGraduate className="lc-role-ico" />

          <div className="lc-role-body">
            <span className="lc-role-name">Student</span>
            <span className="lc-role-desc">
              Access study materials with a code
            </span>
          </div>

          {selectedRole === "student" && <FaCheck className="lc-role-tick" />}
        </button>

        <button
          className={`lc-role ${
            selectedRole === "faculty" ? "lc-role--on" : ""
          }`}
          onClick={() => setSelectedRole("faculty")}
        >
          <FaChalkboardTeacher className="lc-role-ico" />

          <div className="lc-role-body">
            <span className="lc-role-name">Faculty</span>
            <span className="lc-role-desc">
              Upload & manage study materials
            </span>
          </div>

          {selectedRole === "faculty" && <FaCheck className="lc-role-tick" />}
        </button>
      </div>

      <button
        className={`lc-google ${!selectedRole ? "lc-google--off" : ""}`}
        onClick={onSignIn}
        disabled={loading || !selectedRole}
      >
        {loading ? (
          <>
            <ImSpinner8 className="lc-spin" />
            <span>Redirecting…</span>
          </>
        ) : (
          <>
            <FcGoogle className="lc-google-ico" />
            <span>
              {selectedRole
                ? `Continue as ${
                    selectedRole.charAt(0).toUpperCase() +
                    selectedRole.slice(1)
                  }`
                : "Sign in with Google"}
            </span>

            {selectedRole && <FaArrowRight className="lc-arrow" />}
          </>
        )}
      </button>
    </div>
  );
};

/* MAIN COMPONENT */

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalMaterials: 0,
    totalVisits: 0,
  });

  const [menuOpen, setMenuOpen] = useState(false);

  /* Page title */

  useEffect(() => {
    document.title = "StudyShala — Share study materials easily";
  }, []);

  /* Fetch stats */

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const res = await api.get("/stats", {
          signal: controller.signal,
        });

        setStats(res.data);
      } catch (err) {
        console.log("Stats fetch error:", err.message);
      }
    };

    fetchStats();

    return () => controller.abort();
  }, []);

  /* Auto redirect if logged */

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (user.role === "faculty") navigate("/faculty/dashboard");
      else navigate("/student/enter-code");
    }
  }, [user, authLoading, navigate]);

  /* URL error */

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed")
      setError("Google sign-in failed. Try again.");
  }, [searchParams]);

  const handleSignIn = () => {
    if (!selectedRole) {
      setError("Please select a role first.");
      return;
    }

    setLoading(true);

    window.location.href =
      "https://test-of-studyshala.onrender.com/api/auth/google?role=" +
      selectedRole;
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <MdMenuBook />
      </div>
    );
  }

  return (
    <div className="landing">
      {/* Navbar */}

      <nav className="l-nav">
        <div className="l-brand">
          <MdMenuBook />
          <span>StudyShala</span>
        </div>

        <div className="l-nav-links">
          <a href="#features">Features</a>
          <a href="#stats">Stats</a>
          <a href="#about">About</a>
        </div>

        <button
          className="l-burger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </nav>

      {/* HERO */}

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <h1>
              Study smarter 📚
              <br />
              Share faster
            </h1>

            <p>
              StudyShala connects faculty and students through
              simple access codes.
            </p>
          </div>

          <div className="hero-right">
            <LoginCard
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              onSignIn={handleSignIn}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </section>

      {/* STATS */}

      <section className="stats-section" id="stats">
        <StatItem
          value={stats.totalStudents}
          label="Students"
          index={0}
        />
        <StatItem
          value={stats.totalFaculty}
          label="Faculty"
          index={1}
        />
        <StatItem
          value={stats.totalMaterials}
          label="Materials"
          index={2}
        />
        <StatItem
          value={stats.totalVisits}
          label="Visits"
          index={3}
        />
      </section>

      {/* ABOUT */}

      <section id="about" className="about-section">
        <h2>Borra Adithya</h2>

        <p>
          StudyShala was created to make sharing academic
          materials simple for students and faculty.
        </p>

        <div className="about-links">
          <a href="https://github.com/lalithaadithyavardhan">
            <FaGithub /> GitHub
          </a>

          <a href="https://linkedin.com/in/borra-adithya-95a885352">
            <FaLinkedin /> LinkedIn
          </a>

          <a href="mailto:adithyasai533@gmail.com">
            <MdEmail /> Email
          </a>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="l-footer">
        <span>© {new Date().getFullYear()} StudyShala</span>
        <span>
          Made with <FaHeart />
        </span>
      </footer>
    </div>
  );
};

export default Login;
