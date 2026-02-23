import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import './Login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (user) navigate('/', { replace: true });
  }, [user]);

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Google sign-in failed. Please try again.');
    } else if (searchParams.get('error') === 'not_admin') {
      setError('This Google account does not have admin access.');
    }
  }, [searchParams]);

  const handleAdminSignIn = () => {
    setLoading(true);
    setError('');
    window.location.href = '/api/auth/google?role=admin';
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-shape login-shape-1"></div>
        <div className="login-shape login-shape-2"></div>
      </div>

      <div className="login-card" style={{maxWidth:'400px'}}>
        <div className="login-header" style={{background:'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)'}}>
          <img src={logo} alt="StudyShala Logo" className="login-logo" style={{maxWidth:'200px'}} />
          <p className="login-subtitle" style={{color:'rgba(255,255,255,0.9)'}}>Administration Panel</p>
        </div>

        <div className="login-body">
          <h2 className="login-welcome" style={{fontSize:'1.25rem'}}>⚙️ Admin Sign In</h2>
          <p className="login-description">
            For authorised administrators only. Your account must be pre-approved.
          </p>

          {error && <div className="alert alert-error" style={{marginBottom:'1.25rem'}}>{error}</div>}

          <button className="google-btn" onClick={handleAdminSignIn} disabled={loading}>
            {loading ? (
              <><div className="google-btn__spinner"></div><span>Redirecting…</span></>
            ) : (
              <>
                <svg className="google-btn__icon" viewBox="0 0 20 20" fill="none">
                  <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                  <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                  <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                  <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google as Admin</span>
              </>
            )}
          </button>

          <div className="admin-link-wrapper" style={{marginTop:'1rem'}}>
            <Link to="/login" className="admin-link">← Back to main login</Link>
          </div>
        </div>

        <div className="login-footer">
          <p>⚠️ Unauthorised access attempts are logged.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
