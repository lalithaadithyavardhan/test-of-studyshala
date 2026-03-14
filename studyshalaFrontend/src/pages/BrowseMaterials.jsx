/**
 * BrowseMaterials.jsx
 * ===================
 * Full-screen Windows Explorer-style file browser.
 * Students: preview + download
 * Faculty/Admin: + delete, edit, upload
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MdGridView, MdViewList, MdSearch, MdClose, MdFolder, MdFolderOpen,
  MdInsertDriveFile, MdPictureAsPdf, MdImage, MdVideoFile, MdDescription,
  MdDownload, MdPreview, MdDelete, MdEdit, MdUpload, MdArrowBack,
  MdLightMode, MdDarkMode, MdMoreVert, MdCheck, MdContentCopy,
  MdFilterList, MdSort, MdInfo, MdKeyboardArrowRight, MdHome, MdBookmarkRemove,
  MdCreateNewFolder, MdSelectAll, MdDeselect, MdDownloadForOffline, MdStar, MdStarBorder
} from 'react-icons/md';
import JSZip from 'jszip';
import './BrowseMaterials.css';
import MessageBanner from '../components/MessageBanner';

// ── File type icon helper ────────────────────────────────────────────────────
const FileIcon = ({ mimeType, size = 'md' }) => {
  const cls = `bm-file-icon bm-file-icon--${size}`;
  if (!mimeType)                              return <MdInsertDriveFile className={cls} />;
  if (mimeType.includes('pdf'))               return <MdPictureAsPdf    className={`${cls} bm-icon--pdf`} />;
  if (mimeType.includes('image'))             return <MdImage           className={`${cls} bm-icon--img`} />;
  if (mimeType.includes('video'))             return <MdVideoFile       className={`${cls} bm-icon--vid`} />;
  if (mimeType.includes('word') || mimeType.includes('document'))
                                              return <MdDescription     className={`${cls} bm-icon--doc`} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
                                              return <MdDescription     className={`${cls} bm-icon--ppt`} />;
  return <MdInsertDriveFile className={cls} />;
};

// ── Format file size ─────────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ── Format date ──────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';


// ── Native code preview ─────────────────────────────────────────────────────
const CODE_EXTS = ['.js','.jsx','.ts','.tsx','.py','.java','.c','.cpp','.cs',
                   '.go','.rs','.rb','.php','.sh','.bash','.json','.xml','.yaml','.yml','.txt','.md'];

const isCodeFile  = (name = '') => CODE_EXTS.some(ext => name.toLowerCase().endsWith(ext));
const isMdFile    = (name = '') => name.toLowerCase().endsWith('.md');

// Simple token-based syntax highlighter (no deps)
const tokenise = (code = '', ext = '') => {
  const keywords = /\b(function|return|const|let|var|if|else|for|while|class|import|export|from|default|async|await|def|print|self|None|True|False|public|private|static|void|int|string|bool|new|this|super|try|catch|finally|throw|in|of|null|undefined|typeof|instanceof)\b/g;
  const strings  = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm;
  const numbers  = /\b(\d+\.?\d*)\b/g;

  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(comments, m => `<span class="hl-comment">${m}</span>`)
    .replace(strings,  m => `<span class="hl-string">${m}</span>`)
    .replace(keywords, m => `<span class="hl-keyword">${m}</span>`)
    .replace(numbers,  m => `<span class="hl-number">${m}</span>`);
};

// Basic markdown → HTML renderer (no deps)
const renderMd = (md = '') =>
  md
    .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/`([^`]+)`/g,    '<code>$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlu]|<li|<p)(.+)$/gm, '<p>$1</p>');

// ── Native in-app code / markdown preview ───────────────────────────────────
const NativePreview = ({ file, isMd }) => {
  const [content, setContent] = React.useState(null);
  const [err,     setErr]     = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setContent(null); setErr('');
    // Fetch from Drive as text — files are anyoneWithLink so no auth needed for text
    const url = `https://drive.usercontent.google.com/download?id=${file.driveFileId}&export=download&authuser=0`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Fetch failed'); return r.text(); })
      .then(t => { if (!cancelled) setContent(t); })
      .catch(() => { if (!cancelled) setErr('Could not load file content. Try the Drive preview instead.'); });
    return () => { cancelled = true; };
  }, [file.driveFileId]);

  if (err) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>
      {err}
    </div>
  );
  if (!content) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem', gap: '0.5rem' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid #475569', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'bmSlide 0.7s linear infinite' }} />
      Loading preview…
    </div>
  );

  if (isMd) return (
    <div
      className="bm-md-preview"
      dangerouslySetInnerHTML={{ __html: renderMd(content) }}
    />
  );

  const ext = '.' + (file.name || '').split('.').pop().toLowerCase();
  return (
    <div className="bm-code-preview">
      <div className="bm-code-lang">{ext}</div>
      <pre className="bm-code-pre">
        <code dangerouslySetInnerHTML={{ __html: tokenise(content, ext) }} />
      </pre>
    </div>
  );
};

// ── Search highlight helper ──────────────────────────────────────────────────
const Highlight = ({ text = '', query = '' }) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bm-highlight">{part}</mark>
          : part
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
const BrowseMaterials = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const role        = user?.role || 'student';
  const isFaculty   = role === 'faculty' || role === 'admin';

  // ── Data state ──────────────────────────────────────────────────────────
  const [folders,        setFolders]        = useState([]);   // all folders/materials
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');

  // ── UI state ────────────────────────────────────────────────────────────
  const [viewMode,       setViewMode]       = useState('grid');   // 'grid' | 'list'
  const [darkMode,       setDarkMode]       = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterDept,     setFilterDept]     = useState('all');
  const [filterSem,      setFilterSem]      = useState('all');
  const [sortBy,         setSortBy]         = useState('newest');

  // ── Selection & navigation ───────────────────────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState(null);   // folder object
  const [selectedFile,   setSelectedFile]   = useState(null);   // file object
  const [previewFile,    setPreviewFile]     = useState(null);   // file for preview panel

  // ── Modals ───────────────────────────────────────────────────────────────
  const [editModal,      setEditModal]      = useState(false);
  const [uploadModal,    setUploadModal]    = useState(false);
  const [editData,       setEditData]       = useState({});
  const [copiedCode,     setCopiedCode]     = useState(null);

  // ── Inline upload state (faculty) ────────────────────────────────────────
  const [uploadFiles,    setUploadFiles]    = useState([]);
  const [uploadSfId,     setUploadSfId]     = useState('');
  const [uploading,      setUploading]      = useState(false);
  const [uploadDragging, setUploadDragging] = useState(false);
  const [newSfName,      setNewSfName]      = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // ── Sidebar panel ────────────────────────────────────────────────────────
  const [infoPanel,      setInfoPanel]      = useState(true);

  // ── In-app preview modal ─────────────────────────────────────────────────
  const [previewModal,   setPreviewModal]   = useState(null);   // file object

  const searchRef = useRef(null);

  // Close preview on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPreviewModal(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Fetch data + starred/recent from DB ─────────────────────────────────
  useEffect(() => {
    fetchData();
    if (!isFaculty) {
      api.get('/student/starred-files').then(r => {
        setStarredFiles(new Set((r.data.starredFiles || []).map(s => s.fileId)));
      }).catch(() => {});
      api.get('/student/recent-files').then(r => {
        setRecentFiles(r.data.recentFiles || []);
        setRecentLoaded(true);
      }).catch(() => { setRecentLoaded(true); });
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (isFaculty) {
        res = await api.get('/faculty/folders');
        setFolders(res.data.folders || []);
      } else {
        // Students see saved materials ONLY
        res = await api.get('/student/saved-materials');
        setFolders(res.data.materials || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // ── Load files for selected folder ───────────────────────────────────────
  const openFolder = async (folder) => {
    setSelectedFolder({ ...folder, files: [], subFolders: [] });
    setSelectedFile(null);
    setPreviewFile(null);
    setSelectedFiles(new Set());
    try {
      const res = await api.get(
        isFaculty
          ? `/faculty/folders/${folder._id}`
          : `/student/materials/${folder._id}/files`
      );
      const data = isFaculty ? res.data.folder : res.data;
      setSelectedFolder(prev => ({
        ...prev,
        files:             data.files || [],
        subFolders:        data.subFolders || [],
        messageToStudents: data.messageToStudents || data.material?.messageToStudents || ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    }
  };

  // ── Derived lists ────────────────────────────────────────────────────────
  const departments = ['all', ...new Set(folders.map(f => f.department).filter(Boolean))];
  const semesters   = ['all', ...new Set(folders.map(f => f.semester).filter(Boolean))];

  const filtered = folders
    .filter(f => {
      const q = search.toLowerCase();
      return (
        (!q || f.subjectName?.toLowerCase().includes(q) || f.facultyName?.toLowerCase().includes(q)) &&
        (filterDept === 'all' || f.department === filterDept) &&
        (filterSem  === 'all' || f.semester   === filterSem)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name')   return a.subjectName.localeCompare(b.subjectName);
      return 0;
    });

  // ── Actions ──────────────────────────────────────────────────────────────

  // ── Download progress state ───────────────────────────────────────────────
  const [downloads, setDownloads] = useState([]); // [{id, name, progress, done, error}]

  // ── Batch selection (students & faculty) ──────────────────────────────
  const [selectedFiles, setSelectedFiles] = useState(new Set()); // Set of file._id strings
  const [batchZipping,  setBatchZipping]  = useState(false);

  // ── Starred files — DB-backed, cross-device ─────────────────────────────
  const [starredFiles,  setStarredFiles]  = useState(new Set()); // Set of fileId strings
  const [recentFiles,   setRecentFiles]   = useState([]);        // [{fileId,fileName,mimeType,materialId,subjectName,viewedAt}]
  const [recentLoaded,  setRecentLoaded]  = useState(false);

  const handleDownload = async (file) => {
    if (!file._id || !selectedFolder?._id) {
      if (file.downloadUrl) window.open(file.downloadUrl, '_blank', 'noopener');
      else setError('Download not available for this file.');
      return;
    }

    const dlId = file._id + '_' + Date.now();
    setDownloads(prev => [...prev, { id: dlId, name: file.name, done: false, error: null }]);

    try {
      // Request the file as a blob — backend proxies from Drive, adds watermark,
      // and streams it back with Content-Disposition: attachment.
      // Using responseType:'blob' keeps everything in-page — no new tab opens.
      const res = await api.get(
        `/student/materials/${selectedFolder._id}/files/${file._id}/download`,
        { responseType: 'blob' }
      );

      // Build a temporary object URL and click a hidden <a> to save the file
      const blobUrl  = URL.createObjectURL(res.data);
      const anchor   = document.createElement('a');
      anchor.href     = blobUrl;
      anchor.download = file.name || 'download';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);

      setDownloads(prev => prev.map(d => d.id === dlId ? { ...d, done: true } : d));
      setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== dlId)), 3000);
    } catch (err) {
      // Try to parse error JSON from blob response
      let msg = 'Download failed. Please try again.';
      try {
        const text = await err.response?.data?.text?.();
        const json = text ? JSON.parse(text) : null;
        if (json?.message) msg = json.message;
      } catch (_) {}
      setDownloads(prev => prev.map(d => d.id === dlId ? { ...d, error: msg } : d));
      setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== dlId)), 5000);
    }
  };

  // ── Inline upload helpers (faculty) ─────────────────────────────────────
  const addUploadFiles = (files) => {
    const valid = Array.from(files).filter(f => {
      if (f.size > 50 * 1024 * 1024) { setError(`${f.name} exceeds 50 MB`); return false; }
      return true;
    });
    setUploadFiles(prev => [...prev, ...valid]);
  };

  const handleCreateSubFolder = async () => {
    if (!newSfName.trim() || !selectedFolder) return;
    setCreatingFolder(true);
    try {
      const res = await api.post(`/faculty/folders/${selectedFolder._id}/subfolders`, { name: newSfName.trim() });
      const sf = res.data.subFolder;
      setSelectedFolder(prev => ({ ...prev, subFolders: [...(prev.subFolders || []), sf] }));
      setUploadSfId(sf._id);
      setNewSfName('');
      setSuccess(`Folder "${sf.name}" created!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed to create folder');
    } finally { setCreatingFolder(false); }
  };

  const handleUploadSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!uploadFiles.length || !selectedFolder) return;
    setUploading(true); setError('');
    try {
      const form = new FormData();
      uploadFiles.forEach(f => form.append('files', f));
      if (uploadSfId) form.append('subFolderId', uploadSfId);
      const endpoint = uploadSfId
        ? `/faculty/folders/${selectedFolder._id}/subfolders/${uploadSfId}/files`
        : `/faculty/folders/${selectedFolder._id}/files`;
      await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const dest = uploadSfId
        ? `into "${selectedFolder.subFolders?.find(sf => sf._id === uploadSfId)?.name || 'folder'}"`
        : 'to root';
      setSuccess(`${uploadFiles.length} file(s) uploaded ${dest}!`);
      setTimeout(() => setSuccess(''), 5000);
      setUploadFiles([]); setUploadSfId(''); setUploadModal(false);
      openFolder(selectedFolder);
    } catch (err) { setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const fmtUploadSize = (bytes) => {
    if (!bytes) return '0 B';
    const u = ['B','KB','MB','GB'], i = Math.floor(Math.log(bytes)/Math.log(1024));
    return (bytes/1024**i).toFixed(1)+' '+u[i];
  };

  // ── Batch file selection ─────────────────────────────────────────────────
  const toggleFileSelect = (fileId, e) => {
    e.stopPropagation();
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  };

  const selectAllFiles = () => {
    const allIds = (selectedFolder?.files || []).map(f => f._id);
    setSelectedFiles(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  };

  const handleBatchZip = async () => {
    if (!selectedFiles.size || !selectedFolder) return;
    setBatchZipping(true);
    setError('');
    const files = (selectedFolder.files || []).filter(f => selectedFiles.has(f._id));
    try {
      const zip = new JSZip();
      await Promise.all(files.map(async (file) => {
        try {
          const res = await api.get(
            `/student/materials/${selectedFolder._id}/files/${file._id}/download`,
            { responseType: 'blob' }
          );
          zip.file(file.name, res.data);
        } catch { zip.file(file.name + '.error.txt', 'Download failed for this file.'); }
      }));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${selectedFolder.subjectName || 'files'}.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      setSuccess(`Downloaded ${files.length} file(s) as ZIP!`);
      setTimeout(() => setSuccess(''), 4000);
      setSelectedFiles(new Set());
    } catch (err) {
      setError('ZIP download failed. Please try again.');
    } finally { setBatchZipping(false); }
  };

  // ── Star / bookmark individual files — DB-backed ────────────────────────
  const toggleStar = async (fileId, file, e) => {
    e.stopPropagation();
    const alreadyStarred = starredFiles.has(fileId);
    // Optimistic update
    setStarredFiles(prev => {
      const next = new Set(prev);
      alreadyStarred ? next.delete(fileId) : next.add(fileId);
      return next;
    });
    try {
      if (alreadyStarred) {
        await api.delete(`/student/starred-files/${fileId}`);
      } else {
        await api.post('/student/starred-files', {
          fileId,
          fileName:    file.name,
          mimeType:    file.mimeType || '',
          materialId:  selectedFolder?._id,
          subjectName: selectedFolder?.subjectName || ''
        });
      }
    } catch {
      // Rollback on failure
      setStarredFiles(prev => {
        const next = new Set(prev);
        alreadyStarred ? next.add(fileId) : next.delete(fileId);
        return next;
      });
    }
  };

  const isStarred = (fileId) => starredFiles.has(fileId);

  // ── Track recently viewed file ────────────────────────────────────────────
  const trackRecent = (file) => {
    if (!file?._id || !selectedFolder?._id || isFaculty) return;
    api.post('/student/recent-files', {
      fileId:      file._id,
      fileName:    file.name,
      mimeType:    file.mimeType || '',
      materialId:  selectedFolder._id,
      subjectName: selectedFolder.subjectName || ''
    }).then(r => setRecentFiles(r.data.recentFiles || [])).catch(() => {});
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete this material? Students will lose access.')) return;
    try {
      await api.delete(`/faculty/folders/${id}`);
      setSuccess('Material deleted');
      if (selectedFolder?._id === id) { setSelectedFolder(null); setSelectedFile(null); }
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRemoveSaved = async (id) => {
    if (!window.confirm('Remove this material from your saved list?')) return;
    try {
      await api.delete(`/student/saved-materials/${id}`);
      setSuccess('Removed from saved materials');
      if (selectedFolder?._id === id) { setSelectedFolder(null); setSelectedFile(null); setPreviewFile(null); }
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleDeleteFile = async (folderId, fileId) => {
    if (!window.confirm('Remove this file?')) return;
    try {
      await api.delete(`/faculty/folders/${folderId}/files/${fileId}`);
      setSuccess('File removed');
      setSelectedFile(null);
      setPreviewFile(null);
      openFolder(selectedFolder);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openEdit = (folder) => {
    setEditData({ id: folder._id, subjectName: folder.subjectName, semester: folder.semester, department: folder.department });
    setEditModal(true);
  };

  const handleEdit = async () => {
    try {
      await api.put(`/faculty/folders/${editData.id}`, {
        subjectName: editData.subjectName,
        semester:    editData.semester,
        department:  editData.department
      });
      setSuccess('Material updated');
      setEditModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  // ── Theme class ──────────────────────────────────────────────────────────
  const themeClass = darkMode ? 'bm-dark' : 'bm-light';

  // ── Breadcrumb ───────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div className="bm-breadcrumb">
      <button onClick={() => { setSelectedFolder(null); setSelectedFile(null); setPreviewFile(null); }}>
        <MdHome /> Materials
      </button>
      {selectedFolder && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          {selectedFolder._activeSubFolder ? (
            <button onClick={() => setSelectedFolder(prev => ({ ...prev, files: prev._parentFiles || [], subFolders: prev._parentSubFolders || [], _activeSubFolder: null, _parentFiles: null, _parentSubFolders: null }))}>
              {selectedFolder.subjectName}
            </button>
          ) : (
            <span>{selectedFolder.subjectName}</span>
          )}
        </>
      )}
      {selectedFolder?._activeSubFolder && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          <span>{selectedFolder._activeSubFolder}</span>
        </>
      )}
      {selectedFile && (
        <>
          <MdKeyboardArrowRight className="bm-breadcrumb-sep" />
          <span>{selectedFile.name}</span>
        </>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={`bm-root ${themeClass}`}>

      {/* ── Top Bar ── */}
      <div className="bm-topbar">
        <div className="bm-topbar-left">
          <button className="bm-back-btn" onClick={() => navigate(-1)} title="Go back">
            <MdArrowBack />
          </button>
          <span className="bm-topbar-title">
            <MdFolderOpen /> Browse Materials
          </span>
          <Breadcrumb />
        </div>

        <div className="bm-topbar-right">
          {/* Search */}
          <div className="bm-search-wrap">
            <MdSearch className="bm-search-icon" />
            <input
              ref={searchRef}
              className="bm-search"
              placeholder="Search materials…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="bm-search-clear" onClick={() => setSearch('')}><MdClose /></button>}
          </div>

          {/* View toggle */}
          <div className="bm-view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid view"><MdGridView /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List view"><MdViewList /></button>
          </div>

          {/* Dark mode */}
          <button className="bm-theme-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
            {darkMode ? <MdLightMode /> : <MdDarkMode />}
          </button>

          {/* Info panel toggle */}
          <button className="bm-theme-btn" onClick={() => setInfoPanel(!infoPanel)} title="Details panel">
            <MdInfo />
          </button>

          {/* Close */}
          <button className="bm-close-btn" onClick={() => navigate(-1)} title="Close">
            <MdClose />
          </button>
        </div>
      </div>

      {/* ── Toolbar (filters + sort) ── */}
      <div className="bm-toolbar">
        <div className="bm-toolbar-left">
          <MdFilterList className="bm-toolbar-icon" />
          <select className="bm-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
          </select>
          <select className="bm-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
            {semesters.map(s => <option key={s} value={s}>{s === 'all' ? 'All Semesters' : `Sem ${s}`}</option>)}
          </select>
        </div>
        <div className="bm-toolbar-right">
          <MdSort className="bm-toolbar-icon" />
          <select className="bm-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
          </select>
          <span className="bm-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error   && <div className="bm-alert bm-alert--error">{error}<button onClick={() => setError('')}><MdClose /></button></div>}
      {success && <div className="bm-alert bm-alert--success">✅ {success}</div>}

      {/* ── Body ── */}
      <div className="bm-body">

        {/* ── Left panel: folder/file list ── */}
        <div className={`bm-main ${infoPanel ? 'bm-main--with-panel' : ''}`}>

          {loading ? (
            <div className="bm-empty"><div className="bm-spinner" /><p>Loading materials…</p></div>
          ) : !selectedFolder ? (
            /* ── Folder listing ── */
            filtered.length === 0 ? (
              <div className="bm-empty">
                <MdFolder className="bm-empty-icon" />
                <p>{search ? 'No results found' : 'No materials available'}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <>
              {/* ── Recently Viewed strip (students only, top of grid) ── */}
              {!isFaculty && recentLoaded && recentFiles.length > 0 && !search && (
                <div className="bm-recent-strip">
                  <div className="bm-recent-header">
                    <span className="bm-recent-label">🕐 Recently Viewed</span>
                    <button className="bm-recent-clear" onClick={() => {
                      api.post('/student/recent-files', { clear: true }).catch(()=>{});
                      setRecentFiles([]);
                    }}>Clear</button>
                  </div>
                  <div className="bm-recent-row">
                    {recentFiles.slice(0,8).map(rf => (
                      <button key={rf.fileId} className="bm-recent-chip"
                        onClick={() => {
                          const folder = folders.find(f => f._id === rf.materialId?.toString() || f._id?.toString() === rf.materialId?.toString());
                          if (folder) openFolder(folder);
                        }}
                        title={rf.subjectName ? `${rf.fileName} — ${rf.subjectName}` : rf.fileName}
                      >
                        <FileIcon mimeType={rf.mimeType} size="sm" />
                        <span className="bm-recent-chip-name">{rf.fileName.length > 18 ? rf.fileName.slice(0,16)+'…' : rf.fileName}</span>
                        <span className="bm-recent-chip-sub">{rf.subjectName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <
              <div className="bm-grid">
                {filtered.map(folder => (
                  <div
                    key={folder._id}
                    className={`bm-folder-card ${selectedFolder?._id === folder._id ? 'selected' : ''}`}
                    onDoubleClick={() => openFolder(folder)}
                    onClick={() => openFolder(folder)}
                  >
                    <div className="bm-folder-card-icon">
                      <MdFolder className="bm-folder-icon" />
                    </div>
                    <div className="bm-folder-card-info">
                      <span className="bm-folder-name"><Highlight text={folder.subjectName} query={search} /></span>
                      <span className="bm-folder-meta">{folder.department} · Sem {folder.semester}</span>
                      <span className="bm-folder-meta">{folder.fileCount ?? 0} file(s)</span>
                    </div>
                    {isFaculty && (
                      <div className="bm-folder-card-actions" onClick={e => e.stopPropagation()}>
                        <button title="Copy code" onClick={() => copyCode(folder.accessCode || folder.departmentCode, folder._id)}>
                          {copiedCode === folder._id ? <MdCheck className="bm-action--copied" /> : <MdContentCopy />}
                        </button>
                        <button title="Edit" onClick={() => openEdit(folder)}><MdEdit /></button>
                        <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFolder(folder._id)}><MdDelete /></button>
                      </div>
                    )}
                    {!isFaculty && (
                      <div className="bm-folder-card-actions" onClick={e => e.stopPropagation()}>
                        <button title="Remove from saved" className="bm-action--danger" onClick={() => handleRemoveSaved(folder._id)}>
                          <MdBookmarkRemove />
                        </button>
                      </div>
                    )}
                    <button className="bm-open-btn" onClick={() => openFolder(folder)}>Open →</button>
                  </div>
                ))}
              </div>
            </>
            ) : (
              /* ── List view ── */
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Faculty</th>
                    <th>Files</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(folder => (
                    <tr key={folder._id} onDoubleClick={() => openFolder(folder)} className={selectedFolder?._id === folder._id ? 'selected' : ''}>
                      <td className="bm-table-name">
                        <MdFolder className="bm-folder-icon-sm" />
                        <Highlight text={folder.subjectName} query={search} />
                      </td>
                      <td>{folder.department}</td>
                      <td>Sem {folder.semester}</td>
                      <td>{folder.facultyName}</td>
                      <td>{folder.fileCount ?? 0}</td>
                      <td>{fmtDate(folder.createdAt)}</td>
                      <td className="bm-table-actions" onClick={e => e.stopPropagation()}>
                        <button title="Open" onClick={() => openFolder(folder)}><MdFolderOpen /></button>
                        {isFaculty ? (
                          <>
                            <button title="Edit" onClick={() => openEdit(folder)}><MdEdit /></button>
                            <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFolder(folder._id)}><MdDelete /></button>
                          </>
                        ) : (
                          <button title="Remove from saved" className="bm-action--danger" onClick={() => handleRemoveSaved(folder._id)}><MdBookmarkRemove /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* ── Files inside folder ── */
            <div>
              <div className="bm-folder-header">
                {selectedFolder._activeSubFolder ? (
                  <button className="bm-breadcrumb-back" onClick={() => setSelectedFolder(prev => ({ ...prev, files: prev._parentFiles || [], subFolders: prev._parentSubFolders || [], _activeSubFolder: null, _parentFiles: null, _parentSubFolders: null }))}>
                    <MdArrowBack /> Back to {selectedFolder.subjectName}
                  </button>
                ) : (
                  <button className="bm-breadcrumb-back" onClick={() => { setSelectedFolder(null); setSelectedFile(null); setPreviewFile(null); }}>
                    <MdArrowBack /> Back to Materials
                  </button>
                )}
                {isFaculty && !selectedFolder._activeSubFolder && (
                  <button className="bm-upload-btn" onClick={() => setUploadModal(true)}>
                    <MdUpload /> Upload File
                  </button>
                )}
              </div>

              {/* ── Batch action bar ── */}
              {(selectedFolder.files || []).length > 0 && (
                <div className="bm-batch-bar">
                  <button className="bm-batch-select" onClick={selectAllFiles} title="Select / deselect all">
                    {selectedFiles.size === (selectedFolder.files || []).length && selectedFiles.size > 0
                      ? <><MdDeselect /> Deselect All</>
                      : <><MdSelectAll /> Select All</>
                    }
                  </button>
                  {selectedFiles.size > 0 && (
                    <span className="bm-batch-count">{selectedFiles.size} selected</span>
                  )}
                  {selectedFiles.size > 0 && !isFaculty && (
                    <button className="bm-batch-zip" onClick={handleBatchZip} disabled={batchZipping}>
                      <MdDownloadForOffline />
                      {batchZipping ? 'Zipping…' : `Download ${selectedFiles.size} as ZIP`}
                    </button>
                  )}
                  {selectedFiles.size > 0 && isFaculty && (
                    <button className="bm-batch-delete" onClick={async () => {
                      if (!window.confirm(`Delete ${selectedFiles.size} file(s)?`)) return;
                      for (const fid of selectedFiles) {
                        await api.delete(`/faculty/folders/${selectedFolder._id}/files/${fid}`).catch(()=>{});
                      }
                      setSelectedFiles(new Set());
                      openFolder(selectedFolder);
                    }}>
                      <MdDelete /> Delete {selectedFiles.size} file(s)
                    </button>
                  )}
                </div>
              )}

              {/* Faculty message banner */}
              {selectedFolder.messageToStudents && (
                <div style={{ margin: '0.5rem 0 0.75rem' }}>
                  <MessageBanner message={selectedFolder.messageToStudents} facultyName={selectedFolder.facultyName} />
                </div>
              )}

              {!selectedFolder.files ? (
                <div className="bm-empty"><div className="bm-spinner" /></div>
              ) : (
                <>
                  {/* Sub-folder tiles */}
                  {(selectedFolder.subFolders || []).length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                        📁 Folders
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: '0.6rem' }}>
                        {(selectedFolder.subFolders || []).map(sf => (
                          <div
                            key={sf._id}
                            style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem 0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                            onClick={() => setSelectedFolder(prev => ({ ...prev, files: sf.files || [], _activeSubFolder: sf.name, _parentFiles: prev.files, _parentSubFolders: prev.subFolders }))}
                            title={`Open ${sf.name}`}
                          >
                            <MdFolder style={{ fontSize: '2.4rem', color: '#6366f1' }} />
                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', wordBreak: 'break-word' }}>{sf.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#6366f1' }}>{sf.files?.length || 0} file(s)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Root files */}
                  {selectedFolder.files.length === 0 && (selectedFolder.subFolders || []).length === 0 ? (
                    <div className="bm-empty">
                      <MdInsertDriveFile className="bm-empty-icon" />
                      <p>No files in this material yet</p>
                    </div>
                  ) : selectedFolder.files.length > 0 ? (
                    <>
                      {(selectedFolder.subFolders || []).length > 0 && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                          📄 Files
                        </div>
                      )}
                      {viewMode === 'grid' ? (
                <div className="bm-grid">
                  {selectedFolder.files.map(file => (
                    <div
                      key={file._id}
                      className={`bm-file-card ${selectedFile?._id === file._id ? 'selected' : ''} ${selectedFiles.has(file._id) ? 'bm-file-card--checked' : ''}`}
                      onClick={() => { setSelectedFile(file); setPreviewFile(file); trackRecent(file); }}
                      onDoubleClick={() => {
                        const name = file.name || '';
                        if (isCodeFile(name) || isMdFile(name)) { setPreviewModal(file); }
                        else if (file.previewUrl) { setPreviewModal(file); }
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        className="bm-file-checkbox"
                        checked={selectedFiles.has(file._id)}
                        onChange={e => toggleFileSelect(file._id, e)}
                        onClick={e => e.stopPropagation()}
                        title="Select file"
                      />
                      {/* Star */}
                      {!isFaculty && (
                        <button className={`bm-star-btn ${isStarred(file._id) ? 'bm-star-btn--on' : ''}`}
                          onClick={e => toggleStar(file._id, file, e)} title={isStarred(file._id) ? 'Unstar' : 'Star file'}>
                          {isStarred(file._id) ? <MdStar /> : <MdStarBorder />}
                        </button>
                      )}
                      <div className="bm-file-card-icon">
                        <FileIcon mimeType={file.mimeType} size="lg" />
                      </div>
                      <span className="bm-file-name" title={file.name}>
                        <Highlight text={file.name} query={search} />
                      </span>
                      <span className="bm-file-size">{fmtSize(file.size)}</span>
                      <div className="bm-file-card-actions" onClick={e => e.stopPropagation()}>
                        {(file.previewUrl || isCodeFile(file.name) || isMdFile(file.name)) && (
                          <button title="Preview" onClick={() => setPreviewModal(file)}><MdPreview /></button>
                        )}
                        {file.downloadUrl && <button title="Download" onClick={() => handleDownload(file)}><MdDownload /></button>}
                        {isFaculty && <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFile(selectedFolder._id, file._id)}><MdDelete /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th style={{ width: '2rem' }}></th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFolder.files.map(file => (
                      <tr
                        key={file._id}
                        className={`${selectedFile?._id === file._id ? 'selected' : ''} ${selectedFiles.has(file._id) ? 'bm-row--checked' : ''}`}
                        onClick={() => { setSelectedFile(file); setPreviewFile(file); trackRecent(file); }}
                      >
                        <td style={{ width: '2rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="bm-file-checkbox"
                            checked={selectedFiles.has(file._id)}
                            onChange={e => toggleFileSelect(file._id, e)} />
                        </td>
                        <td className="bm-table-name">
                          <FileIcon mimeType={file.mimeType} size="sm" />
                          <Highlight text={file.name} query={search} />
                        </td>
                        <td>{file.mimeType?.split('/')[1]?.toUpperCase() || '—'}</td>
                        <td>{fmtSize(file.size)}</td>
                        <td>{fmtDate(file.uploadedAt)}</td>
                        <td className="bm-table-actions" onClick={e => e.stopPropagation()}>
                          {(file.previewUrl || isCodeFile(file.name) || isMdFile(file.name)) && (
                            <button title="Preview" onClick={() => setPreviewModal(file)}><MdPreview /></button>
                          )}
                          {!isFaculty && (
                            <button className={`bm-star-btn ${isStarred(file._id) ? 'bm-star-btn--on' : ''}`}
                              onClick={e => toggleStar(file._id, file, e)} title={isStarred(file._id) ? 'Unstar' : 'Star'}>
                              {isStarred(file._id) ? <MdStar /> : <MdStarBorder />}
                            </button>
                          )}
                          {file.downloadUrl && <button title="Download" onClick={() => handleDownload(file)}><MdDownload /></button>}
                          {isFaculty && <button title="Delete" className="bm-action--danger" onClick={() => handleDeleteFile(selectedFolder._id, file._id)}><MdDelete /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Details / Preview panel ── */}
        {infoPanel && (
          <div className="bm-panel">
            {previewFile ? (
              <>
                <div className="bm-panel-header">
                  <span>File Details</span>
                  <button onClick={() => { setPreviewFile(null); setSelectedFile(null); }}><MdClose /></button>
                </div>
                <div className="bm-panel-preview">
                  {previewFile.mimeType?.includes('image') ? (
                    <img src={previewFile.previewUrl} alt={previewFile.name} className="bm-panel-img" />
                  ) : (
                    <div className="bm-panel-file-icon">
                      <FileIcon mimeType={previewFile.mimeType} size="xl" />
                    </div>
                  )}
                </div>
                <div className="bm-panel-info">
                  <p className="bm-panel-filename">{previewFile.name}</p>
                  <div className="bm-panel-row"><span>Size</span><span>{fmtSize(previewFile.size)}</span></div>
                  <div className="bm-panel-row"><span>Type</span><span>{previewFile.mimeType?.split('/')[1]?.toUpperCase() || '—'}</span></div>
                  <div className="bm-panel-row"><span>Uploaded</span><span>{fmtDate(previewFile.uploadedAt)}</span></div>
                  {isFaculty && (
                    <div className="bm-panel-row bm-panel-row--downloads">
                      <span>Downloads</span>
                      <span className="bm-dl-count">
                        <span className="bm-dl-count-num">{previewFile.downloadCount ?? 0}</span>
                        <span className="bm-dl-count-label">times</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="bm-panel-actions">
                  {previewFile.previewUrl  && <button className="bm-panel-btn bm-panel-btn--primary"  onClick={() => setPreviewModal(previewFile)}><MdPreview /> Preview</button>}
                  {previewFile.downloadUrl && <button className="bm-panel-btn bm-panel-btn--secondary" onClick={() => handleDownload(previewFile)}><MdDownload /> Download</button>}
                  {isFaculty               && <button className="bm-panel-btn bm-panel-btn--danger"   onClick={() => handleDeleteFile(selectedFolder._id, previewFile._id)}><MdDelete /> Delete</button>}
                </div>
              </>
            ) : selectedFolder ? (
              <>
                <div className="bm-panel-header"><span>Folder Info</span></div>
                <div className="bm-panel-file-icon"><MdFolderOpen className="bm-folder-icon-xl" /></div>
                <div className="bm-panel-info">
                  <p className="bm-panel-filename">{selectedFolder.subjectName}</p>
                  <div className="bm-panel-row"><span>Department</span><span>{selectedFolder.department}</span></div>
                  <div className="bm-panel-row"><span>Semester</span><span>Sem {selectedFolder.semester}</span></div>
                  <div className="bm-panel-row"><span>Faculty</span><span>{selectedFolder.facultyName}</span></div>
                  <div className="bm-panel-row"><span>Files</span><span>{selectedFolder.files?.length ?? '…'}</span></div>
                  <div className="bm-panel-row"><span>Created</span><span>{fmtDate(selectedFolder.createdAt)}</span></div>
                  {isFaculty && selectedFolder.accessCode && (
                    <div className="bm-panel-row bm-panel-code">
                      <span>Code</span>
                      <span className="bm-code-tag">
                        {selectedFolder.accessCode}
                        <button onClick={() => copyCode(selectedFolder.accessCode, 'panel')}>
                          {copiedCode === 'panel' ? <MdCheck /> : <MdContentCopy />}
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                {isFaculty && (
                  <div className="bm-panel-actions">
                    <button className="bm-panel-btn bm-panel-btn--primary"    onClick={() => openEdit(selectedFolder)}><MdEdit /> Edit Details</button>
                    <button className="bm-panel-btn bm-panel-btn--danger"     onClick={() => handleDeleteFolder(selectedFolder._id)}><MdDelete /> Delete</button>
                  </div>
                )}
                {!isFaculty && (
                  <div className="bm-panel-actions">
                    <button className="bm-panel-btn bm-panel-btn--danger" onClick={() => handleRemoveSaved(selectedFolder._id)}>
                      <MdBookmarkRemove /> Remove Saved
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bm-panel-empty">
                <MdFolder className="bm-panel-empty-icon" />
                <p>Select a folder or file to see details</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="bm-modal-overlay" onClick={() => setEditModal(false)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <h3>Edit Material</h3>
              <button onClick={() => setEditModal(false)}><MdClose /></button>
            </div>
            <div className="bm-modal-body">
              <label>Subject Name</label>
              <input className="bm-input" value={editData.subjectName || ''} onChange={e => setEditData(p => ({ ...p, subjectName: e.target.value }))} />
              <label>Department</label>
              <input className="bm-input" value={editData.department || ''} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} />
              <label>Semester</label>
              <input className="bm-input" value={editData.semester || ''} onChange={e => setEditData(p => ({ ...p, semester: e.target.value }))} />
            </div>
            <div className="bm-modal-footer">
              <button className="bm-btn bm-btn--secondary" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="bm-btn bm-btn--primary" onClick={handleEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline Upload Modal (faculty) ── */}
      {uploadModal && (
        <div className="bm-modal-overlay" onClick={() => { setUploadModal(false); setUploadFiles([]); setUploadSfId(''); setNewSfName(''); }}>
          <div className="bm-modal bm-modal--upload" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <h3>Upload Files — {selectedFolder?.subjectName}</h3>
              <button onClick={() => { setUploadModal(false); setUploadFiles([]); setUploadSfId(''); setNewSfName(''); }}><MdClose /></button>
            </div>
            <div className="bm-modal-body">
              <p className="bm-upload-hint">Max 50 MB per file · PDF, DOC, PPT, XLS, images, video, ZIP</p>

              {/* Destination selector */}
              <label className="bm-upload-label">Upload destination</label>
              <select className="bm-input" value={uploadSfId} onChange={e => setUploadSfId(e.target.value)} style={{ marginBottom: '0.75rem' }}>
                <option value="">📂 Root (no sub-folder)</option>
                {(selectedFolder?.subFolders || []).map(sf => (
                  <option key={sf._id} value={sf._id}>📁 {sf.name} ({sf.files?.length || 0} files)</option>
                ))}
              </select>

              {/* Create sub-folder row */}
              <div className="bm-sf-create-row">
                <MdCreateNewFolder style={{ color: 'var(--bm-accent, #6366f1)', fontSize: '1.1rem', flexShrink: 0 }} />
                <input
                  className="bm-sf-create-input"
                  placeholder="New folder name (e.g. Unit 1, Lab Sheets)"
                  value={newSfName}
                  onChange={e => setNewSfName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSubFolder(); } }}
                  maxLength={60}
                />
                <button className="bm-btn bm-btn--secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
                  onClick={handleCreateSubFolder} disabled={!newSfName.trim() || creatingFolder}>
                  {creatingFolder ? '…' : '+ Create'}
                </button>
              </div>

              {/* Drag-drop zone */}
              <div
                className={`bm-dropzone ${uploadDragging ? 'bm-dropzone--active' : ''}`}
                onDragEnter={e => { e.preventDefault(); setUploadDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setUploadDragging(false); }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setUploadDragging(false); addUploadFiles(e.dataTransfer.files); }}
                onClick={() => document.getElementById('bm-file-input').click()}
              >
                <div className="bm-dropzone-icon">📂</div>
                <p className="bm-dropzone-text">Drag &amp; drop files here</p>
                <p className="bm-dropzone-sub">or click to browse</p>
                <input id="bm-file-input" type="file" multiple style={{ display: 'none' }}
                  onChange={e => addUploadFiles(e.target.files)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.mp4,.mp3" />
              </div>

              {/* File list */}
              {uploadFiles.length > 0 && (
                <div className="bm-upload-filelist">
                  <div className="bm-upload-filelist-header">
                    <span>{uploadFiles.length} file(s) · {fmtUploadSize(uploadFiles.reduce((s,f)=>s+f.size,0))}</span>
                    <button className="bm-clear-btn" onClick={() => setUploadFiles([])}>Clear all</button>
                  </div>
                  {uploadFiles.map((file, i) => (
                    <div key={i} className="bm-upload-file-row">
                      <span>📄</span>
                      <div className="bm-upload-file-info">
                        <div className="bm-upload-file-name">{file.name}</div>
                        <div className="bm-upload-file-size">{fmtUploadSize(file.size)}</div>
                      </div>
                      <button className="bm-remove-file-btn" onClick={() => setUploadFiles(p => p.filter((_,j)=>j!==i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {uploadSfId && (
                <div className="bm-dest-badge">
                  📁 Uploading into: <strong>{selectedFolder?.subFolders?.find(sf=>sf._id===uploadSfId)?.name}</strong>
                </div>
              )}
            </div>
            <div className="bm-modal-footer">
              <button className="bm-btn bm-btn--secondary"
                onClick={() => { setUploadModal(false); setUploadFiles([]); setUploadSfId(''); setNewSfName(''); }}>
                Cancel
              </button>
              <button className="bm-btn bm-btn--primary"
                onClick={handleUploadSubmit}
                disabled={uploading || !uploadFiles.length}>
                {uploading ? `⏳ Uploading ${uploadFiles.length} file(s)…` : `📤 Upload ${uploadFiles.length} file(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-app File Preview — rendered via portal, true top layer ── */}
      {previewModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null); }}
        >
          <div style={{
            width: 'calc(100% - 2rem)', maxWidth: '1100px',
            height: '92vh', background: '#1e293b',
            borderRadius: '12px', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.8)'
          }}>
            {/* Header — just filename + close, no extra buttons */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1.25rem', background: '#0f172a',
              borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0
            }}>
              <span style={{
                flex: 1, color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {previewModal.name}
              </span>
              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', width: '2rem', height: '2rem', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '1.1rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                title="Close (Esc)"
              >✕</button>
            </div>
            {/* Preview body — image / code / markdown / Drive iframe */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
              {previewModal.mimeType?.startsWith('image/') ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
                  <img
                    src={`https://drive.google.com/thumbnail?id=${previewModal.driveFileId}&sz=w2000`}
                    alt={previewModal.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              ) : isCodeFile(previewModal.name) || isMdFile(previewModal.name) ? (
                <NativePreview file={previewModal} isMd={isMdFile(previewModal.name)} />
              ) : (
                <iframe
                  src={previewModal.previewUrl || `https://drive.google.com/file/d/${previewModal.driveFileId}/preview`}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="autoplay"
                  title={previewModal.name}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Download progress toasts ── */}
      {downloads.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
          minWidth: '320px', maxWidth: '420px', width: '90vw',
        }}>
          {downloads.map(dl => (
            <div key={dl.id} style={{
              background: dl.error ? '#fef2f2' : dl.done ? '#f0fdf4' : '#1e293b',
              border: `1px solid ${dl.error ? '#fca5a5' : dl.done ? '#86efac' : '#334155'}`,
              borderRadius: '10px', padding: '0.75rem 1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: dl.done || dl.error ? '0' : '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: dl.error ? '#dc2626' : dl.done ? '#16a34a' : '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                  {dl.error ? '❌ ' : dl.done ? '✅ ' : '⬇️ '}{dl.name}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dl.error ? '#dc2626' : dl.done ? '#16a34a' : '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>
                  {dl.error ? 'Failed' : dl.done ? 'Saved!' : 'Downloading…'}
                </span>
              </div>
              {!dl.done && !dl.error && (
                <div style={{ height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '40%',
                    background: 'linear-gradient(90deg,#6366f1,#818cf8)',
                    borderRadius: '3px',
                    animation: 'bmSlide 1.2s ease-in-out infinite',
                  }} />
                </div>
              )}
              {dl.error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>{dl.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseMaterials;
