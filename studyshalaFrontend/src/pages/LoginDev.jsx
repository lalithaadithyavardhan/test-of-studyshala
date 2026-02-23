import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import './Login.css';

const LoginDev = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('faculty');

  useEffect(() => {
    if (user) {
      redirectToDashboard(user.role);
    }
  }, [user]);

  const redirectToDashboard = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'faculty':
        navigate('/faculty/dashboard');
        break;
      case 'student':
        navigate('/student/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  const handleMockLogin = async (role) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock user data based on role
    const mockUsers = {
      admin: {
        name: 'Admin User',
        email: 'admin@college.edu',
        role: 'admin',
        department: 'Administration'
      },
      faculty: {
        name: 'Dr. John Smith',
        email: 'john.smith@college.edu',
        role: 'faculty',
        department: 'CSE'
      },
      student: {
        name: 'Alice Johnson',
        email: 'alice.johnson@college.edu',
        role: 'student',
        department: 'CSE',
        semester: '5'
      }
    };

    const mockToken = `mock-jwt-token-${role}-${Date.now()}`;
    const mockUser = mockUsers[role];

    await login(mockToken, mockUser);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      // This would redirect to actual Google OAuth in production
      // For development, use mock login instead
      await handleMockLogin(selectedRole);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">CSMS</h1>
          <p className="login-subtitle">Certificate Storage Management System</p>
          <div className="dev-badge">Development Mode</div>
        </div>

        <div className="login-body">
          <h2 className="login-welcome">Welcome Back</h2>
          <p className="login-description">
            Choose a role to test the application
          </p>

          {/* Role Selection for Testing */}
          <div className="role-selector">
            <label className="role-label">Select Test Role:</label>
            <div className="role-buttons">
              <button
                className={`role-btn ${selectedRole === 'student' ? 'active' : ''}`}
                onClick={() => setSelectedRole('student')}
              >
                <span className="role-icon">👨‍🎓</span>
                <span>Student</span>
              </button>
              <button
                className={`role-btn ${selectedRole === 'faculty' ? 'active' : ''}`}
                onClick={() => setSelectedRole('faculty')}
              >
                <span className="role-icon">👨‍🏫</span>
                <span>Faculty</span>
              </button>
              <button
                className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => setSelectedRole('admin')}
              >
                <span className="role-icon">👨‍💼</span>
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Quick Login Buttons */}
          <div className="quick-login-section">
            <p className="quick-login-label">Quick Login As:</p>
            <div className="quick-login-buttons">
              <Button
                onClick={() => handleMockLogin('student')}
                disabled={loading}
                variant="success"
                className="w-full"
              >
                {loading && selectedRole === 'student' ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>👨‍🎓 Login as Student</>
                )}
              </Button>
              <Button
                onClick={() => handleMockLogin('faculty')}
                disabled={loading}
                variant="primary"
                className="w-full"
              >
                {loading && selectedRole === 'faculty' ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>👨‍🏫 Login as Faculty</>
                )}
              </Button>
              <Button
                onClick={() => handleMockLogin('admin')}
                disabled={loading}
                variant="danger"
                className="w-full"
              >
                {loading && selectedRole === 'admin' ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>👨‍💼 Login as Admin</>
                )}
              </Button>
            </div>
          </div>

          <div className="login-divider">
            <span>or use Google OAuth (Production)</span>
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-login-btn"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                  <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                  <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                  <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google (as {selectedRole})</span>
              </>
            )}
          </Button>

          <div className="dev-info">
            <p>
              <strong>💡 Testing Mode:</strong> This login page uses mock authentication. 
              In production, replace this with the actual Google OAuth flow.
            </p>
          </div>
        </div>

        <div className="login-footer">
          <p>© 2024 CSMS. All rights reserved.</p>
          <p className="dev-note">Development Build</p>
        </div>
      </div>

      <div className="login-background">
        <div className="login-shape login-shape-1"></div>
        <div className="login-shape login-shape-2"></div>
        <div className="login-shape login-shape-3"></div>
      </div>
    </div>
  );
};

export default LoginDev;
