import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import './AdminDashboard.css';

const ROLES = ['student', 'faculty', 'admin'];

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState({ totalUsers:0, totalFaculty:0, totalStudents:0, totalDepartments:0, totalMaterials:0 });
  const [analytics, setAnalytics] = useState({ activeFaculty:[], popularSubjects:[], dailyActiveUsers:0 });
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [savingRole, setSavingRole] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => { applyFilters(); }, [users, searchTerm, roleFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/analytics')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...users];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter) list = list.filter(u => u.role === roleFilter);
    setFilteredUsers(list);
    setCurrentPage(1);
  };

  const handleRoleChange = async (userId, newRole) => {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    setSavingRole(userId);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setSuccess(`Role updated to "${newRole}" successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
      fetchDashboardData();
    } finally {
      setSavingRole(null);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user?')) return;
    try { await api.patch(`/admin/users/${userId}/deactivate`); fetchDashboardData(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to deactivate user'); }
  };

  const handleActivate = async (userId) => {
    try { await api.patch(`/admin/users/${userId}/activate`); fetchDashboardData(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to activate user'); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this user permanently?')) return;
    try { await api.delete(`/admin/users/${userId}`); fetchDashboardData(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to remove user'); }
  };

  const indexOfLast  = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredUsers.length / usersPerPage);

  const statsCards = [
    { title: 'Total Users',     value: stats.totalUsers,       icon: '👥' },
    { title: 'Faculty Members', value: stats.totalFaculty,     icon: '👨‍🏫' },
    { title: 'Students',        value: stats.totalStudents,    icon: '👨‍🎓' },
    { title: 'Departments',     value: stats.totalDepartments, icon: '🏢' },
    { title: 'Study Materials', value: stats.totalMaterials,   icon: '📚' }
  ];

  return (
    <div className="app-container">
      <Sidebar role="admin" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1>Admin Dashboard</h1>
              <p className="page-description">System overview and user management</p>
            </div>
          </div>

          {error   && <div className="alert alert-error"   style={{marginBottom:'1rem'}}>{error}</div>}
          {success && <div className="alert alert-success" style={{marginBottom:'1rem'}}>✅ {success}</div>}

          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-4">
                {statsCards.map((s,i) => (
                  <div key={i} className="stats-card">
                    <div className="stats-icon">{s.icon}</div>
                    <h3>{s.value}</h3>
                    <p>{s.title}</p>
                  </div>
                ))}
              </div>

              {/* Analytics */}
              <div className="grid grid-3 mt-lg">
                <Card title="Most Active Faculty">
                  {analytics.activeFaculty?.length > 0 ? (
                    <ul className="analytics-list">
                      {analytics.activeFaculty.slice(0,5).map((f,i) => (
                        <li key={i} className="analytics-item">
                          <span className="analytics-name">{f.name}</span>
                          <span className="badge badge-primary">{f.materialsCount} materials</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="empty-text">No data available</p>}
                </Card>

                <Card title="Popular Subjects">
                  {analytics.popularSubjects?.length > 0 ? (
                    <ul className="analytics-list">
                      {analytics.popularSubjects.slice(0,5).map((s,i) => (
                        <li key={i} className="analytics-item">
                          <span className="analytics-name">{s.name}</span>
                          <span className="badge badge-success">{s.accessCount} views</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="empty-text">No data available</p>}
                </Card>

                <Card title="User Activity">
                  <div className="activity-metric">
                    <div className="activity-icon">📊</div>
                    <h3>{analytics.dailyActiveUsers || 0}</h3>
                    <p>Active Users Today</p>
                  </div>
                </Card>
              </div>

              {/* Role Management hint */}
              <div className="alert alert-info" style={{margin:'1.5rem 0 0 0'}}>
                💡 <strong>Role Management:</strong> Use the dropdown in the <em>Role</em> column to change any user's role instantly. Changes are saved automatically.
              </div>

              {/* User Management Table */}
              <div className="section-header" style={{marginTop:'1rem'}}>
                <h2>User Management</h2>
                <span className="count-badge">{filteredUsers.length} Users</span>
              </div>

              <Card>
                <div className="table-toolbar">
                  <Input
                    placeholder="Search by name or email…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="form-select role-filter-select"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.length > 0 ? currentUsers.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-sm">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              {u.name}
                            </div>
                          </td>
                          <td style={{color:'var(--text-secondary-light)',fontSize:'0.85rem'}}>{u.email}</td>

                          {/* ── Inline role dropdown ── */}
                          <td>
                            <div className="role-change-cell">
                              <select
                                className={`role-select role-select--${u.role}`}
                                value={u.role}
                                disabled={savingRole === u._id || u._id === currentUser?.id}
                                onChange={e => handleRoleChange(u._id, e.target.value)}
                                title={u._id === currentUser?.id ? "You can't change your own role" : "Change role"}
                              >
                                {ROLES.map(r => (
                                  <option key={r} value={r}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </option>
                                ))}
                              </select>
                              {savingRole === u._id && (
                                <div className="spinner spinner-sm" style={{marginLeft:'6px'}} />
                              )}
                            </div>
                          </td>

                          <td>
                            <span className={`badge badge-${u.active ? 'success' : 'danger'}`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td>
                            <div className="action-buttons">
                              {u.active ? (
                                <Button variant="secondary" size="sm"
                                  onClick={() => handleDeactivate(u._id)}
                                  disabled={u._id === currentUser?.id}>
                                  Deactivate
                                </Button>
                              ) : (
                                <Button variant="success" size="sm"
                                  onClick={() => handleActivate(u._id)}>
                                  Activate
                                </Button>
                              )}
                              <Button variant="danger" size="sm"
                                onClick={() => handleRemove(u._id)}
                                disabled={u._id === currentUser?.id}>
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="text-center">
                            <div className="empty-state" style={{padding:'2rem'}}>
                              <p>No users found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button onClick={() => setCurrentPage(p=>p-1)} disabled={currentPage===1}>Previous</button>
                    {[...Array(totalPages)].map((_,i) => (
                      <button key={i+1} onClick={() => setCurrentPage(i+1)}
                        className={currentPage===i+1 ? 'active' : ''}>{i+1}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p=>p+1)} disabled={currentPage===totalPages}>Next</button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
