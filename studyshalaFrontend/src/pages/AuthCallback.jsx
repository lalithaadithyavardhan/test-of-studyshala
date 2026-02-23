import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const params    = new URLSearchParams(window.location.search);
        const token     = params.get('token');
        const userParam = params.get('user');
        const errParam  = params.get('error');

        if (errParam) {
          setError('Authentication failed. Redirecting…');
          setTimeout(() => navigate('/login'), 2500);
          return;
        }
        if (!token || !userParam) {
          setError('Incomplete authentication. Redirecting…');
          setTimeout(() => navigate('/login'), 2500);
          return;
        }

        const userData = JSON.parse(decodeURIComponent(userParam));
        await login(token, userData);

        if      (userData.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
        else if (userData.role === 'admin')   navigate('/admin/dashboard',   { replace: true });
        else                                  navigate('/student/dashboard', { replace: true });

      } catch (err) {
        console.error(err);
        setError('Something went wrong. Redirecting…');
        setTimeout(() => navigate('/login'), 2500);
      }
    })();
  }, []);

  if (error) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fee2e2',color:'#991b1b',borderLeft:'4px solid #ef4444',padding:'1rem 1.5rem',borderRadius:'0.5rem',maxWidth:'400px',textAlign:'center'}}>
        ⚠️ {error}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.5rem'}}>
      <div style={{width:'52px',height:'52px',border:'4px solid rgba(37,99,235,0.15)',borderTop:'4px solid #2563eb',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
      <div style={{textAlign:'center'}}>
        <h2 style={{fontSize:'1.25rem',fontWeight:'600',marginBottom:'0.4rem'}}>Signing you in…</h2>
        <p style={{fontSize:'0.875rem',color:'#64748b'}}>Please wait</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default AuthCallback;
