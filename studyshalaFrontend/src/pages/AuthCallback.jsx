import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasProcessed.current) return;

    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (token && userJson) {
      try {
        hasProcessed.current = true;
        const userData = JSON.parse(decodeURIComponent(userJson));

        // Save data and update state
        login(userData, token);

        // Redirect based on role
        if (userData.role === 'faculty') {
          navigate('/faculty/dashboard', { replace: true });
        } else if (userData.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/student/enter-code', { replace: true });
        }
      } catch (error) {
        console.error('Auth Callback Error:', error);
        navigate('/login?error=token_error', { replace: true });
      }
    } else {
      navigate('/login?error=no_data', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>Logging you in...</h2>
    </div>
  );
};

export default AuthCallback;
