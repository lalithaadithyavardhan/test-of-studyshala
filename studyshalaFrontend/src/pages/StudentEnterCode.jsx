import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import './StudentEnterCode.css';

const StudentEnterCode = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setValidating(true);
    setError('');

    try {
      const res = await api.post('/student/validate-code', { accessCode: accessCode.trim() });

      if (res.data.valid) {
        // Redirect to material access page
        navigate(`/student/material-access/${res.data.material._id}`, {
          state: { material: res.data.material }
        });
      } else {
        setError('❌ Invalid code or material not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar role="student" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <div className="enter-code-container">
            <Card title="🔑 Enter Access Code">
              <p className="enter-code-description">
                Enter the code provided by your faculty to access study materials
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleValidate} className="enter-code-form">
                <Input
                  label="Access Code"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g., A3F9K2BX"
                  required
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    textAlign: 'center'
                  }}
                />
                <p className="code-hint">8 characters • Case-insensitive</p>
                <Button type="submit" disabled={validating || !accessCode.trim()} className="w-full">
                  {validating ? '⏳ Validating…' : '🔓 Access Material'}
                </Button>
              </form>
            </Card>

            <div className="quick-links">
              <button className="quick-link-btn" onClick={() => navigate('/student/saved-materials')}>
                📚 My Saved Materials
              </button>
              <button className="quick-link-btn" onClick={() => navigate('/student/history')}>
                📜 Access History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEnterCode;
