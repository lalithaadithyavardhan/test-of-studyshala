/**
 * FacultyDashboard.jsx
 * Two-phase onboarding tour:
 *   Phase 1 — empty dashboard, highlights always-visible elements
 *   Phase 2 — after first material created, highlights card elements
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  MdAdd, MdContentCopy, MdCheck, MdDelete, MdUpload, MdBook,
  MdFolder, MdCampaign, MdCreateNewFolder,
  MdFolderOpen, MdClose, MdLink,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { ImSpinner8 } from 'react-icons/im';
import './FacultyDashboard.css';
import TourTooltip from '../components/TourTooltip';

// ── Scroll-reveal wrapper ────────────────────────────────────────────────────
const Reveal = ({ children, delay = 0, direction = 'bottom' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('fd-visible'); obs.unobserve(el); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`fd-reveal fd-reveal--${direction}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// ── File size formatter ──────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / 1024 ** i).toFixed(1) + ' ' + u[i];
};

// ── Modal ────────────────────────────────────────────────────────────────────
const FdModal = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fd-modal">
        <div className="fd-modal-header">
          <h3 className="fd-modal-title">{title}</h3>
          <button className="fd-modal-close" onClick={onClose}><MdClose /></button>
        </div>
        <div className="fd-modal-body">{children}</div>
        {footer && <div className="fd-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ── Announcement Banner ───────────────────────────────────────────────────────
const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = React.useState([]);
  const [dismissed, setDismissed] = React.useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_ann') || '[]'); }
    catch { return []; }
  });

  React.useEffect(() => {
    api.get('/announcements').then(res => setAnnouncements(res.data.announcements || [])).catch(() => {});
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { sessionStorage.setItem('dismissed_ann', JSON.stringify(next)); } catch {}
  };

  const visible = announcements.filter(a => !dismissed.includes(a._id));
  if (visible.length === 0) return null;

  return (
    <div className="ann-banner-wrap">
      {visible.map(a => (
        <div key={a._id} className="ann-banner">
          <MdCampaign className="ann-banner-icon" />
          <div className="ann-banner-body">
            <span className="ann-banner-title">{a.title}</span>
            <span className="ann-banner-msg">{a.message}</span>
          </div>
          <button className="ann-banner-close" onClick={() => dismiss(a._id)} title="Dismiss">
            <MdClose />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Tour steps ────────────────────────────────────────────────────────────────

const FACULTY_TOUR_P1 = [
  {
    selector: null,
    emoji: '👋',
    title: 'Welcome to StudyShala!',
    desc: "You're on your Faculty Dashboard. Let's take a quick look around — it'll take about 30 seconds.",
  },
  {
    selector: '.fd-create-btn',
    emoji: '📁',
    title: 'Start Here — Create a Material',
    desc: 'Tap this button to create your first subject folder. Give it a name, department, semester, and an optional message to students.',
    placement: 'bottom',
  },
  {
    selector: '.fd-hero-right',
    emoji: '📊',
    title: 'Your Stats',
    desc: 'Once you create materials, your personal stats appear here — number of materials, files, and platform-wide live metrics.',
    placement: 'bottom',
  },
  {
    selector: '.sb-nav',
    emoji: '🗂️',
    title: 'Sidebar Navigation',
    desc: 'Browse all materials, view admin courses, and navigate the platform from here.',
    placement: 'bottom',
  },
  {
    selector: null,
    emoji: '🚀',
    title: 'One step away!',
    desc: 'Create your first material and we\'ll walk you through sharing it with students. Tap "Create Material" to get started!',
  },
];

const FACULTY_TOUR_P2 = [
  {
    selector: null,
    emoji: '🎉',
    title: 'Your first material is ready!',
    desc: "Let's take 30 seconds to see exactly what you can do with it.",
  },
  {
    selector: '.fd-code-box',
    emoji: '🔑',
    title: 'Your Access Code',
    desc: 'This unique 8-character code is what you share with students. They enter it in the app to unlock your material instantly.',
    placement: 'bottom',
  },
  {
    selector: '.fd-share-btn--wa',
    emoji: '📲',
    title: 'Share via WhatsApp',
    desc: 'One tap sends your students a ready-made message with the code, subject name, and login link. No copy-pasting needed.',
    placement: 'bottom',
  },
  {
    selector: '.fd-btn--primary',
    emoji: '📤',
    title: 'Upload Your Files',
    desc: 'Click Upload to add PDFs, slides, Word docs, images — anything. Files go straight to Google Drive.',
    placement: 'bottom',
  },
  {
    selector: '.fd-btn--secondary',
    emoji: '📢',
    title: 'Message Your Students',
    desc: 'Pin a message to this material — exam reminders, submission deadlines, anything. Students see it every time they access your material.',
    placement: 'bottom',
  },
  {
    selector: null,
    emoji: '✅',
    title: 'You know everything!',
    desc: "You're fully set up. Share your code with students and they can access your material right away. Replay this tour anytime from the sidebar.",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
const FacultyDashboard = () => {
  const { user, completeTour, completePhase2Tour } = useAuth();

  const [materials,        setMaterials]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [success,          setSuccess]          = useState('');
  const [pageReady,        setPageReady]        = useState(false);
  const [platformStats,    setPlatformStats]    = useState(null);

  const [showTour,         setShowTour]         = useState(false);
  const [showPhase2Prompt, setShowPhase2Prompt] = useState(false);
  const [showPhase2Tour,   setShowPhase2Tour]   = useState(false);
  const [isFirstMaterial,  setIsFirstMaterial]  = useState(false);

  const [showCreate,       setShowCreate]       = useState(false);
  const [showUpload,       setShowUpload]       = useState(false);
  const [showMsg,          setShowMsg]          = useState(false);
  const [selectedFolder,   setSelectedFolder]   = useState(null);
  const [copiedId,         setCopiedId]         = useState(null);
  const [sharedId,         setSharedId]         = useState(null);

  const [formData,     setFormData]     = useState({ department: '', semester: '', subjectName: '', facultyName: '', messageToStudents: '' });
  const [submitting,   setSubmitting]   = useState(false);

  const [uploadFiles,    setUploadFiles]    = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase,    setUploadPhase]    = useState('idle'); // 'idle' | 'sending' | 'drive' | 'done'
  const [isDragging,     setIsDragging]     = useState(false);
  const [selectedSfId,   setSelectedSfId]   = useState('');
  const [newSfName,      setNewSfName]      = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [msgText,   setMsgText]   = useState('');
  const [savingMsg, setSavingMsg] = useState(false);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
  const semesters   = ['1', '2', '3', '4', '5', '6', '7', '8'];

  useEffect(() => {
    api.get('/stats').then(res => setPlatformStats(res.data)).catch(() => {});
    const t = setTimeout(() => {
      setPageReady(true);
      if (!user?.tourCompleted) {
        setTimeout(() => setShowTour(true), 800);
      }
    }, 60);
    fetchMaterials();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && materials.length === 1 && !user?.phase2TourCompleted) {
      const t = setTimeout(() => setShowPhase2Prompt(true), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, materials.length]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/folders');
      setMaterials(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
    } finally { setLoading(false); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); };
  const showError   = (msg) => { setError(msg);   setTimeout(() => setError(''),   6000); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const wasEmpty = materials.length === 0;
      const res = await api.post('/faculty/folders', formData);
      setShowCreate(false);
      setFormData({ department: '', semester: '', subjectName: '', facultyName: '', messageToStudents: '' });
      const code = res.data.folder.accessCode || res.data.folder.departmentCode;
      showSuccess(`Material created! Student code: ${code}`);
      await fetchMaterials();
      if (wasEmpty && !user?.phase2TourCompleted) {
        setIsFirstMaterial(true);
        setTimeout(() => setShowPhase2Prompt(true), 800);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create material');
    } finally { setSubmitting(false); }
  };

  const addFiles = (files) => {
    const valid = files.filter(f => {
      if (f.size > 50 * 1024 * 1024) { showError(`${f.name} exceeds 50 MB limit.`); return false; }
      return true;
    });
    setUploadFiles(prev => [...prev, ...valid]);
  };

  const openUpload = (material) => {
    setSelectedFolder(material);
    setUploadFiles([]); setSelectedSfId(''); setNewSfName('');
    setShowUpload(true);
  };

  const handleCreateSubFolder = async () => {
    if (!newSfName.trim() || !selectedFolder) return;
    setCreatingFolder(true);
    try {
      const res = await api.post(`/faculty/folders/${selectedFolder._id}/subfolders`, { name: newSfName.trim() });
      const newSf = res.data.subFolder;
      setSelectedFolder(prev => ({ ...prev, subFolders: [...(prev.subFolders || []), newSf] }));
      setSelectedSfId(newSf._id);
      setNewSfName('');
      showSuccess(`Folder "${newSf.name}" created!`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create folder');
    } finally { setCreatingFolder(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFiles.length || !selectedFolder) return;
    setUploading(true); setUploadProgress(0); setUploadPhase('sending');
    try {
      const form = new FormData();
      uploadFiles.forEach(f => form.append('files', f));
      if (selectedSfId) form.append('subFolderId', selectedSfId);
      const endpoint = selectedSfId
        ? `/faculty/folders/${selectedFolder._id}/subfolders/${selectedSfId}/files`
        : `/faculty/folders/${selectedFolder._id}/files`;
      await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded * 100) / evt.total);
            setUploadProgress(pct);
            // Once browser→server transfer is done, switch to Drive phase
            if (pct >= 100) setUploadPhase('drive');
          }
        }
      });
      setShowUpload(false);
      setUploadFiles([]); setSelectedFolder(null); setSelectedSfId(''); setUploadProgress(0); setUploadPhase('idle');
      const dest = selectedSfId
        ? `into "${selectedFolder.subFolders?.find(sf => sf._id === selectedSfId)?.name || 'folder'}"`
        : 'to root';
      showSuccess(`${uploadFiles.length} file(s) uploaded ${dest}!`);
      fetchMaterials();
    } catch (err) {
      showError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); setUploadProgress(0); setUploadPhase('idle'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material? All files will be removed and students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      showSuccess('Material deleted.'); fetchMaterials();
    } catch (err) { showError(err.response?.data?.message || 'Failed to delete'); }
  };

  const openMsg = (material) => {
    setSelectedFolder(material);
    setMsgText(material.messageToStudents || '');
    setShowMsg(true);
  };
  const handleSaveMessage = async () => {
    if (!selectedFolder) return;
    setSavingMsg(true);
    try {
      await api.patch(`/faculty/folders/${selectedFolder._id}/message`, { messageToStudents: msgText });
      setShowMsg(false); showSuccess('Message updated!'); fetchMaterials();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save message');
    } finally { setSavingMsg(false); }
  };

  const APP_URL = 'https://studyshala.dev';

  const shareMaterial = (material) => {
    const code    = material.accessCode || material.departmentCode || '—';
    const subject = material.subjectName || 'Study Material';
    const faculty = material.facultyName || '';
    const dept    = material.department  || '';
    const sem     = material.semester    ? `Semester ${material.semester}` : '';
    const msg =
      `📚 *${subject}*\n` +
      (faculty ? `👨‍🏫 Faculty: ${faculty}\n` : '') +
      (dept    ? `🏫 Department: ${dept}\n`   : '') +
      (sem     ? `📅 ${sem}\n`                : '') +
      `\n🔑 *Access Code: \`${code}\`*\n\n` +
      `Open StudyShala, go to *Enter Code* and enter the above code to access the material.\n\n` +
      `🔗 Login at: ${APP_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const copyShareMsg = async (material) => {
    const code    = material.accessCode || material.departmentCode || '—';
    const subject = material.subjectName || 'Study Material';
    const faculty = material.facultyName || '';
    const sem     = material.semester    ? `Semester ${material.semester}` : '';
    const msg =
      `📚 ${subject}` +
      (faculty ? ` | ${faculty}` : '') +
      (sem     ? ` | ${sem}`     : '') +
      `\n🔑 Access Code: ${code}\n🔗 ${APP_URL}`;
    try {
      await navigator.clipboard.writeText(msg);
      setSharedId(material._id);
      setTimeout(() => setSharedId(null), 2000);
    } catch (_) {}
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalSize = uploadFiles.reduce((s, f) => s + f.size, 0);

  return (
    <div className="app-container">
      <Sidebar role="faculty" />
      <div className="main-content">
        <Navbar />
        <AnnouncementBanner />
        <div className={`fd-page ${pageReady ? 'fd-ready' : ''}`}>

          {/* ── Hero ── */}
          <div className="fd-hero">
            <div className="fd-hero-left">
              <div className="fd-hero-label fd-enter" style={{ animationDelay: '80ms' }}>— faculty dashboard</div>
              <h1 className="fd-title fd-enter" style={{ animationDelay: '160ms' }}>
                Manage your<br /><span className="fd-title-accent">materials.</span>
              </h1>
              <p className="fd-subtitle fd-enter" style={{ animationDelay: '240ms' }}>
                Create subjects, upload files, generate access codes, and message your students — all in one place.
              </p>
            </div>
            <div className="fd-hero-right fd-enter" style={{ animationDelay: '300ms' }}>
              <div className="fd-profile-card">
                <div className="fd-profile-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || 'F'}
                </div>
                <div className="fd-profile-info">
                  <div className="fd-profile-name">{user?.name}</div>
                  <div className="fd-profile-email">{user?.email}</div>
                  <span className="fd-profile-role">{user?.role}</span>
                </div>
              </div>

              <div className="fd-stats-row">
                <div className="fd-stat">
                  <div className="fd-stat-val">{materials.length}</div>
                  <div className="fd-stat-lbl">Materials</div>
                </div>
                <div className="fd-stat">
                  <div className="fd-stat-val">
                    {materials.reduce((s, m) =>
                      s + (m.files?.length || 0) +
                      (m.subFolders || []).reduce((ss, sf) => ss + (sf.files?.length || 0), 0), 0)}
                  </div>
                  <div className="fd-stat-lbl">Total Files</div>
                </div>
                <div className="fd-stat">
                  <div className="fd-stat-val">{materials.filter(m => m.messageToStudents?.trim()).length}</div>
                  <div className="fd-stat-lbl">With Messages</div>
                </div>
              </div>

              {platformStats && (
                <div className="fd-platform-card">
                  <div className="fd-platform-card-heading">
                    <span className="fd-platform-dot" />
                    StudyShala at a glance
                  </div>
                  <div className="fd-platform-card-grid">
                    <div className="fd-platform-item">
                      <span className="fd-platform-val">{platformStats.totalStudents?.toLocaleString()}</span>
                      <span className="fd-platform-lbl">Students joined</span>
                    </div>
                    <div className="fd-platform-item">
                      <span className="fd-platform-val">{platformStats.totalFaculty?.toLocaleString()}</span>
                      <span className="fd-platform-lbl">Faculty members</span>
                    </div>
                    <div className="fd-platform-item">
                      <span className="fd-platform-val">{platformStats.totalMaterials?.toLocaleString()}</span>
                      <span className="fd-platform-lbl">Materials shared</span>
                    </div>
                    <div className="fd-platform-item">
                      <span className="fd-platform-val">{platformStats.totalVisits?.toLocaleString()}</span>
                      <span className="fd-platform-lbl">Total visits</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Alerts ── */}
          {error   && <div className="fd-alert fd-alert--err fd-enter"><span>⚠</span> {error}</div>}
          {success && <div className="fd-alert fd-alert--ok  fd-enter"><span>✓</span> {success}</div>}

          {/* ── Phase 2 prompt ── */}
          {showPhase2Prompt && !showPhase2Tour && (
            <div className="fd-p2-prompt">
              <div className="fd-p2-prompt-left">
                <span className="fd-p2-prompt-emoji">🎉</span>
                <div>
                  <div className="fd-p2-prompt-title">
                    {isFirstMaterial ? 'Your first material is live!' : 'Quick tip — explore what you can do'}
                  </div>
                  <div className="fd-p2-prompt-sub">
                    See how to share codes, upload files, and message your students.
                  </div>
                </div>
              </div>
              <div className="fd-p2-prompt-actions">
                <button
                  className="fd-p2-prompt-btn fd-p2-prompt-btn--primary"
                  onClick={() => { setShowPhase2Prompt(false); setShowPhase2Tour(true); }}
                >
                  Show me →
                </button>
                <button
                  className="fd-p2-prompt-btn fd-p2-prompt-btn--skip"
                  onClick={() => { setShowPhase2Prompt(false); completePhase2Tour(); }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Section header ── */}
          <div className="fd-section-head fd-enter" style={{ animationDelay: '360ms' }}>
            <div>
              <h2 className="fd-section-title">Created Materials</h2>
              <p className="fd-section-sub">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
            </div>
            <button className="fd-create-btn" onClick={() => setShowCreate(true)}>
              <MdAdd /> Create Material
            </button>
          </div>

          {/* ── Material cards ── */}
          {loading ? (
            <div className="fd-loading">
              <ImSpinner8 className="fd-spinner" />
              <span>Loading materials…</span>
            </div>
          ) : materials.length === 0 ? (
            <div className="fd-empty">
              <div className="fd-empty-icon"><MdBook /></div>
              <h3 className="fd-empty-title">No materials yet</h3>
              <p className="fd-empty-sub">Create your first material to share with students</p>
              <button className="fd-create-btn" onClick={() => setShowCreate(true)}>
                <MdAdd /> Create First Material
              </button>
            </div>
          ) : (
            <div className="fd-grid">
              {materials.map((m, i) => {
                const code       = m.accessCode || m.departmentCode;
                const sfCount    = m.subFolders?.length || 0;
                const totalFiles = (m.files?.length || 0) + (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
                const hasMsg     = !!m.messageToStudents?.trim();
                return (
                  <Reveal key={m._id} delay={i * 55}>
                    <div className="fd-card">
                      <div className="fd-card-top">
                        <div className="fd-card-icon"><MdBook /></div>
                        <div className="fd-card-title-wrap">
                          <h3 className="fd-card-title">{m.subjectName}</h3>
                          {hasMsg && <span className="fd-msg-dot" title="Has message"><MdCampaign /></span>}
                        </div>
                      </div>

                      <div className="fd-card-meta">
                        <span><strong>Faculty</strong> {m.facultyName}</span>
                        <span><strong>Dept</strong> {m.department}</span>
                        <span><strong>Sem</strong> {m.semester}</span>
                        <span><strong>Files</strong> {totalFiles}{sfCount > 0 ? ` · ${sfCount} folder${sfCount !== 1 ? 's' : ''}` : ''}</span>
                      </div>

                      {sfCount > 0 && (
                        <div className="fd-sf-list">
                          {m.subFolders.map(sf => (
                            <span key={sf._id} className="fd-sf-chip">
                              <MdFolderOpen /> {sf.name} <em>{sf.files?.length || 0}</em>
                            </span>
                          ))}
                        </div>
                      )}

                      {hasMsg && (
                        <div className="fd-msg-preview">
                          <MdCampaign />
                          <span>{m.messageToStudents.slice(0, 72)}{m.messageToStudents.length > 72 ? '…' : ''}</span>
                        </div>
                      )}

                      <div className="fd-code-box">
                        <div className="fd-code-label">Student Access Code</div>
                        <div className="fd-code-row">
                          <code className="fd-code">{code}</code>
                          <button
                            className={`fd-copy-btn ${copiedId === m._id ? 'fd-copy-btn--done' : ''}`}
                            onClick={() => copyCode(code, m._id)}
                          >
                            {copiedId === m._id ? <><MdCheck /> Copied</> : <><MdContentCopy /> Copy</>}
                          </button>
                        </div>
                        <div className="fd-share-row">
                          <span className="fd-share-label">Share material</span>
                          <div className="fd-share-btns">
                            <button className="fd-share-btn fd-share-btn--wa" onClick={() => shareMaterial(m)}>
                              <FaWhatsapp /> WhatsApp
                            </button>
                            <button
                              className={`fd-share-btn fd-share-btn--copy ${sharedId === m._id ? 'fd-share-btn--done' : ''}`}
                              onClick={() => copyShareMsg(m)}
                            >
                              {sharedId === m._id ? <><MdCheck /> Copied!</> : <><MdLink /> Copy msg</>}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="fd-card-actions">
                        <button className="fd-btn fd-btn--primary" onClick={() => openUpload(m)}>
                          <MdUpload /> Upload
                        </button>
                        <button className="fd-btn fd-btn--secondary" onClick={() => openMsg(m)}>
                          <MdCampaign /> {hasMsg ? 'Edit Msg' : 'Add Msg'}
                        </button>
                        <button className="fd-btn fd-btn--danger" onClick={() => handleDelete(m._id)}>
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ Create Material Modal ══ */}
      <FdModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Material"
        footer={
          <>
            <button className="fd-btn fd-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="fd-btn fd-btn--primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? <><ImSpinner8 className="fd-spin" /> Creating…</> : 'Create Material'}
            </button>
          </>
        }
      >
        <p className="fd-modal-hint">A unique 8-character code will be generated automatically.</p>
        <form onSubmit={handleCreate} className="fd-form">
          <div className="fd-field">
            <label className="fd-label">Faculty Name <span>*</span></label>
            <input className="fd-input" value={formData.facultyName}
              onChange={e => setFormData(p => ({ ...p, facultyName: e.target.value }))}
              placeholder="e.g., Dr. John Smith" required />
          </div>
          <div className="fd-field-row">
            <div className="fd-field">
              <label className="fd-label">Department <span>*</span></label>
              <select className="fd-input" value={formData.department}
                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} required>
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="fd-field">
              <label className="fd-label">Semester <span>*</span></label>
              <select className="fd-input" value={formData.semester}
                onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))} required>
                <option value="">Select</option>
                {semesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>
          <div className="fd-field">
            <label className="fd-label">Subject Name <span>*</span></label>
            <input className="fd-input" value={formData.subjectName}
              onChange={e => setFormData(p => ({ ...p, subjectName: e.target.value }))}
              placeholder="e.g., Data Structures & Algorithms" required />
          </div>
          <div className="fd-field">
            <label className="fd-label">
              <MdCampaign style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              Message to Students <span className="fd-optional">(optional)</span>
            </label>
            <textarea className="fd-textarea"
              value={formData.messageToStudents}
              onChange={e => setFormData(p => ({ ...p, messageToStudents: e.target.value }))}
              placeholder="e.g., Unit 1 exam on Friday. Submit assignments by Sunday."
              rows={3} maxLength={2000} />
            <div className="fd-char-count">{formData.messageToStudents.length}/2000</div>
          </div>
        </form>
      </FdModal>

      {/* ══ Upload Files Modal ══ */}
      <FdModal
        open={showUpload}
        onClose={() => { if (!uploading) { setShowUpload(false); setUploadFiles([]); setSelectedSfId(''); setNewSfName(''); setUploadProgress(0); } }}
        title={`Upload Files — ${selectedFolder?.subjectName || ''}`}
        footer={
          <>
            {uploading && (
              <div style={{ flex: 1, marginRight: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#0369a1', marginBottom: '0.3rem', fontWeight: 600 }}>
                  <span>
                    {uploadPhase === 'drive'
                      ? '☁️ Saving to Google Drive…'
                      : '⏳ Sending files…'}
                  </span>
                  <span>{uploadPhase === 'drive' ? '' : `${uploadProgress}%`}</span>
                </div>
                <div style={{ height: '7px', background: '#e0f2fe', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #0891b2, #14b8a6)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
            <button className="fd-btn fd-btn--ghost"
              onClick={() => { setShowUpload(false); setUploadFiles([]); setSelectedSfId(''); setNewSfName(''); setUploadProgress(0); }}
              disabled={uploading}>
              Cancel
            </button>
            <button className="fd-btn fd-btn--primary" onClick={handleUpload} disabled={uploading || !uploadFiles.length}>
              {uploading
                ? uploadPhase === 'drive'
                  ? <><ImSpinner8 className="fd-spin" /> Saving to Drive…</>
                  : <><ImSpinner8 className="fd-spin" /> {uploadProgress}%</>
                : <><MdUpload /> Upload {uploadFiles.length} file(s)</>}
            </button>
          </>
        }
      >
        <p className="fd-modal-hint">Max 50 MB per file · PDF, DOC, PPT, XLS, images, video, ZIP</p>
        <div className="fd-field">
          <label className="fd-label"><MdFolder style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> Upload destination</label>
          <select className="fd-input" value={selectedSfId} onChange={e => setSelectedSfId(e.target.value)}>
            <option value="">📂 Root (no sub-folder)</option>
            {(selectedFolder?.subFolders || []).map(sf => (
              <option key={sf._id} value={sf._id}>📁 {sf.name} ({sf.files?.length || 0} files)</option>
            ))}
          </select>
        </div>
        <div className="fd-sf-create">
          <MdCreateNewFolder className="fd-sf-create-icon" />
          <input className="fd-sf-input" placeholder="New folder name (e.g. Unit 1, Lab Sheets)"
            value={newSfName} onChange={e => setNewSfName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSubFolder(); } }}
            maxLength={60} />
          <button className="fd-btn fd-btn--ghost fd-sf-btn"
            onClick={handleCreateSubFolder} disabled={!newSfName.trim() || creatingFolder}>
            {creatingFolder ? <ImSpinner8 className="fd-spin" /> : '+ Create'}
          </button>
        </div>
        <div
          className={`fd-dropzone ${isDragging ? 'fd-dropzone--active' : ''}`}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => document.getElementById('fd-file-input').click()}
        >
          <div className="fd-dropzone-icon">📂</div>
          <p className="fd-dropzone-text">Drag &amp; drop files here</p>
          <p className="fd-dropzone-sub">or click to browse</p>
          <input id="fd-file-input" type="file" multiple style={{ display: 'none' }}
            onChange={e => addFiles(Array.from(e.target.files))}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.mp4,.mp3" />
        </div>
        {uploadFiles.length > 0 && (
          <div className="fd-file-list">
            <div className="fd-file-list-header">
              <span>{uploadFiles.length} file(s) · {fmtSize(totalSize)}</span>
              <button className="fd-clear-btn" onClick={() => setUploadFiles([])}>Clear All</button>
            </div>
            {uploadFiles.map((file, i) => (
              <div key={i} className="fd-file-row">
                <span className="fd-file-emoji">📄</span>
                <div className="fd-file-info">
                  <div className="fd-file-name">{file.name}</div>
                  <div className="fd-file-size">{fmtSize(file.size)}</div>
                </div>
                <button className="fd-file-remove" onClick={() => setUploadFiles(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        )}
        {selectedSfId && (
          <div className="fd-dest-badge">
            📁 Uploading into: <strong>{selectedFolder?.subFolders?.find(sf => sf._id === selectedSfId)?.name}</strong>
          </div>
        )}
      </FdModal>

      {/* ══ Edit Message Modal ══ */}
      <FdModal
        open={showMsg}
        onClose={() => setShowMsg(false)}
        title={`Message to Students — ${selectedFolder?.subjectName || ''}`}
        footer={
          <>
            <button className="fd-btn fd-btn--ghost" onClick={() => setShowMsg(false)}>Cancel</button>
            <button className="fd-btn fd-btn--primary" onClick={handleSaveMessage} disabled={savingMsg}>
              {savingMsg ? <><ImSpinner8 className="fd-spin" /> Saving…</> : 'Save Message'}
            </button>
          </>
        }
      >
        <p className="fd-modal-hint">Shown to students whenever they access or browse this material.</p>
        <textarea className="fd-textarea" value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder="e.g., Unit 2 exam next week. Assignment deadline Sunday midnight."
          rows={5} maxLength={2000} style={{ width: '100%' }} />
        <div className="fd-char-count">{msgText.length}/2000</div>
        {msgText.trim() && (
          <button className="fd-clear-msg-btn" onClick={() => setMsgText('')}>🗑 Clear message</button>
        )}
      </FdModal>

      {/* ── Phase 1 Tour — empty dashboard ── */}
      {showTour && (
        <TourTooltip
          steps={FACULTY_TOUR_P1}
          onFinish={() => { setShowTour(false); completeTour(); }}
        />
      )}

      {/* ── Phase 2 Tour — after first material ── */}
      {showPhase2Tour && (
        <TourTooltip
          steps={FACULTY_TOUR_P2}
          onFinish={() => { setShowPhase2Tour(false); completePhase2Tour(); }}
        />
      )}

    </div>
  );
};

export default FacultyDashboard;
