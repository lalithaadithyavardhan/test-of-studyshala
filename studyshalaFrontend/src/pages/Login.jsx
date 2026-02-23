import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
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
  }, [user]);

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
    window.location.href = `/api/auth/google?role=${selectedRole}`;
  };

  return (
    <div className="login-container">
      {/* Decorative background shapes */}
      <div className="login-background">
        <div className="login-shape login-shape-1"></div>
        <div className="login-shape login-shape-2"></div>
        <div className="login-shape login-shape-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="StudyShala Logo" className="login-logo" />
          <p className="login-subtitle">Empowering education through seamless material sharing</p>
        </div>

        <div className="login-body">
          <h2 className="login-welcome">Welcome!</h2>
          <p className="login-description">Choose your role to get started</p>

          {error && <div className="alert alert-error" style={{marginBottom:'1.25rem'}}>{error}</div>}

          <div className="role-selector">
            <div className="role-cards">
              <button type="button"
                className={`role-card ${selectedRole === 'student' ? 'role-card--active' : ''}`}
                onClick={() => { setSelectedRole('student'); setError(''); }}>
                <span className="role-card__icon">🎓</span>
                <span className="role-card__title">Student</span>
                <span className="role-card__desc">Enter a code to access & download study materials</span>
                {selectedRole === 'student' && <span className="role-card__check">✓</span>}
              </button>

              <button type="button"
                className={`role-card ${selectedRole === 'faculty' ? 'role-card--active' : ''}`}
                onClick={() => { setSelectedRole('faculty'); setError(''); }}>
                <span className="role-card__icon">👨‍🏫</span>
                <span className="role-card__title">Faculty</span>
                <span className="role-card__desc">Upload files & generate access codes for students</span>
                {selectedRole === 'faculty' && <span className="role-card__check">✓</span>}
              </button>
            </div>
          </div>

          <button
            className={`google-btn ${!selectedRole ? 'google-btn--disabled' : ''}`}
            onClick={handleSignIn}
            disabled={loading || !selectedRole}>
            {loading ? (
              <><div className="google-btn__spinner"></div><span>Redirecting to Google…</span></>
            ) : (
              <>
                <svg className="google-btn__icon" viewBox="0 0 20 20" fill="none">
                  <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                  <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                  <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                  <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
                </svg>
                <span>{selectedRole ? `Sign in as ${selectedRole.charAt(0).toUpperCase()+selectedRole.slice(1)} with Google` : 'Sign in with Google'}</span>
              </>
            )}
          </button>

          <p className="login-info">
            {selectedRole === 'faculty' ? '🔒 Faculty accounts are verified by your institution.' : '📚 Use your Google account to sign in.'}
          </p>

          <div className="admin-link-wrapper">
            <Link to="/admin/login" className="admin-link">Admin? Click here</Link>
          </div>
        </div>

        <div className="login-footer">
          <p>© 2024 StudyShala. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;