import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserGraduate, FaChalkboardTeacher, FaCheck } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { ImSpinner8 } from 'react-icons/im';
import { MdMenuBook } from 'react-icons/md';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/student/enter-code', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const handleSignIn = () => {
    if (!selectedRole) {
      setError('Please select whether you are a Student or Faculty first.');
      return;
    }
    setLoading(true);
    setError('');
    const BACKEND_URL = 'https://test-of-studyshala.onrender.com';
    window.location.href = `${BACKEND_URL}/api/auth/google?role=${selectedRole}`;
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-shape login-shape-1"></div>
        <div className="login-shape login-shape-2"></div>
        <div className="login-shape login-shape-3"></div>
      </div>

      <div className="login-card">
        {/* Header — brand name + icon only, NO logo image */}
        <div className="login-header">
          <div className="login-brand">
            <span className="login-brand-icon"><MdMenuBook /></span>
            <span className="login-brand-name">StudyShala</span>
          </div>
          <p className="login-subtitle">Empowering education through seamless material sharing</p>
        </div>

        <div className="login-body">
          <h2 className="login-welcome">Welcome back 👋</h2>
          <p className="login-description">Choose your role to get started</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>
          )}

          <div className="role-selector">
            <div className="role-cards">
              <button
                type="button"
                className={`role-card ${selectedRole === 'student' ? 'role-card--active' : ''}`}
                onClick={() => { setSelectedRole('student'); setError(''); }}
              >
                <span className="role-card__icon"><FaUserGraduate /></span>
                <div className="role-card__text">
                  <span className="role-card__title">Student</span>
                  <span className="role-card__desc">Enter a code to access &amp; download study materials</span>
                </div>
                {selectedRole === 'student' && <span className="role-card__check"><FaCheck /></span>}
              </button>

              <button
                type="button"
                className={`role-card ${selectedRole === 'faculty' ? 'role-card--active' : ''}`}
                onClick={() => { setSelectedRole('faculty'); setError(''); }}
              >
                <span className="role-card__icon"><FaChalkboardTeacher /></span>
                <div className="role-card__text">
                  <span className="role-card__title">Faculty</span>
                  <span className="role-card__desc">Upload files &amp; generate access codes for students</span>
                </div>
                {selectedRole === 'faculty' && <span className="role-card__check"><FaCheck /></span>}
              </button>
            </div>
          </div>

          <button
            className={`google-btn ${!selectedRole ? 'google-btn--disabled' : ''}`}
            onClick={handleSignIn}
            disabled={loading || !selectedRole}
          >
            {loading ? (
              <>
                <ImSpinner8 className="google-btn__spinner" />
                <span>Redirecting to Google…</span>
              </>
            ) : (
              <>
                <FcGoogle className="google-btn__icon" />
                <span>
                  {selectedRole
                    ? `Sign in as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} with Google`
                    : 'Sign in with Google'}
                </span>
              </>
            )}
          </button>

          <p className="login-info">
            {selectedRole === 'faculty'
              ? '🔒 Faculty accounts are verified by your institution.'
              : '📚 Use your Google account to sign in.'}
          </p>

          <div className="admin-link-wrapper">
            <Link to="/admin/login" className="admin-link">Admin? Click here</Link>
          </div>
        </div>

        <div className="login-footer">
          <p>© 2025 StudyShala. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
