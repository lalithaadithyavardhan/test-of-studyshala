/**
 * StorageWidget.jsx  v4
 * =====================
 * No user token. No scary Google consent screen. Clean and simple.
 *
 * Faculty dashboard shows TWO cards:
 *   Card 1 — Platform Drive bar  (/api/storage/platform-drive)
 *            "How full is StudyShala's shared Drive?"
 *            e.g. 461 MB of 2 TB used — 0%
 *
 *   Card 2 — Your Uploads        (/api/storage/my-studyshala)
 *            "How much have YOU uploaded to StudyShala?"
 *            e.g. 10.5 MB across 13 files, 4 materials
 *
 * Student dashboard shows ONE card:
 *   Card  — Saved Materials      (/api/storage/my-studyshala)
 *           "How much space do your saved materials take up?"
 *           e.g. 32 MB across 8 files, 3 materials saved
 *
 * Sidebar compact: slim version of whichever variant is relevant
 */

import { useState, useEffect } from 'react';
import { MdCloudQueue, MdUploadFile, MdBookmarkAdded, MdRefresh } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import api from '../api/axios';
import './StorageWidget.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / 1024 ** i).toFixed(i >= 2 ? 1 : 0) + ' ' + units[i];
};

const pct = (used, total) => {
  if (!total || total === 0) return 0;
  return Math.min(Math.round((used / total) * 100), 100);
};

const barColorClass = (percent) => {
  if (percent < 60) return 'sw-bar--green';
  if (percent < 85) return 'sw-bar--amber';
  return 'sw-bar--red';
};

// ── Fetch hook ────────────────────────────────────────────────────────────────

const useFetch = (endpoint) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);
  return { data, loading, error, refetch: load };
};

// ── Reusable progress bar ─────────────────────────────────────────────────────

const ProgressBar = ({ used, total, loading }) => {
  const percent  = pct(used, total);
  const colorCls = barColorClass(percent);
  return (
    <div className="sw-bar-wrap">
      <div className="sw-track">
        <div
          className={`sw-fill sw-fill--animated ${colorCls}`}
          style={{ width: loading ? '0%' : `${percent}%` }}
        />
      </div>
      <div className="sw-bar-labels">
        <span className="sw-bar-used">{loading ? '—' : fmtBytes(used)}</span>
        <span className="sw-bar-pct">{loading  ? '—' : `${percent}%`}</span>
        <span className="sw-bar-total">{loading ? '—' : fmtBytes(total)}</span>
      </div>
      {percent >= 85 && !loading && (
        <div className={`sw-alert ${percent >= 95 ? 'sw-alert--red' : 'sw-alert--amber'}`}>
          {percent >= 95 ? '⚠️ Platform Drive almost full! Contact admin.' : '⚡ Platform Drive getting full.'}
        </div>
      )}
    </div>
  );
};

// ── StatPills ─────────────────────────────────────────────────────────────────

const StatPills = ({ pills }) => (
  <div className="sw-stats">
    {pills.map(p => (
      <div key={p.label} className="sw-stat">
        <span className="sw-stat-val">{p.value}</span>
        <span className="sw-stat-lbl">{p.label}</span>
      </div>
    ))}
  </div>
);

// ── Card shell ────────────────────────────────────────────────────────────────

const Card = ({ icon, title, subtitle, onRefresh, loading, error, children }) => (
  <div className="sw sw--full">
    <div className="sw-head">
      <div className="sw-head-left">
        <span className="sw-icon">{icon}</span>
        <div>
          <div className="sw-title">{title}</div>
          <div className="sw-subtitle">{subtitle}</div>
        </div>
      </div>
      <button className="sw-refresh" onClick={onRefresh} disabled={loading} title="Refresh">
        {loading ? <ImSpinner8 className="sw-spin" /> : <MdRefresh />}
      </button>
    </div>
    {error && (
      <div className="sw-error">
        {error}
        <button className="sw-error-retry" onClick={onRefresh}>Retry</button>
      </div>
    )}
    {!error && children}
  </div>
);

// ── Variants ──────────────────────────────────────────────────────────────────

// Card 1: Platform Drive quota (faculty/admin only)
export const PlatformDriveCard = () => {
  const { data, loading, error, refetch } = useFetch('/storage/platform-drive');
  const used  = data?.usageInDrive || 0;
  const total = data?.limit        || 0;
  const trash = data?.usageInDriveTrash || 0;

  return (
    <Card
      icon={<MdCloudQueue />}
      title="Platform Drive"
      subtitle="StudyShala's shared Google Drive storage"
      onRefresh={refetch}
      loading={loading}
      error={error}
    >
      <ProgressBar used={used} total={total} loading={loading} />
      {!loading && data && (
        <StatPills pills={[
          { label: 'Drive files used', value: fmtBytes(used)           },
          { label: 'Free space',       value: fmtBytes(total - used)   },
          { label: 'In trash',         value: fmtBytes(trash)          },
        ]} />
      )}
    </Card>
  );
};

// Card 2: User's personal StudyShala footprint
export const MyStudyshalaCard = ({ role = 'student' }) => {
  const { data, loading, error, refetch } = useFetch('/storage/my-studyshala');
  const bytes     = data?.totalBytes     || 0;
  const files     = data?.totalFiles     || 0;
  const materials = data?.totalMaterials || 0;

  const isFaculty = role === 'faculty' || role === 'admin';

  return (
    <Card
      icon={isFaculty ? <MdUploadFile /> : <MdBookmarkAdded />}
      title={isFaculty ? 'Your Uploads'    : 'Saved Materials'}
      subtitle={isFaculty
        ? 'Files you\'ve uploaded to StudyShala'
        : 'Size of your saved study materials'}
      onRefresh={refetch}
      loading={loading}
      error={error}
    >
      <div className="sw-absolute">
        <span className="sw-absolute-num">
          {loading ? <ImSpinner8 className="sw-spin" /> : fmtBytes(bytes)}
        </span>
        <span className="sw-absolute-label">
          {isFaculty ? 'uploaded to StudyShala' : 'in your saved materials'}
        </span>
      </div>
      {!loading && data && (
        <StatPills pills={[
          { label: isFaculty ? 'Files uploaded'   : 'Files accessible',  value: files     },
          { label: isFaculty ? 'Materials created' : 'Materials saved',   value: materials },
        ]} />
      )}
    </Card>
  );
};

// ── Default export: combined widget (used in dashboards) ─────────────────────

const StorageWidget = ({ role = 'student', size = 'full' }) => {
  const isFaculty = role === 'faculty' || role === 'admin';
  const ss = useFetch('/storage/my-studyshala');

  // ── Compact sidebar ────────────────────────────────────────────────────────
  if (size === 'compact') {
    const bytes = ss.data?.totalBytes || 0;
    return (
      <div className="sw sw--compact">
        <div className="sw-compact-header">
          {isFaculty
            ? <MdUploadFile    className="sw-compact-icon" />
            : <MdBookmarkAdded className="sw-compact-icon" />}
          <span className="sw-compact-title">
            {isFaculty ? 'Your Uploads' : 'Saved Materials'}
          </span>
          {ss.loading && <ImSpinner8 className="sw-spin sw-compact-spin" />}
        </div>
        {!ss.loading && !ss.error && (
          <>
            <div className="sw-compact-label">{fmtBytes(bytes)}</div>
            <div className="sw-track">
              <div className="sw-fill sw-bar--green"
                style={{ width: bytes > 0 ? '100%' : '0%', opacity: bytes > 0 ? 0.5 : 0.15 }} />
            </div>
          </>
        )}
        {ss.error && <div className="sw-compact-error">Could not load</div>}
      </div>
    );
  }

  // ── Full dashboard ─────────────────────────────────────────────────────────
  // Faculty sees both cards; students see just the saved materials card
  if (isFaculty) {
    return (
      <div className="sw-dual">
        <PlatformDriveCard />
        <MyStudyshalaCard role={role} />
      </div>
    );
  }
  return <MyStudyshalaCard role={role} />;
};

export default StorageWidget;
