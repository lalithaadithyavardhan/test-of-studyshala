/**
 * StorageWidget.jsx
 * =================
 * Three widget variants driven by the `variant` prop:
 *
 *  "drive"    — Platform-wide Google Drive quota bar (faculty / admin)
 *  "faculty"  — Faculty's own upload footprint from MongoDB
 *  "student"  — Student's saved-materials footprint from MongoDB
 *
 * Size prop:
 *  "full"     — full card for dashboards (default)
 *  "compact"  — slim bar for the sidebar footer
 */

import { useState, useEffect } from 'react';
import { MdCloudQueue, MdUpload, MdBookmark, MdRefresh } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import api from '../api/axios';
import './StorageWidget.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / 1024 ** i).toFixed(i >= 2 ? 1 : 0) + ' ' + units[i];
};

const pct = (used, total) => {
  if (!total) return 0;
  return Math.min(Math.round((used / total) * 100), 100);
};

// Colour ramp: green → amber → red
const barColor = (percent) => {
  if (percent < 60) return 'sw-bar--green';
  if (percent < 85) return 'sw-bar--amber';
  return 'sw-bar--red';
};

// ── Config per variant ────────────────────────────────────────────────────────

const VARIANTS = {
  drive: {
    endpoint:    '/storage',
    icon:        <MdCloudQueue />,
    title:       'Platform Drive',
    subtitle:    'Shared Google Drive space',
    getUsed:     (d) => d.usageInDrive,
    getTotal:    (d) => d.limit,
    statLabel:   (d) => `${fmtBytes(d.usageInDrive)} used of ${fmtBytes(d.limit)}`,
    extraStats:  (d) => d.usage !== d.usageInDrive
      ? [{ label: 'Total Google usage', value: fmtBytes(d.usage) }]
      : [],
  },
  faculty: {
    endpoint:    '/storage/faculty-footprint',
    icon:        <MdUpload />,
    title:       'Your Uploads',
    subtitle:    'Files you\'ve uploaded to StudyShala',
    getUsed:     (d) => d.totalBytes,
    getTotal:    () => null,   // no hard cap — show absolute numbers
    statLabel:   (d) => fmtBytes(d.totalBytes),
    extraStats:  (d) => [
      { label: 'Files uploaded',    value: d.totalFiles    },
      { label: 'Materials created', value: d.totalMaterials },
    ],
  },
  student: {
    endpoint:    '/storage/student-footprint',
    icon:        <MdBookmark />,
    title:       'Saved Materials',
    subtitle:    'Size of your saved study materials',
    getUsed:     (d) => d.totalBytes,
    getTotal:    () => null,
    statLabel:   (d) => fmtBytes(d.totalBytes),
    extraStats:  (d) => [
      { label: 'Files accessible',   value: d.totalFiles    },
      { label: 'Materials saved',    value: d.totalMaterials },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const StorageWidget = ({ variant = 'drive', size = 'full' }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cfg = VARIANTS[variant];

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(cfg.endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load storage info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [variant]);

  const used    = data ? cfg.getUsed(data)  : 0;
  const total   = data ? cfg.getTotal(data) : null;
  const percent = total ? pct(used, total)  : null;
  const barCls  = percent !== null ? barColor(percent) : 'sw-bar--green';

  // ── Compact sidebar variant ──────────────────────────────────────────────
  if (size === 'compact') {
    return (
      <div className="sw sw--compact">
        <div className="sw-compact-header">
          <span className="sw-compact-icon">{cfg.icon}</span>
          <span className="sw-compact-title">{cfg.title}</span>
          {loading && <ImSpinner8 className="sw-spin sw-compact-spin" />}
        </div>

        {!loading && !error && data && (
          <>
            <div className="sw-compact-label">
              {cfg.statLabel(data)}
              {percent !== null && <span className="sw-compact-pct">{percent}%</span>}
            </div>
            {percent !== null && (
              <div className="sw-track">
                <div
                  className={`sw-fill ${barCls}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
            {percent === null && (
              <div className="sw-track">
                <div
                  className="sw-fill sw-bar--green sw-fill--indeterminate"
                  style={{ width: '100%', opacity: 0.35 }}
                />
              </div>
            )}
          </>
        )}

        {!loading && error && (
          <div className="sw-compact-error">{error}</div>
        )}
      </div>
    );
  }

  // ── Full dashboard card ──────────────────────────────────────────────────
  return (
    <div className="sw sw--full">
      <div className="sw-head">
        <div className="sw-head-left">
          <span className="sw-icon">{cfg.icon}</span>
          <div>
            <div className="sw-title">{cfg.title}</div>
            <div className="sw-subtitle">{cfg.subtitle}</div>
          </div>
        </div>
        <button
          className="sw-refresh"
          onClick={fetchData}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh storage info"
        >
          {loading
            ? <ImSpinner8 className="sw-spin" />
            : <MdRefresh />}
        </button>
      </div>

      {error && (
        <div className="sw-error">
          {error} <button className="sw-error-retry" onClick={fetchData}>Retry</button>
        </div>
      )}

      {!error && (
        <>
          {/* Progress bar (only when there's a total) */}
          {percent !== null && (
            <div className="sw-bar-wrap">
              <div className="sw-track sw-track--full">
                <div
                  className={`sw-fill ${barCls} sw-fill--animated`}
                  style={{ width: loading ? '0%' : `${percent}%` }}
                />
              </div>
              <div className="sw-bar-labels">
                <span className="sw-bar-used">
                  {loading ? '—' : fmtBytes(used)}
                </span>
                <span className="sw-bar-pct">
                  {loading ? '—' : `${percent}%`}
                </span>
                <span className="sw-bar-total">
                  {loading ? '—' : fmtBytes(total)}
                </span>
              </div>
            </div>
          )}

          {/* Absolute footprint display (no total) */}
          {percent === null && (
            <div className="sw-absolute">
              <span className="sw-absolute-num">
                {loading ? <ImSpinner8 className="sw-spin" /> : fmtBytes(used)}
              </span>
              <span className="sw-absolute-label">stored on StudyShala</span>
            </div>
          )}

          {/* Extra stat pills */}
          {!loading && data && cfg.extraStats(data).length > 0 && (
            <div className="sw-stats">
              {cfg.extraStats(data).map((s) => (
                <div key={s.label} className="sw-stat">
                  <span className="sw-stat-val">{s.value}</span>
                  <span className="sw-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warning when Drive is nearly full */}
          {!loading && percent !== null && percent >= 85 && (
            <div className={`sw-alert ${percent >= 95 ? 'sw-alert--red' : 'sw-alert--amber'}`}>
              {percent >= 95
                ? '⚠️ Drive almost full! Delete old materials or contact admin.'
                : '⚡ Drive getting full. Consider cleaning up old materials.'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StorageWidget;
