/**
 * AdminCoursesView.jsx
 * ====================
 * Public courses created by admin — no access code required.
 * Accessible by students, faculty, and admin via sidebar "Admin Courses".
 * Clicking "Open" navigates to BrowseMaterials with the folder pre-opened.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { MdSchool, MdFolderOpen, MdSearch, MdOpenInNew } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './AdminCoursesView.css';

const CATEGORIES = ['All', 'Timetable', 'Regulation', 'Universal', 'Notice', 'Other'];

const AdminCoursesView = () => {
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const role          = user?.role || 'student';

  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('All');
  const [deptFilter,setDeptFilter]= useState('');
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    fetchCourses();
    return () => clearTimeout(t);
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses/public');
      setCourses(res.data.courses || []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const allDepts = [...new Set(courses.map(c => c.department).filter(Boolean))].sort();

  const filtered = courses.filter(c => {
    const matchSearch   = !search   || c.subjectName.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || c.courseCategory === category;
    const matchDept     = !deptFilter || c.department === deptFilter;
    return matchSearch && matchCategory && matchDept;
  });

  const openInBrowser = (courseId) => {
    navigate('/browse-materials', { state: { openFolderId: courseId } });
  };

  return (
    <div className="app-container">
      <Sidebar role={role} />
      <div className="main-content">
        <Navbar />
        <div className={`ac-page ${pageReady ? 'ac-ready' : ''}`}>

          {/* Hero */}
          <div className="ac-hero">
            <div className="ac-hero-label ac-enter" style={{ animationDelay: '80ms' }}>
              — admin courses
            </div>
            <h1 className="ac-title ac-enter" style={{ animationDelay: '160ms' }}>
              Public <span className="ac-title-accent">Resources.</span>
            </h1>
            <p className="ac-subtitle ac-enter" style={{ animationDelay: '240ms' }}>
              Timetables, regulations, universal courses and notices created by the admin —
              accessible to everyone, no code required.
            </p>
          </div>

          {/* Filters */}
          <div className="ac-filters ac-enter" style={{ animationDelay: '300ms' }}>
            <div className="ac-search-wrap">
              <MdSearch className="ac-search-icon" />
              <input
                className="ac-search"
                placeholder="Search courses…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="ac-cat-pills">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`ac-cat-pill ${category === cat ? 'ac-cat-pill--on' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {allDepts.length > 0 && (
              <select className="ac-dept-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="ac-loading">
              <ImSpinner8 className="ac-spin" />
              <span>Loading courses…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ac-empty">
              <MdSchool className="ac-empty-icon" />
              <h3>No courses yet</h3>
              <p>
                {courses.length === 0
                  ? 'The admin has not published any courses yet.'
                  : 'No courses match your filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="ac-count ac-enter" style={{ animationDelay: '360ms' }}>
                {filtered.length} course{filtered.length !== 1 ? 's' : ''}
              </div>
              <div className="ac-grid">
                {filtered.map((c, i) => (
                  <div
                    key={c._id}
                    className="ac-card ac-enter"
                    style={{ animationDelay: `${400 + i * 50}ms` }}
                  >
                    <div className="ac-card-top">
                      <div className="ac-card-icon"><MdSchool /></div>
                      {c.courseCategory && (
                        <span className="ac-cat-badge">{c.courseCategory}</span>
                      )}
                    </div>
                    <h3 className="ac-card-title">{c.subjectName}</h3>
                    <div className="ac-card-meta">
                      <span>{c.department}</span>
                      <span>·</span>
                      <span>Sem {c.semester}</span>
                      <span>·</span>
                      <span>{c.fileCount} file{c.fileCount !== 1 ? 's' : ''}</span>
                    </div>
                    {c.accessCount > 0 && (
                      <div className="ac-card-views">{c.accessCount} views</div>
                    )}
                    <button
                      className="ac-open-btn"
                      onClick={() => openInBrowser(c._id)}
                    >
                      <MdFolderOpen /> Open Materials
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCoursesView;
