import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  MdBarChart, MdPeople, MdFolder, MdFeedback, MdCampaign,
  MdEdit, MdDelete, MdRefresh
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './AdminDashboard.css';

const ROLES = ['student', 'faculty', 'admin'];

const TABS = [
  { id: 'overview',      label: 'Overview',       icon: <MdBarChart /> },
  { id: 'users',         label: 'Users',           icon: <MdPeople /> },
  { id: 'materials',     label: 'Materials',       icon: <MdFolder /> },
  { id: 'feedback',      label: 'Feedback',        icon: <MdFeedback /> },
  { id: 'announcements', label: 'Announcements',   icon: <MdCampaign /> },
];

const Spin = () => <ImSpinner8 className="ad-spin" />;

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [globalError,   setGlobalError]   = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  const flash = (type, msg) => {
    if (type === 'error')   { setGlobalError(msg);   setTimeout(() => setGlobalError(''),   4000); }
    if (type === 'success') { setGlobalSuccess(msg); setTimeout(() => setGlobalSuccess(''), 3000); }
  };

  /* ── OVERVIEW ─────────────────────────────────────────────────────────── */
  const [stats,           setStats]           = useState(null);
  const [analytics,       setAnalytics]       = useState(null);
  const [timeline,        setTimeline]        = useState('today');
  const [overviewLoading, setOverviewLoading] = useState(false);

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/analytics?timeline=${timeline}`)
      ]);
      setStats(sRes.data);
      setAnalytics(aRes.data);
    } catch { flash('error', 'Failed to load overview data'); }
    finally  { setOverviewLoading(false); }
  };

  /* ── USERS ────────────────────────────────────────────────────────────── */
  const [users,        setUsers]        = useState([]);
  const [userSearch,   setUserSearch]   = useState('');
  const [userRole,     setUserRole]     = useState('');
  const [savingRole,   setSavingRole]   = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage,     setUserPage]     = useState(1);
  const PER_PAGE = 10;

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users?limit=500');
      setUsers(res.data.users || []);
    } catch { flash('error', 'Failed to load users'); }
    finally  { setUsersLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchSearch = !userSearch || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = !userRole   || u.role === userRole;
    return matchSearch && matchRole;
  });

  const totalUserPages = Math.ceil(filteredUsers.length / PER_PAGE);
  const pagedUsers     = filteredUsers.slice((userPage - 1) * PER_PAGE, userPage * PER_PAGE);

  const handleRoleChange = async (userId, newRole) => {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    setSavingRole(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      flash('success', `Role updated to "${newRole}"`);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to update role');
      fetchUsers();
    } finally { setSavingRole(null); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try { await api.patch(`/admin/users/${id}/deactivate`); fetchUsers(); flash('success', 'User deactivated'); }
    catch (err) { flash('error', err.response?.data?.message || 'Failed'); }
  };

  const handleActivate = async (id) => {
    try { await api.patch(`/admin/users/${id}/activate`); fetchUsers(); flash('success', 'User activated'); }
    catch (err) { flash('error', err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm('Permanently remove this user? This cannot be undone.')) return;
    try { await api.delete(`/admin/users/${id}`); fetchUsers(); flash('success', 'User removed'); }
    catch (err) { flash('error', err.response?.data?.message || 'Failed'); }
  };

  /* ── MATERIALS ────────────────────────────────────────────────────────── */
  const [materials,        setMaterials]        = useState([]);
  const [matSearch,        setMatSearch]        = useState('');
  const [matStatus,        setMatStatus]        = useState('all');
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const res = await api.get('/admin/materials');
      setMaterials(res.data.materials || []);
    } catch { flash('error', 'Failed to load materials'); }
    finally  { setMaterialsLoading(false); }
  };

  const filteredMaterials = materials.filter(m => {
    const q = matSearch.toLowerCase();
    const matchSearch = !matSearch || m.subjectName.toLowerCase().includes(q) || m.facultyName.toLowerCase().includes(q);
    const matchStatus = matStatus === 'all' ? true : matStatus === 'active' ? m.active : !m.active;
    return matchSearch && matchStatus;
  });

  const handleToggleMaterial = async (id, current) => {
    try {
      await api.patch(`/admin/materials/${id}/toggle`);
      setMaterials(prev => prev.map(m => m._id === id ? { ...m, active: !m.active } : m));
      flash('success', `Material ${current ? 'disabled' : 'enabled'}`);
    } catch { flash('error', 'Failed to toggle material'); }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Permanently delete this material? All student access will be removed.')) return;
    try {
      await api.delete(`/admin/materials/${id}`);
      setMaterials(prev => prev.filter(m => m._id !== id));
      flash('success', 'Material deleted');
    } catch { flash('error', 'Failed to delete material'); }
  };

  /* ── FEEDBACK ─────────────────────────────────────────────────────────── */
  const [feedbacks,       setFeedbacks]       = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [fbFilter,        setFbFilter]        = useState('all');

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const res = await api.get('/admin/feedback');
      setFeedbacks(res.data.feedbacks || []);
    } catch { flash('error', 'Failed to load feedback'); }
    finally  { setFeedbackLoading(false); }
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    fbFilter === 'all'      ? true :
    fbFilter === 'approved' ? f.approved :
    !f.approved
  );

  const handleToggleFeedback = async (id, approved) => {
    try {
      await api.patch(`/admin/feedback/${id}/toggle`);
      setFeedbacks(prev => prev.map(f => f._id === id ? { ...f, approved: !f.approved } : f));
      flash('success', approved ? 'Feedback hidden from landing page' : 'Feedback approved — now visible on landing page');
    } catch { flash('error', 'Failed to update feedback'); }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback permanently?')) return;
    try {
      await api.delete(`/admin/feedback/${id}`);
      setFeedbacks(prev => prev.filter(f => f._id !== id));
      flash('success', 'Feedback deleted');
    } catch { flash('error', 'Failed to delete feedback'); }
  };

  /* ── ANNOUNCEMENTS ────────────────────────────────────────────────────── */
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading,    setAnnLoading]    = useState(false);
  const [annSaving,     setAnnSaving]     = useState(false);
  const [editingAnn,    setEditingAnn]    = useState(null);
  const [annForm,       setAnnForm]       = useState({ title: '', message: '', audience: 'all' });

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const res = await api.get('/admin/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch { flash('error', 'Failed to load announcements'); }
    finally  { setAnnLoading(false); }
  };

  const handleSaveAnn = async () => {
    if (!annForm.title.trim() || !annForm.message.trim()) { flash('error', 'Title and message are required'); return; }
    setAnnSaving(true);
    try {
      if (editingAnn) {
        const res = await api.patch(`/admin/announcements/${editingAnn}`, annForm);
        setAnnouncements(prev => prev.map(a => a._id === editingAnn ? res.data.announcement : a));
        flash('success', 'Announcement updated');
      } else {
        const res = await api.post('/admin/announcements', annForm);
        setAnnouncements(prev => [res.data.announcement, ...prev]);
        flash('success', 'Announcement posted');
      }
      setEditingAnn(null);
      setAnnForm({ title: '', message: '', audience: 'all' });
    } catch { flash('error', 'Failed to save announcement'); }
    finally  { setAnnSaving(false); }
  };

  const handleEditAnn = (ann) => {
    setEditingAnn(ann._id);
    setAnnForm({ title: ann.title, message: ann.message, audience: ann.audience });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnn = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      flash('success', 'Announcement deleted');
    } catch { flash('error', 'Failed to delete announcement'); }
  };

  /* ── Load data when tab changes ───────────────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'overview')      fetchOverview();
    if (activeTab === 'users')         fetchUsers();
    if (activeTab === 'materials')     fetchMaterials();
    if (activeTab === 'feedback')      fetchFeedback();
    if (activeTab === 'announcements') fetchAnnouncements();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
  }, [timeline]);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="app-container">
      <Sidebar role="admin" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1>Admin Dashboard</h1>
              <p className="page-description">Full platform control</p>
            </div>
          </div>

          {globalError   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{globalError}</div>}
          {globalSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {globalSuccess}</div>}

          {/* Tab bar */}
          <div className="ad-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`ad-tab ${activeTab === t.id ? 'ad-tab--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ════════════ OVERVIEW ════════════ */}
          {activeTab === 'overview' && (
            overviewLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : (
              <>
                {/* Stat cards */}
                {stats && (
                  <div className="ad-stats-grid">
                    {[
                      { label: 'Total Users',       value: stats.totalUsers,       icon: '👥', color: 'blue'   },
                      { label: 'Faculty',            value: stats.totalFaculty,     icon: '👨‍🏫', color: 'purple' },
                      { label: 'Students',           value: stats.totalStudents,    icon: '👨‍🎓', color: 'green'  },
                      { label: 'Departments',        value: stats.totalDepartments, icon: '🏢', color: 'amber'  },
                      { label: 'Total Materials',    value: stats.totalMaterials,   icon: '📚', color: 'blue'   },
                      { label: 'Active Materials',   value: stats.activeMaterials,  icon: '✅', color: 'green'  },
                    ].map((s, i) => (
                      <div key={i} className={`ad-stat-card ad-stat-card--${s.color}`}>
                        <div className="ad-stat-icon">{s.icon}</div>
                        <div className="ad-stat-value">{s.value ?? '—'}</div>
                        <div className="ad-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline filter */}
                <div className="ad-timeline">
                  <span>Active users in:</span>
                  {['today', 'week', 'month'].map(t => (
                    <button
                      key={t}
                      className={`ad-tl-btn ${timeline === t ? 'ad-tl-btn--on' : ''}`}
                      onClick={() => setTimeline(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                  {analytics && (
                    <span className="ad-tl-count">→ <strong>{analytics.activeUsers}</strong> active</span>
                  )}
                  <button className="ad-refresh-btn" onClick={fetchOverview} title="Refresh"><MdRefresh /></button>
                </div>

                {/* Analytics grid */}
                {analytics && (
                  <div className="grid grid-3 mt-lg">
                    <Card title="Most Active Faculty">
                      {analytics.activeFaculty?.length > 0 ? (
                        <ul className="analytics-list">
                          {analytics.activeFaculty.map((f, i) => (
                            <li key={i} className="analytics-item">
                              <div>
                                <span className="analytics-name">{f.name}</span>
                                <span className="ad-sub">{f.email}</span>
                              </div>
                              <span className="badge badge-primary">{f.materialsCount} materials</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>

                    <Card title="Popular Materials">
                      {analytics.popularSubjects?.length > 0 ? (
                        <ul className="analytics-list">
                          {analytics.popularSubjects.map((s, i) => (
                            <li key={i} className="analytics-item">
                              <div>
                                <span className="analytics-name">{s.name}</span>
                                <span className="ad-sub">{s.department}</span>
                              </div>
                              <span className="badge badge-success">{s.accessCount} views</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>

                    <Card title="Most Active Students">
                      {analytics.activeStudents?.length > 0 ? (
                        <ul className="analytics-list">
                          {analytics.activeStudents.map((s, i) => (
                            <li key={i} className="analytics-item">
                              <div>
                                <span className="analytics-name">{s.name}</span>
                                <span className="ad-sub">{s.email}</span>
                              </div>
                              <span className="badge badge-warning">{s.accessCount} accesses</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>
                  </div>
                )}

                {/* Recent activity */}
                {analytics?.recentActivity?.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <Card title="Recent Activity">
                      <ul className="analytics-list">
                        {analytics.recentActivity.map((log, i) => (
                          <li key={i} className="analytics-item">
                            <div>
                              <span className="analytics-name">{log.action.replace(/_/g, ' ')}</span>
                              <span className="ad-sub">{log.userId?.name || 'System'} · {new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                )}
              </>
            )
          )}

          {/* ════════════ USERS ════════════ */}
          {activeTab === 'users' && (
            usersLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : (
              <Card>
                <div className="table-toolbar">
                  <Input
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                  />
                  <select
                    className="form-select role-filter-select"
                    value={userRole}
                    onChange={e => { setUserRole(e.target.value); setUserPage(1); }}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                  </select>
                  <span className="ad-pill">{filteredUsers.length} users</span>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.length > 0 ? pagedUsers.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-sm">{u.name?.charAt(0).toUpperCase()}</div>
                              {u.name}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem' }}>{u.email}</td>
                          <td>
                            <div className="role-change-cell">
                              <select
                                className={`role-select role-select--${u.role}`}
                                value={u.role}
                                disabled={savingRole === u._id || u._id === currentUser?.id}
                                onChange={e => handleRoleChange(u._id, e.target.value)}
                                title={u._id === currentUser?.id ? "Can't change your own role" : 'Change role'}
                              >
                                {ROLES.map(r => (
                                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                              </select>
                              {savingRole === u._id && <Spin />}
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${u.active ? 'success' : 'danger'}`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary-light)' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="action-buttons">
                              {u.active
                                ? <Button variant="secondary" size="sm" onClick={() => handleDeactivate(u._id)} disabled={u._id === currentUser?.id}>Deactivate</Button>
                                : <Button variant="success"   size="sm" onClick={() => handleActivate(u._id)}>Activate</Button>
                              }
                              <Button variant="danger" size="sm" onClick={() => handleRemoveUser(u._id)} disabled={u._id === currentUser?.id}>Remove</Button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" className="text-center"><div className="empty-state" style={{ padding: '2rem' }}><p>No users found</p></div></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalUserPages > 1 && (
                  <div className="pagination">
                    <button onClick={() => setUserPage(p => p - 1)} disabled={userPage === 1}>Previous</button>
                    {[...Array(totalUserPages)].map((_, i) => (
                      <button key={i + 1} onClick={() => setUserPage(i + 1)} className={userPage === i + 1 ? 'active' : ''}>{i + 1}</button>
                    ))}
                    <button onClick={() => setUserPage(p => p + 1)} disabled={userPage === totalUserPages}>Next</button>
                  </div>
                )}
              </Card>
            )
          )}

          {/* ════════════ MATERIALS ════════════ */}
          {activeTab === 'materials' && (
            materialsLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : (
              <Card>
                <div className="table-toolbar">
                  <Input placeholder="Search by subject or faculty…" value={matSearch} onChange={e => setMatSearch(e.target.value)} />
                  <select className="form-select role-filter-select" value={matStatus} onChange={e => setMatStatus(e.target.value)}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <span className="ad-pill">{filteredMaterials.length} materials</span>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Faculty</th>
                        <th>Dept · Sem</th>
                        <th>Code</th>
                        <th>Files</th>
                        <th>Views</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.length > 0 ? filteredMaterials.map(m => (
                        <tr key={m._id}>
                          <td style={{ fontWeight: 500 }}>{m.subjectName}</td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div>{m.facultyName}</div>
                            <div style={{ color: 'var(--text-secondary-light)', fontSize: '0.75rem' }}>{m.facultyEmail}</div>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{m.department} · {m.semester}</td>
                          <td><code className="ad-code">{m.accessCode}</code></td>
                          <td>{m.fileCount}</td>
                          <td>{m.accessCount}</td>
                          <td><span className={`badge badge-${m.active ? 'success' : 'danger'}`}>{m.active ? 'Active' : 'Disabled'}</span></td>
                          <td>
                            <div className="action-buttons">
                              <Button variant="secondary" size="sm" onClick={() => handleToggleMaterial(m._id, m.active)}>
                                {m.active ? 'Disable' : 'Enable'}
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteMaterial(m._id)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="8" className="text-center"><div className="empty-state" style={{ padding: '2rem' }}><p>No materials found</p></div></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          )}

          {/* ════════════ FEEDBACK ════════════ */}
          {activeTab === 'feedback' && (
            feedbackLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : (
              <>
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  💡 <strong>Approved</strong> feedback appears on the landing page Postcards section. Toggle to show or hide each one.
                </div>

                <div className="table-toolbar" style={{ marginBottom: '1rem' }}>
                  <select className="form-select role-filter-select" value={fbFilter} onChange={e => setFbFilter(e.target.value)}>
                    <option value="all">All feedback</option>
                    <option value="approved">Approved only</option>
                    <option value="hidden">Hidden only</option>
                  </select>
                  <span className="ad-pill">{filteredFeedbacks.length} entries</span>
                </div>

                <div className="ad-feedback-grid">
                  {filteredFeedbacks.length > 0 ? filteredFeedbacks.map(f => (
                    <div key={f._id} className={`ad-feedback-card ${f.approved ? 'ad-feedback-card--approved' : 'ad-feedback-card--hidden'}`}>
                      <p className="ad-feedback-msg">"{f.message}"</p>
                      <div className="ad-feedback-meta">
                        <span className="ad-feedback-name">{f.name}</span>
                        <span className={`badge badge-${f.role === 'faculty' ? 'primary' : 'success'}`}>{f.role}</span>
                        <span className={`badge badge-${f.approved ? 'success' : 'danger'}`}>
                          {f.approved ? '✓ Approved' : '✗ Hidden'}
                        </span>
                      </div>
                      <div className="ad-feedback-date">{new Date(f.createdAt).toLocaleDateString()}</div>
                      <div className="action-buttons" style={{ marginTop: '0.75rem' }}>
                        <Button
                          variant={f.approved ? 'secondary' : 'success'}
                          size="sm"
                          onClick={() => handleToggleFeedback(f._id, f.approved)}
                        >
                          {f.approved ? 'Hide' : 'Approve'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteFeedback(f._id)}>Delete</Button>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state" style={{ padding: '3rem', gridColumn: '1/-1', textAlign: 'center' }}>
                      <p>No feedback yet</p>
                    </div>
                  )}
                </div>
              </>
            )
          )}

          {/* ════════════ ANNOUNCEMENTS ════════════ */}
          {activeTab === 'announcements' && (
            <div className="ad-ann-layout">

              {/* Form panel */}
              <Card title={editingAnn ? '✏️ Edit Announcement' : '📢 New Announcement'}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <Input
                    placeholder="e.g. Exam schedule update"
                    value={annForm.title}
                    onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    placeholder="Write your announcement…"
                    value={annForm.message}
                    onChange={e => setAnnForm(p => ({ ...p, message: e.target.value }))}
                    style={{ resize: 'vertical' }}
                    maxLength={1000}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)', textAlign: 'right', marginTop: '4px' }}>
                    {annForm.message.length}/1000
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Audience</label>
                  <select
                    className="form-select"
                    value={annForm.audience}
                    onChange={e => setAnnForm(p => ({ ...p, audience: e.target.value }))}
                  >
                    <option value="all">Everyone (students + faculty)</option>
                    <option value="student">Students only</option>
                    <option value="faculty">Faculty only</option>
                  </select>
                </div>
                <div className="action-buttons">
                  <Button variant="primary" onClick={handleSaveAnn} disabled={annSaving}>
                    {annSaving ? <><Spin /> Saving…</> : editingAnn ? 'Update' : 'Post Announcement'}
                  </Button>
                  {editingAnn && (
                    <Button variant="secondary" onClick={() => { setEditingAnn(null); setAnnForm({ title: '', message: '', audience: 'all' }); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>

              {/* List panel */}
              <div>
                {annLoading ? (
                  <div className="loading-container"><div className="spinner" /></div>
                ) : announcements.length > 0 ? announcements.map(a => (
                  <div key={a._id} className="ad-ann-card">
                    <div className="ad-ann-header">
                      <span className="ad-ann-title">{a.title}</span>
                      <span className={`badge badge-${a.audience === 'all' ? 'primary' : a.audience === 'student' ? 'success' : 'warning'}`}>
                        {a.audience === 'all' ? 'Everyone' : a.audience}
                      </span>
                    </div>
                    <p className="ad-ann-msg">{a.message}</p>
                    <div className="ad-ann-footer">
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      <div className="action-buttons">
                        <Button variant="secondary" size="sm" onClick={() => handleEditAnn(a)}><MdEdit /> Edit</Button>
                        <Button variant="danger"    size="sm" onClick={() => handleDeleteAnn(a._id)}><MdDelete /> Delete</Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p>No announcements yet. Create one.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
