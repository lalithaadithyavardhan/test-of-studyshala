import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  MdBarChart, MdPeople, MdFolder, MdFeedback, MdCampaign,
  MdSchool, MdSettings, MdEdit, MdDelete, MdRefresh,
  MdOpenInNew, MdDownload, MdPerson, MdClose, MdAdd
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import './AdminDashboard.css';

const ROLES   = ['student', 'faculty', 'admin'];
const TABS    = [
  { id: 'overview',      label: 'Overview',       icon: <MdBarChart /> },
  { id: 'users',         label: 'Users',           icon: <MdPeople /> },
  { id: 'materials',     label: 'Materials',       icon: <MdFolder /> },
  { id: 'courses',       label: 'Admin Courses',   icon: <MdSchool /> },
  { id: 'feedback',      label: 'Feedback',        icon: <MdFeedback /> },
  { id: 'announcements', label: 'Announcements',   icon: <MdCampaign /> },
  { id: 'settings',      label: 'Settings',        icon: <MdSettings /> },
];
const DEPTS   = ['CSE','ECE','EEE','MECH','CIVIL','IT','MBA','MCA'];
const SEMS    = ['1','2','3','4','5','6','7','8'];
const CATS    = ['Timetable','Regulation','Universal','Notice','Other'];
const Spin    = () => <ImSpinner8 className="ad-spin" />;

/* ── User Profile Modal ─────────────────────────────────────────────────────*/
const UserProfileModal = ({ userId, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/users/${userId}/profile`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="ad-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ad-modal">
        <div className="ad-modal-header">
          <span className="ad-modal-title">User Profile</span>
          <button className="ad-modal-close" onClick={onClose}><MdClose /></button>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><Spin /></div>
        ) : !data ? (
          <p style={{ padding: '1rem' }}>Failed to load profile.</p>
        ) : (
          <div className="ad-profile-body">
            <div className="ad-profile-row">
              <div className="ad-profile-avatar">{data.user.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="ad-profile-name">{data.user.name}</div>
                <div className="ad-profile-email">{data.user.email}</div>
                <span className={`badge badge-${data.user.role === 'faculty' ? 'primary' : 'success'}`}>{data.user.role}</span>
              </div>
            </div>
            <div className="ad-profile-grid">
              <div className="ad-profile-item"><span>Status</span><strong>{data.user.active ? '✅ Active' : '❌ Inactive'}</strong></div>
              <div className="ad-profile-item"><span>Joined</span><strong>{new Date(data.user.createdAt).toLocaleDateString()}</strong></div>
              <div className="ad-profile-item"><span>Last Login</span><strong>{data.user.lastLogin ? new Date(data.user.lastLogin).toLocaleDateString() : 'Never'}</strong></div>
              {data.user.role === 'student' && <>
                <div className="ad-profile-item"><span>Saved Materials</span><strong>{data.user.savedMaterials?.length || 0}</strong></div>
                <div className="ad-profile-item"><span>Access History</span><strong>{data.user.accessHistory?.length || 0}</strong></div>
              </>}
            </div>
            {data.uploadedMaterials?.length > 0 && (
              <>
                <div className="ad-profile-section-title">Uploaded Materials ({data.uploadedMaterials.length})</div>
                <ul className="analytics-list">
                  {data.uploadedMaterials.map(m => (
                    <li key={m._id} className="analytics-item">
                      <div>
                        <span className="analytics-name">{m.subjectName}</span>
                        <span className="ad-sub">{m.department} · Sem {m.semester} · {m.fileCount} files</span>
                      </div>
                      <span className={`badge badge-${m.active ? 'success' : 'danger'}`}>{m.active ? 'Active' : 'Disabled'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab,      setActiveTab]      = useState('overview');
  const [globalError,    setGlobalError]    = useState('');
  const [globalSuccess,  setGlobalSuccess]  = useState('');
  const [profileUserId,  setProfileUserId]  = useState(null);

  const flash = (type, msg) => {
    if (type === 'error')   { setGlobalError(msg);   setTimeout(() => setGlobalError(''),   4000); }
    if (type === 'success') { setGlobalSuccess(msg); setTimeout(() => setGlobalSuccess(''), 3000); }
  };

  /* ── OVERVIEW ─────────────────────────────────────────────────────────── */
  const [stats,           setStats]           = useState(null);
  const [analytics,       setAnalytics]       = useState(null);
  const [timeline,        setTimeline]        = useState('today');
  const [customFrom,      setCustomFrom]      = useState('');
  const [customTo,        setCustomTo]        = useState('');
  const [deptFilter,      setDeptFilter]      = useState('');
  const [semFilter,       setSemFilter]       = useState('');
  const [overviewLoading, setOverviewLoading] = useState(false);

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const params = new URLSearchParams({ timeline });
      if (deptFilter)              params.set('department', deptFilter);
      if (semFilter)               params.set('semester',   semFilter);
      if (customFrom && customTo)  { params.set('from', customFrom); params.set('to', customTo); }
      const [sRes, aRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/analytics?${params}`)
      ]);
      setStats(sRes.data);
      setAnalytics(aRes.data);
    } catch { flash('error', 'Failed to load overview'); }
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
    try { const r = await api.get('/admin/users?limit=500'); setUsers(r.data.users || []); }
    catch { flash('error', 'Failed to load users'); }
    finally { setUsersLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return (!userSearch || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (!userRole   || u.role === userRole);
  });
  const totalUserPages = Math.ceil(filteredUsers.length / PER_PAGE);
  const pagedUsers     = filteredUsers.slice((userPage-1)*PER_PAGE, userPage*PER_PAGE);

  const handleRoleChange = async (id, newRole) => {
    setUsers(p => p.map(u => u._id===id ? {...u,role:newRole} : u));
    setSavingRole(id);
    try { await api.patch(`/admin/users/${id}/role`, { role: newRole }); flash('success', `Role updated to "${newRole}"`); }
    catch (e) { flash('error', e.response?.data?.message||'Failed'); fetchUsers(); }
    finally { setSavingRole(null); }
  };
  const handleDeactivate  = async id => { if (!window.confirm('Deactivate this user?')) return; try { await api.patch(`/admin/users/${id}/deactivate`); fetchUsers(); flash('success','Deactivated'); } catch(e){flash('error',e.response?.data?.message||'Failed');} };
  const handleActivate    = async id => { try { await api.patch(`/admin/users/${id}/activate`); fetchUsers(); flash('success','Activated'); } catch(e){flash('error',e.response?.data?.message||'Failed');} };
  const handleRemoveUser  = async id => { if (!window.confirm('Permanently remove this user?')) return; try { await api.delete(`/admin/users/${id}`); fetchUsers(); flash('success','User removed'); } catch(e){flash('error',e.response?.data?.message||'Failed');} };
  const handleResetUser   = async id => { if (!window.confirm('Reset this user? All their data will be cleared.')) return; try { const r=await api.patch(`/admin/users/${id}/reset`); flash('success',r.data.message); fetchUsers(); } catch(e){flash('error',e.response?.data?.message||'Failed');} };

  /* ── MATERIALS ────────────────────────────────────────────────────────── */
  const [materials,        setMaterials]        = useState([]);
  const [matDepts,         setMatDepts]         = useState([]);
  const [matSems,          setMatSems]          = useState([]);
  const [matSearch,        setMatSearch]        = useState('');
  const [matStatus,        setMatStatus]        = useState('all');
  const [matDept,          setMatDept]          = useState('');
  const [matSem,           setMatSem]           = useState('');
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const r = await api.get('/admin/materials');
      setMaterials(r.data.materials || []);
      setMatDepts(r.data.departments || []);
      setMatSems(r.data.semesters   || []);
    } catch { flash('error','Failed to load materials'); }
    finally { setMaterialsLoading(false); }
  };

  const filteredMaterials = materials.filter(m => {
    const q = matSearch.toLowerCase();
    return (!matSearch || m.subjectName.toLowerCase().includes(q) || m.facultyName.toLowerCase().includes(q))
        && (matStatus==='all' || (matStatus==='active'?m.active:!m.active))
        && (!matDept  || m.department===matDept)
        && (!matSem   || m.semester===matSem);
  });

  const handleToggleMaterial  = async (id, cur) => { try { await api.patch(`/admin/materials/${id}/toggle`); setMaterials(p=>p.map(m=>m._id===id?{...m,active:!m.active}:m)); flash('success',`Material ${cur?'disabled':'enabled'}`); } catch{flash('error','Failed');} };
  const handleDeleteMaterial  = async id => { if (!window.confirm('Permanently delete this material?')) return; try { await api.delete(`/admin/materials/${id}`); setMaterials(p=>p.filter(m=>m._id!==id)); flash('success','Deleted'); } catch{flash('error','Failed');} };
  const handleOpenMaterial    = id => navigate('/browse-materials', { state: { openFolderId: id } });

  /* ── ADMIN COURSES ────────────────────────────────────────────────────── */
  const [courses,       setCourses]       = useState([]);
  const [coursesLoading,setCoursesLoading]= useState(false);
  const [courseForm,    setCourseForm]    = useState({ subjectName:'', department:'', semester:'', courseCategory:'' });
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseSaving,  setCourseSaving]  = useState(false);

  const fetchCourses = async () => {
    setCoursesLoading(true);
    try { const r = await api.get('/admin/courses'); setCourses(r.data.courses||[]); }
    catch { flash('error','Failed to load courses'); }
    finally { setCoursesLoading(false); }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.subjectName.trim()||!courseForm.department.trim()||!courseForm.semester.trim()) { flash('error','Subject, department and semester required'); return; }
    setCourseSaving(true);
    try {
      if (editingCourse) {
        const r = await api.patch(`/admin/courses/${editingCourse}`, courseForm);
        setCourses(p=>p.map(c=>c._id===editingCourse?{...c,...r.data.course}:c));
        flash('success','Course updated');
      } else {
        const r = await api.post('/admin/courses', courseForm);
        setCourses(p=>[r.data.course,...p]);
        flash('success','Course created');
      }
      setEditingCourse(null);
      setCourseForm({ subjectName:'', department:'', semester:'', courseCategory:'' });
    } catch { flash('error','Failed to save course'); }
    finally { setCourseSaving(false); }
  };
  const handleEditCourse   = c => { setEditingCourse(c._id); setCourseForm({ subjectName:c.subjectName, department:c.department, semester:c.semester, courseCategory:c.courseCategory||'' }); };
  const handleDeleteCourse = async id => { if (!window.confirm('Delete this course?')) return; try { await api.delete(`/admin/courses/${id}`); setCourses(p=>p.filter(c=>c._id!==id)); flash('success','Deleted'); } catch{flash('error','Failed');} };
  const handleOpenCourse   = id => navigate('/browse-materials', { state: { openFolderId: id } });

  /* ── FEEDBACK ─────────────────────────────────────────────────────────── */
  const [feedbacks,       setFeedbacks]       = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [fbFilter,        setFbFilter]        = useState('all');

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try { const r = await api.get('/admin/feedback'); setFeedbacks(r.data.feedbacks||[]); }
    catch { flash('error','Failed to load feedback'); }
    finally { setFeedbackLoading(false); }
  };
  const filteredFeedbacks = feedbacks.filter(f => fbFilter==='all' ? true : fbFilter==='approved' ? f.approved : !f.approved);
  const handleToggleFeedback = async (id, approved) => { try { await api.patch(`/admin/feedback/${id}/toggle`); setFeedbacks(p=>p.map(f=>f._id===id?{...f,approved:!f.approved}:f)); flash('success', approved?'Hidden':'Approved'); } catch{flash('error','Failed');} };
  const handleDeleteFeedback = async id => { if (!window.confirm('Delete feedback?')) return; try { await api.delete(`/admin/feedback/${id}`); setFeedbacks(p=>p.filter(f=>f._id!==id)); flash('success','Deleted'); } catch{flash('error','Failed');} };

  /* ── ANNOUNCEMENTS ────────────────────────────────────────────────────── */
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading,    setAnnLoading]    = useState(false);
  const [annSaving,     setAnnSaving]     = useState(false);
  const [editingAnn,    setEditingAnn]    = useState(null);
  const [annForm,       setAnnForm]       = useState({ title:'', message:'', audience:'all' });

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try { const r = await api.get('/admin/announcements'); setAnnouncements(r.data.announcements||[]); }
    catch { flash('error','Failed to load announcements'); }
    finally { setAnnLoading(false); }
  };
  const handleSaveAnn = async () => {
    if (!annForm.title.trim()||!annForm.message.trim()) { flash('error','Title and message required'); return; }
    setAnnSaving(true);
    try {
      if (editingAnn) { const r = await api.patch(`/admin/announcements/${editingAnn}`,annForm); setAnnouncements(p=>p.map(a=>a._id===editingAnn?r.data.announcement:a)); flash('success','Updated'); }
      else            { const r = await api.post('/admin/announcements',annForm); setAnnouncements(p=>[r.data.announcement,...p]); flash('success','Posted'); }
      setEditingAnn(null); setAnnForm({ title:'', message:'', audience:'all' });
    } catch { flash('error','Failed'); }
    finally { setAnnSaving(false); }
  };
  const handleEditAnn   = a => { setEditingAnn(a._id); setAnnForm({ title:a.title, message:a.message, audience:a.audience }); };
  const handleDeleteAnn = async id => { if (!window.confirm('Delete announcement?')) return; try { await api.delete(`/admin/announcements/${id}`); setAnnouncements(p=>p.filter(a=>a._id!==id)); flash('success','Deleted'); } catch{flash('error','Failed');} };

  /* ── SETTINGS ─────────────────────────────────────────────────────────── */
  const [settings,        setSettings]        = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving,  setSettingsSaving]  = useState(false);
  const [settingsForm,    setSettingsForm]     = useState({ maxUploadSizeMB:50, allowedFileTypes:[], features:{} });
  const ALL_FILE_TYPES = ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','jpg','jpeg','png','gif','webp','zip','rar','7z','mp4','mp3'];

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try { const r = await api.get('/admin/settings'); setSettings(r.data.settings); setSettingsForm({ maxUploadSizeMB: r.data.settings.maxUploadSizeMB, allowedFileTypes: r.data.settings.allowedFileTypes, features: r.data.settings.features }); }
    catch { flash('error','Failed to load settings'); }
    finally { setSettingsLoading(false); }
  };
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try { await api.patch('/admin/settings', settingsForm); flash('success','Settings saved'); fetchSettings(); }
    catch { flash('error','Failed to save settings'); }
    finally { setSettingsSaving(false); }
  };
  const toggleFileType = (ext) => {
    setSettingsForm(p => ({
      ...p,
      allowedFileTypes: p.allowedFileTypes.includes(ext)
        ? p.allowedFileTypes.filter(t=>t!==ext)
        : [...p.allowedFileTypes, ext]
    }));
  };
  const toggleFeature = (key) => {
    setSettingsForm(p => ({ ...p, features: { ...p.features, [key]: !p.features[key] } }));
  };

  /* ── Load on tab change ───────────────────────────────────────────────── */
  useEffect(() => {
    if (activeTab==='overview')      fetchOverview();
    if (activeTab==='users')         fetchUsers();
    if (activeTab==='materials')     fetchMaterials();
    if (activeTab==='courses')       fetchCourses();
    if (activeTab==='feedback')      fetchFeedback();
    if (activeTab==='announcements') fetchAnnouncements();
    if (activeTab==='settings')      fetchSettings();
  }, [activeTab]);

  useEffect(() => { if (activeTab==='overview') fetchOverview(); }, [timeline, deptFilter, semFilter, customFrom, customTo]);

  const downloadReport = (type) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const baseURL = api.defaults.baseURL || '';
    const url = `${baseURL}/admin/reports/download?type=${type}`;
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="app-container">
      <Sidebar role="admin" />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <div className="page-header">
            <div><h1>Admin Dashboard</h1><p className="page-description">Full platform control</p></div>
          </div>

          {globalError   && <div className="alert alert-error"   style={{marginBottom:'1rem'}}>{globalError}</div>}
          {globalSuccess && <div className="alert alert-success" style={{marginBottom:'1rem'}}>✅ {globalSuccess}</div>}

          {/* Tabs */}
          <div className="ad-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`ad-tab ${activeTab===t.id?'ad-tab--active':''}`} onClick={()=>setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ════ OVERVIEW ════ */}
          {activeTab==='overview' && (
            overviewLoading ? <div className="loading-container"><div className="spinner"/></div> : <>
              {stats && (
                <div className="ad-stats-grid">
                  {[
                    {label:'Total Users',     value:stats.totalUsers,       icon:'👥', color:'blue'},
                    {label:'Faculty',         value:stats.totalFaculty,     icon:'👨‍🏫', color:'purple'},
                    {label:'Students',        value:stats.totalStudents,    icon:'👨‍🎓', color:'green'},
                    {label:'Departments',     value:stats.totalDepartments, icon:'🏢', color:'amber'},
                    {label:'Materials',       value:stats.totalMaterials,   icon:'📚', color:'blue'},
                    {label:'Admin Courses',   value:stats.adminCourses,     icon:'🎓', color:'green'},
                  ].map((s,i)=>(
                    <div key={i} className={`ad-stat-card ad-stat-card--${s.color}`}>
                      <div className="ad-stat-icon">{s.icon}</div>
                      <div className="ad-stat-value">{s.value??'—'}</div>
                      <div className="ad-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Date range + filters */}
              <div className="ad-timeline">
                <span>Active users:</span>
                {['today','week','month','3month','6month','year','all'].map(t=>(
                  <button key={t} className={`ad-tl-btn ${timeline===t&&!customFrom?'ad-tl-btn--on':''}`}
                    onClick={()=>{setTimeline(t);setCustomFrom('');setCustomTo('');}}>
                    {t==='3month'?'3M':t==='6month'?'6M':t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
                <span style={{color:'var(--text-secondary-light)',fontSize:'0.8rem'}}>or custom:</span>
                <input type="date" className="ad-date-input" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
                <span style={{fontSize:'0.8rem'}}>to</span>
                <input type="date" className="ad-date-input" value={customTo}   onChange={e=>setCustomTo(e.target.value)} />
                {analytics && <span className="ad-tl-count">→ <strong>{analytics.activeUsers}</strong> active</span>}
                <button className="ad-refresh-btn" onClick={fetchOverview}><MdRefresh/></button>
              </div>

              {/* Dept + Sem filter */}
              <div className="ad-timeline" style={{marginTop:'0.5rem'}}>
                <span>Filter by:</span>
                <select className="ad-small-select" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  {analytics?.allDepts?.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select className="ad-small-select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
                  <option value="">All Semesters</option>
                  {analytics?.allSems?.map(s=><option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>

              {analytics && (
                <>
                  <div className="grid grid-3 mt-lg">
                    <Card title="Most Active Faculty">
                      {analytics.activeFaculty?.length>0 ? (
                        <ul className="analytics-list">
                          {analytics.activeFaculty.map((f,i)=>(
                            <li key={i} className="analytics-item">
                              <div><span className="analytics-name">{f.name}</span><span className="ad-sub">{f.email}</span></div>
                              <span className="badge badge-primary">{f.materialsCount} materials</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>
                    <Card title="Popular Materials">
                      {analytics.popularSubjects?.length>0 ? (
                        <ul className="analytics-list">
                          {analytics.popularSubjects.map((s,i)=>(
                            <li key={i} className="analytics-item">
                              <div><span className="analytics-name">{s.name}</span><span className="ad-sub">{s.department} · Sem {s.semester}</span></div>
                              <span className="badge badge-success">{s.accessCount} views</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>
                    <Card title="Most Active Students">
                      {analytics.activeStudents?.length>0 ? (
                        <ul className="analytics-list">
                          {analytics.activeStudents.map((s,i)=>(
                            <li key={i} className="analytics-item">
                              <div><span className="analytics-name">{s.name}</span><span className="ad-sub">{s.email}</span></div>
                              <span className="badge badge-warning">{s.accessCount} accesses</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data yet</p>}
                    </Card>
                  </div>

                  {/* Dept + Sem stats */}
                  <div className="grid grid-3 mt-lg" style={{marginTop:'1rem'}}>
                    <Card title="Department Stats">
                      {analytics.departmentStats?.length>0 ? (
                        <ul className="analytics-list">
                          {analytics.departmentStats.map((d,i)=>(
                            <li key={i} className="analytics-item">
                              <span className="analytics-name">{d.department}</span>
                              <span className="badge badge-primary">{d.materialCount} materials · {d.totalAccess} views</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data</p>}
                    </Card>
                    <Card title="Semester Stats">
                      {analytics.semesterStats?.length>0 ? (
                        <ul className="analytics-list">
                          {analytics.semesterStats.map((s,i)=>(
                            <li key={i} className="analytics-item">
                              <span className="analytics-name">Semester {s.semester}</span>
                              <span className="badge badge-success">{s.materialCount} materials</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="empty-text">No data</p>}
                    </Card>
                    <Card title="Download Reports">
                      <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',padding:'0.5rem 0'}}>
                        {[{type:'users',label:'👥 Users Report'},
                          {type:'materials',label:'📚 Materials Report'},
                          {type:'feedback',label:'💬 Feedback Report'}].map(r=>(
                          <button key={r.type} className="ad-report-btn" onClick={()=>downloadReport(r.type)}>
                            <MdDownload/> {r.label}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {analytics.recentActivity?.length>0 && (
                    <div style={{marginTop:'1rem'}}>
                      <Card title="Recent Activity">
                        <ul className="analytics-list">
                          {analytics.recentActivity.map((log,i)=>(
                            <li key={i} className="analytics-item">
                              <div>
                                <span className="analytics-name">{log.action.replace(/_/g,' ')}</span>
                                <span className="ad-sub">{log.userId?.name||'System'} · {new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ════ USERS ════ */}
          {activeTab==='users' && (
            usersLoading ? <div className="loading-container"><div className="spinner"/></div> :
            <Card>
              <div className="table-toolbar">
                <Input placeholder="Search by name or email…" value={userSearch} onChange={e=>{setUserSearch(e.target.value);setUserPage(1);}} />
                <select className="form-select role-filter-select" value={userRole} onChange={e=>{setUserRole(e.target.value);setUserPage(1);}}>
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="faculty">Faculty</option>
                  <option value="student">Student</option>
                </select>
                <span className="ad-pill">{filteredUsers.length} users</span>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pagedUsers.length>0 ? pagedUsers.map(u=>(
                      <tr key={u._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">{u.name?.charAt(0).toUpperCase()}</div>
                            <button className="ad-name-link" onClick={()=>setProfileUserId(u._id)}>{u.name}</button>
                          </div>
                        </td>
                        <td style={{color:'var(--text-secondary-light)',fontSize:'0.85rem'}}>{u.email}</td>
                        <td>
                          <div className="role-change-cell">
                            <select className={`role-select role-select--${u.role}`} value={u.role}
                              disabled={savingRole===u._id||u._id===currentUser?.id}
                              onChange={e=>handleRoleChange(u._id,e.target.value)}>
                              {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                            </select>
                            {savingRole===u._id && <Spin/>}
                          </div>
                        </td>
                        <td><span className={`badge badge-${u.active?'success':'danger'}`}>{u.active?'Active':'Inactive'}</span></td>
                        <td style={{fontSize:'0.8rem',color:'var(--text-secondary-light)'}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="ad-icon-btn" onClick={()=>setProfileUserId(u._id)} title="View profile"><MdPerson/></button>
                            {u.active
                              ? <Button variant="secondary" size="sm" onClick={()=>handleDeactivate(u._id)} disabled={u._id===currentUser?.id}>Deactivate</Button>
                              : <Button variant="success"   size="sm" onClick={()=>handleActivate(u._id)}>Activate</Button>
                            }
                            <Button variant="secondary" size="sm" onClick={()=>handleResetUser(u._id)} disabled={u._id===currentUser?.id}>Reset</Button>
                            <Button variant="danger"    size="sm" onClick={()=>handleRemoveUser(u._id)} disabled={u._id===currentUser?.id}>Remove</Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" className="text-center"><div className="empty-state" style={{padding:'2rem'}}><p>No users found</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalUserPages>1 && (
                <div className="pagination">
                  <button onClick={()=>setUserPage(p=>p-1)} disabled={userPage===1}>Previous</button>
                  {[...Array(totalUserPages)].map((_,i)=>(
                    <button key={i+1} onClick={()=>setUserPage(i+1)} className={userPage===i+1?'active':''}>{i+1}</button>
                  ))}
                  <button onClick={()=>setUserPage(p=>p+1)} disabled={userPage===totalUserPages}>Next</button>
                </div>
              )}
            </Card>
          )}

          {/* ════ MATERIALS ════ */}
          {activeTab==='materials' && (
            materialsLoading ? <div className="loading-container"><div className="spinner"/></div> :
            <Card>
              <div className="table-toolbar">
                <Input placeholder="Search subject or faculty…" value={matSearch} onChange={e=>setMatSearch(e.target.value)} />
                <select className="form-select role-filter-select" value={matStatus} onChange={e=>setMatStatus(e.target.value)}>
                  <option value="all">All</option><option value="active">Active</option><option value="disabled">Disabled</option>
                </select>
                <select className="form-select role-filter-select" value={matDept} onChange={e=>setMatDept(e.target.value)}>
                  <option value="">All Depts</option>
                  {matDepts.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select className="form-select role-filter-select" value={matSem} onChange={e=>setMatSem(e.target.value)}>
                  <option value="">All Sems</option>
                  {matSems.map(s=><option key={s} value={s}>Sem {s}</option>)}
                </select>
                <span className="ad-pill">{filteredMaterials.length} materials</span>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Subject</th><th>Faculty</th><th>Dept · Sem</th><th>Code</th><th>Files</th><th>Views</th><th>Downloads</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredMaterials.length>0 ? filteredMaterials.map(m=>(
                      <tr key={m._id}>
                        <td style={{fontWeight:500}}>{m.subjectName}</td>
                        <td style={{fontSize:'0.85rem'}}>
                          <div>{m.facultyName}</div>
                          <div style={{color:'var(--text-secondary-light)',fontSize:'0.75rem'}}>{m.facultyEmail}</div>
                        </td>
                        <td style={{fontSize:'0.82rem'}}>{m.department} · {m.semester}</td>
                        <td><code className="ad-code">{m.accessCode}</code></td>
                        <td>{m.fileCount}</td>
                        <td>{m.accessCount}</td>
                        <td>{m.totalDownloads}</td>
                        <td><span className={`badge badge-${m.active?'success':'danger'}`}>{m.active?'Active':'Disabled'}</span></td>
                        <td>
                          <div className="action-buttons">
                            <button className="ad-icon-btn" onClick={()=>handleOpenMaterial(m._id)} title="Open in browser"><MdOpenInNew/></button>
                            <Button variant="secondary" size="sm" onClick={()=>handleToggleMaterial(m._id,m.active)}>{m.active?'Disable':'Enable'}</Button>
                            <Button variant="danger"    size="sm" onClick={()=>handleDeleteMaterial(m._id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="text-center"><div className="empty-state" style={{padding:'2rem'}}><p>No materials found</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ════ ADMIN COURSES ════ */}
          {activeTab==='courses' && (
            <div className="ad-ann-layout">
              <Card title={editingCourse ? '✏️ Edit Course' : '🎓 New Public Course'}>
                <p style={{fontSize:'0.82rem',color:'var(--text-secondary-light)',marginTop:0}}>
                  Public courses are visible to all students and faculty — no access code needed.
                </p>
                <div className="form-group">
                  <label className="form-label">Subject / Course Name</label>
                  <Input placeholder="e.g. Timetable 2024-25" value={courseForm.subjectName} onChange={e=>setCourseForm(p=>({...p,subjectName:e.target.value}))} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={courseForm.department} onChange={e=>setCourseForm(p=>({...p,department:e.target.value}))}>
                      <option value="">Select</option>
                      {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                      <option value="ALL">ALL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select className="form-select" value={courseForm.semester} onChange={e=>setCourseForm(p=>({...p,semester:e.target.value}))}>
                      <option value="">Select</option>
                      {SEMS.map(s=><option key={s} value={s}>Sem {s}</option>)}
                      <option value="ALL">ALL</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={courseForm.courseCategory} onChange={e=>setCourseForm(p=>({...p,courseCategory:e.target.value}))}>
                    <option value="">Select category</option>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="action-buttons">
                  <Button variant="primary" onClick={handleSaveCourse} disabled={courseSaving}>
                    {courseSaving ? <><Spin/> Saving…</> : editingCourse ? 'Update Course' : '+ Create Course'}
                  </Button>
                  {editingCourse && (
                    <Button variant="secondary" onClick={()=>{setEditingCourse(null);setCourseForm({subjectName:'',department:'',semester:'',courseCategory:''});}}>Cancel</Button>
                  )}
                </div>
              </Card>

              <div>
                {coursesLoading ? <div className="loading-container"><div className="spinner"/></div>
                : courses.length>0 ? courses.map(c=>(
                  <div key={c._id} className="ad-ann-card">
                    <div className="ad-ann-header">
                      <span className="ad-ann-title">{c.subjectName}</span>
                      {c.courseCategory && <span className="badge badge-primary">{c.courseCategory}</span>}
                      <span className={`badge badge-${c.active?'success':'danger'}`}>{c.active?'Active':'Hidden'}</span>
                    </div>
                    <p style={{fontSize:'0.82rem',color:'var(--text-secondary-light)',margin:'0.25rem 0'}}>
                      {c.department} · Sem {c.semester} · {c.fileCount} files · {c.accessCount} views
                    </p>
                    <div className="ad-ann-footer">
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      <div className="action-buttons">
                        <button className="ad-icon-btn" onClick={()=>handleOpenCourse(c._id)} title="Browse files"><MdOpenInNew/></button>
                        <Button variant="secondary" size="sm" onClick={()=>handleEditCourse(c)}><MdEdit/> Edit</Button>
                        <Button variant="danger"    size="sm" onClick={()=>handleDeleteCourse(c._id)}><MdDelete/> Delete</Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state" style={{padding:'3rem',textAlign:'center'}}><p>No admin courses yet. Create one above.</p></div>
                )}
              </div>
            </div>
          )}

          {/* ════ FEEDBACK ════ */}
          {activeTab==='feedback' && (
            feedbackLoading ? <div className="loading-container"><div className="spinner"/></div> : <>
              <div className="alert alert-info" style={{marginBottom:'1rem'}}>
                💡 <strong>Approved</strong> feedback shows on the landing page Postcards section.
              </div>
              <div className="table-toolbar" style={{marginBottom:'1rem'}}>
                <select className="form-select role-filter-select" value={fbFilter} onChange={e=>setFbFilter(e.target.value)}>
                  <option value="all">All</option><option value="approved">Approved</option><option value="hidden">Hidden</option>
                </select>
                <span className="ad-pill">{filteredFeedbacks.length} entries</span>
              </div>
              <div className="ad-feedback-grid">
                {filteredFeedbacks.length>0 ? filteredFeedbacks.map(f=>(
                  <div key={f._id} className={`ad-feedback-card ${f.approved?'ad-feedback-card--approved':'ad-feedback-card--hidden'}`}>
                    <p className="ad-feedback-msg">"{f.message}"</p>
                    <div className="ad-feedback-meta">
                      <span className="ad-feedback-name">{f.name}</span>
                      <span className={`badge badge-${f.role==='faculty'?'primary':'success'}`}>{f.role}</span>
                      <span className={`badge badge-${f.approved?'success':'danger'}`}>{f.approved?'✓ Approved':'✗ Hidden'}</span>
                    </div>
                    <div className="ad-feedback-date">{new Date(f.createdAt).toLocaleDateString()}</div>
                    <div className="action-buttons" style={{marginTop:'0.75rem'}}>
                      <Button variant={f.approved?'secondary':'success'} size="sm" onClick={()=>handleToggleFeedback(f._id,f.approved)}>{f.approved?'Hide':'Approve'}</Button>
                      <Button variant="danger" size="sm" onClick={()=>handleDeleteFeedback(f._id)}>Delete</Button>
                    </div>
                  </div>
                )) : <div className="empty-state" style={{padding:'3rem',gridColumn:'1/-1',textAlign:'center'}}><p>No feedback yet</p></div>}
              </div>
            </>
          )}

          {/* ════ ANNOUNCEMENTS ════ */}
          {activeTab==='announcements' && (
            <div className="ad-ann-layout">
              <Card title={editingAnn ? '✏️ Edit Announcement' : '📢 New Announcement'}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <Input placeholder="e.g. Exam schedule update" value={annForm.title} onChange={e=>setAnnForm(p=>({...p,title:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={5} placeholder="Write your announcement…"
                    value={annForm.message} onChange={e=>setAnnForm(p=>({...p,message:e.target.value}))}
                    style={{resize:'vertical'}} maxLength={1000} />
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary-light)',textAlign:'right',marginTop:'4px'}}>{annForm.message.length}/1000</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Audience</label>
                  <select className="form-select" value={annForm.audience} onChange={e=>setAnnForm(p=>({...p,audience:e.target.value}))}>
                    <option value="all">Everyone</option>
                    <option value="student">Students only</option>
                    <option value="faculty">Faculty only</option>
                  </select>
                </div>
                <div className="action-buttons">
                  <Button variant="primary" onClick={handleSaveAnn} disabled={annSaving}>
                    {annSaving?<><Spin/> Saving…</>:editingAnn?'Update':'Post Announcement'}
                  </Button>
                  {editingAnn && <Button variant="secondary" onClick={()=>{setEditingAnn(null);setAnnForm({title:'',message:'',audience:'all'});}}>Cancel</Button>}
                </div>
              </Card>
              <div>
                {annLoading ? <div className="loading-container"><div className="spinner"/></div>
                : announcements.length>0 ? announcements.map(a=>(
                  <div key={a._id} className="ad-ann-card">
                    <div className="ad-ann-header">
                      <span className="ad-ann-title">{a.title}</span>
                      <span className={`badge badge-${a.audience==='all'?'primary':a.audience==='student'?'success':'warning'}`}>
                        {a.audience==='all'?'Everyone':a.audience}
                      </span>
                    </div>
                    <p className="ad-ann-msg">{a.message}</p>
                    <div className="ad-ann-footer">
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      <div className="action-buttons">
                        <Button variant="secondary" size="sm" onClick={()=>handleEditAnn(a)}><MdEdit/> Edit</Button>
                        <Button variant="danger"    size="sm" onClick={()=>handleDeleteAnn(a._id)}><MdDelete/> Delete</Button>
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-state" style={{padding:'3rem',textAlign:'center'}}><p>No announcements yet.</p></div>}
              </div>
            </div>
          )}

          {/* ════ SETTINGS ════ */}
          {activeTab==='settings' && (
            settingsLoading ? <div className="loading-container"><div className="spinner"/></div> : !settings ? null : (
              <div className="ad-settings-layout">
                {/* Upload limits */}
                <Card title="📁 File Upload Limits">
                  <div className="form-group">
                    <label className="form-label">Max upload size per file (MB)</label>
                    <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                      <input type="range" min={1} max={200} value={settingsForm.maxUploadSizeMB}
                        onChange={e=>setSettingsForm(p=>({...p,maxUploadSizeMB:parseInt(e.target.value)}))}
                        style={{flex:1}} />
                      <span className="ad-pill">{settingsForm.maxUploadSizeMB} MB</span>
                    </div>
                  </div>
                  <div className="form-group" style={{marginTop:'1rem'}}>
                    <label className="form-label">Allowed file types</label>
                    <div className="ad-filetypes-grid">
                      {ALL_FILE_TYPES.map(ext=>(
                        <label key={ext} className={`ad-filetype-chip ${settingsForm.allowedFileTypes.includes(ext)?'ad-filetype-chip--on':''}`}>
                          <input type="checkbox" checked={settingsForm.allowedFileTypes.includes(ext)} onChange={()=>toggleFileType(ext)} style={{display:'none'}} />
                          .{ext}
                        </label>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Feature flags */}
                <Card title="⚙️ Feature Flags">
                  <p style={{fontSize:'0.82rem',color:'var(--text-secondary-light)',marginTop:0}}>
                    Disable features to restrict platform functionality.
                  </p>
                  <div className="ad-features-list">
                    {Object.entries(settingsForm.features).map(([key, val])=>(
                      <div key={key} className="ad-feature-row">
                        <div>
                          <span className="ad-feature-name">{key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</span>
                        </div>
                        <label className="ad-toggle">
                          <input type="checkbox" checked={!!val} onChange={()=>toggleFeature(key)} />
                          <span className="ad-toggle-track"><span className="ad-toggle-thumb"/></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>

                <div style={{gridColumn:'1/-1'}}>
                  <Button variant="primary" onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? <><Spin/> Saving…</> : 'Save Settings'}
                  </Button>
                </div>
              </div>
            )
          )}

        </div>
      </div>

      {/* User profile modal */}
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={()=>setProfileUserId(null)} />}
    </div>
  );
};

export default AdminDashboard;
