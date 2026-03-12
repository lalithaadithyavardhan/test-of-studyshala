import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdMenuBook,
  MdDashboard,
  MdLibraryBooks,
  MdBookmark,
  MdHistory,
  MdKey,
  MdSettings,
  MdChevronLeft,
  MdChevronRight,
  MdMenu,
  MdClose,
  MdFolderOpen
} from 'react-icons/md';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = () => { if (mq.matches) setIsMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const menuItems = {
    faculty: [
      { path: '/faculty/dashboard', icon: <MdDashboard />,   label: 'Dashboard'        },
      { path: '/faculty/materials', icon: <MdLibraryBooks />,label: 'My Materials'     },
      { path: '/browse-materials',  icon: <MdFolderOpen />,  label: 'Browse Materials' },
    ],
    student: [
      { path: '/student/enter-code',      icon: <MdKey />,      label: 'Enter Code'       },
      { path: '/student/saved-materials', icon: <MdBookmark />, label: 'My Materials'     },
      { path: '/student/history',         icon: <MdHistory />,  label: 'History'          },
      { path: '/browse-materials',        icon: <MdFolderOpen />,label: 'Browse Materials'},
    ],
    admin: [
      { path: '/admin/dashboard',  icon: <MdSettings />,   label: 'Dashboard'        },
      { path: '/browse-materials', icon: <MdFolderOpen />, label: 'Browse Materials' },
    ],
  };

  const links = menuItems[role] || [];
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
      >
        <MdMenu />
      </button>

      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-branding">
              <span className="sidebar-brand-icon"><MdMenuBook /></span>
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-name">StudyShala</span>
                <span className="sidebar-role-badge">{roleLabel}</span>
              </div>
            </div>
          )}
          <div className="sidebar-header-actions">
            <button
              className="sidebar-toggle desktop-only"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
            </button>
            <button
              className="sidebar-toggle mobile-only"
              onClick={() => setIsMobileOpen(false)}
              title="Close menu"
            >
              <MdClose />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <button
              key={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''} ${link.path === '/browse-materials' ? 'sidebar-link--browse' : ''}`}
              onClick={() => navigate(link.path)}
              title={isCollapsed ? link.label : ''}
            >
              <span className="sidebar-icon">{link.icon}</span>
              <span className="sidebar-label">{link.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
