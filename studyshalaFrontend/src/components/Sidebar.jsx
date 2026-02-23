import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.svg';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Added state to support the .collapsed CSS logic you provided
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const menuItems = {
    faculty: [
      { path: '/faculty/dashboard', icon: '🏠', label: 'Dashboard' },
      { path: '/faculty/materials', icon: '📚', label: 'My Materials' }
    ],
    student: [
      { path: '/student/enter-code', icon: '🔑', label: 'Enter Code' },
      { path: '/student/saved-materials', icon: '💾', label: 'My Materials' },
      { path: '/student/history', icon: '📜', label: 'History' }
    ],
    admin: [
      { path: '/admin/dashboard', icon: '⚙️', label: 'Dashboard' }
    ]
  };

  const links = menuItems[role] || [];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        
        {/* Hide logo and subtitle when collapsed for a cleaner look */}
        {!isCollapsed && (
          <div className="sidebar-branding">
            <img src={logo} alt="StudyShala Logo" className="sidebar-logo" />
            <p className="sidebar-subtitle">
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest'}
            </p>
          </div>
        )}

        {/* Toggle Button */}
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <button
            key={link.path}
            // Updated to use the .active class from your CSS
            className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
            onClick={() => navigate(link.path)}
            title={isCollapsed ? link.label : ''} // Shows a tooltip when collapsed
          >
            {/* Updated class names to match your CSS exactly */}
            <span className="sidebar-icon">{link.icon}</span>
            <span className="sidebar-label">{link.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;