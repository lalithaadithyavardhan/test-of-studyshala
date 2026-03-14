import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdMenuBook, MdDashboard, MdLibraryBooks,
  MdHistory, MdKey, MdSettings, MdFolderOpen,
  MdChevronLeft, MdChevronRight, MdMenu, MdClose,
  MdInfoOutline, MdStar
} from 'react-icons/md';
import { FaGithub, FaLinkedin, FaHeart } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed,  setIsCollapsed]  = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [aboutOpen,    setAboutOpen]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const h  = () => { if (mq.matches) setIsMobileOpen(false); };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const menuItems = {
    faculty: [
      { path: '/faculty/dashboard', icon: <MdDashboard />,    label: 'Dashboard'        },
      { path: '/faculty/materials', icon: <MdLibraryBooks />, label: 'My Materials'     },
      { path: '/browse-materials',  icon: <MdFolderOpen />,   label: 'Browse Materials' },
    ],
    student: [
      { path: '/student/enter-code', icon: <MdKey />,        label: 'Enter Code'       },
      { path: '/browse-materials',   icon: <MdFolderOpen />, label: 'Browse Materials' },
      { path: '/student/history',    icon: <MdHistory />,    label: 'History'          },
      { path: '/student/starred',    icon: <MdStar />,       label: 'Starred Files'    },
    ],
    admin: [
      { path: '/admin/dashboard',  icon: <MdSettings />,   label: 'Dashboard'        },
      { path: '/browse-materials', icon: <MdFolderOpen />, label: 'Browse Materials' },
    ],
  };

  const links     = menuItems[role] || [];
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';

  return (
    <>
      <button className="sb-hamburger" onClick={() => setIsMobileOpen(true)} aria-label="Open menu">
        <MdMenu />
      </button>

      {isMobileOpen && <div className="sb-backdrop" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`sb ${isCollapsed ? 'sb--collapsed' : ''} ${isMobileOpen ? 'sb--open' : ''} ${mounted ? 'sb--mounted' : ''}`}>

        <div className="sb-header">
          {!isCollapsed && (
            <div className="sb-brand">
              <div className="sb-brand-icon"><MdMenuBook /></div>
              <div className="sb-brand-text">
                <span className="sb-brand-name">StudyShala</span>
                <span className="sb-role-pill">{roleLabel}</span>
              </div>
            </div>
          )}
          <div className="sb-header-actions">
            <button className="sb-toggle desktop-only" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'Expand' : 'Collapse'}>
              {isCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
            </button>
            <button className="sb-toggle mobile-only" onClick={() => setIsMobileOpen(false)}>
              <MdClose />
            </button>
          </div>
        </div>

        <nav className="sb-nav">
          {links.map((link, i) => (
            <button
              key={link.path}
              className={`sb-link ${isActive(link.path) ? 'sb-link--active' : ''} ${link.path === '/student/starred' ? 'sb-link--starred' : ''}`}
              style={{ transitionDelay: mounted ? `${i * 60}ms` : '0ms' }}
              onClick={() => navigate(link.path)}
              title={isCollapsed ? link.label : ''}
            >
              <span className="sb-icon">{link.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="sb-label">{link.label}</span>
                  {isActive(link.path) && <span className="sb-active-dot" />}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          {!isCollapsed ? (
            <>
              <button className="sb-about-toggle" onClick={() => setAboutOpen(!aboutOpen)}>
                <MdInfoOutline className="sb-about-icon" />
                <span>About</span>
                <span className={`sb-about-caret ${aboutOpen ? 'open' : ''}`}>›</span>
              </button>

              <div className={`sb-about-panel ${aboutOpen ? 'sb-about-panel--open' : ''}`}>
                <div className="sb-about-row">
                  <img
                    src="https://avatars.githubusercontent.com/lalithaadithyavardhan"
                    alt="Borra Adithya"
                    className="sb-about-avatar"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <div className="sb-about-name">Borra Adithya</div>
                    <div className="sb-about-role">Student · Developer</div>
                  </div>
                </div>
                <p className="sb-about-desc">
                  Built StudyShala to make study material sharing effortless — free, ad-free, always.
                </p>
                <div className="sb-about-links">
                  <a href="https://github.com/lalithaadithyavardhan" target="_blank" rel="noopener noreferrer" className="sb-about-link">
                    <FaGithub /> GitHub
                  </a>
                  <a href="https://linkedin.com/in/borra-adithya-95a885352" target="_blank" rel="noopener noreferrer" className="sb-about-link">
                    <FaLinkedin /> LinkedIn
                  </a>
                </div>
              </div>

              <div className="sb-watermark">
                <span className="sb-footer-text">studyshala</span>
                <FaHeart className="sb-footer-heart" />
              </div>
            </>
          ) : (
            <button
              className="sb-toggle"
              style={{ margin: '0 auto', display: 'flex' }}
              title="About"
              onClick={() => { setIsCollapsed(false); setTimeout(() => setAboutOpen(true), 310); }}
            >
              <MdInfoOutline />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
