import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  MdKeyboardArrowDown,
  MdLogout,
  MdPerson
} from 'react-icons/md';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-title">StudyShala</h1>

        <div className="navbar-actions">
          {/* Profile dropdown */}
          <div className="profile-dropdown" ref={dropdownRef}>
            <button
              className="profile-button"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="profile-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="profile-avatar-img" />
                ) : (
                  <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'User'}</span>
                <span className="profile-role">{user?.role || 'Role'}</span>
              </div>
              <MdKeyboardArrowDown className={`dropdown-arrow ${showDropdown ? 'rotated' : ''}`} />
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="dropdown-avatar-img" />
                    ) : (
                      <MdPerson />
                    )}
                  </div>
                  <div>
                    <p className="dropdown-name">{user?.name}</p>
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                </div>
                <hr className="dropdown-divider" />
                <button
                  className="dropdown-item dropdown-item--danger"
                  onClick={handleLogout}
                >
                  <MdLogout /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
