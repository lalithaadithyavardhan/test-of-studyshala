/**
 * StorageWidget.jsx  v2
 * =====================
 * Shows two independent storage bars for any logged-in user:
 *
 *  Bar 1 — "My Google Drive"
 *    Source: /api/storage/my-drive  (calls Drive API with user's own token)
 *    Shows:  total Drive usage / quota (e.g. 2.3 GB of 15 GB)
 *            with a second thin sub-bar showing Gmail+Photos portion
 *
 *  Bar 2 — "StudyShala Usage"
 *    Source: /api/storage/my-studyshala  (MongoDB aggregation)
 *    Faculty: how many MB they've uploaded to StudyShala
 *    Student: how many MB are in their saved materials
 *
 * Size prop:
 *   "full"    — full two-bar card for dashboards
 *   "compact" — slim single-line bar for sidebar footer
 */

import { useState, useEffect } from 'react';
import {
  MdCloudQueue, MdUploadFile, MdBookmarkAdded,
  MdRefresh, MdWarningAmber, MdLogout
} from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import api from '../api/axios';
import './StorageWidget.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Shared fetch hook ─────────────────────────────────────────────────────────

const useFetch = (endpoint) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetch_ = async () => {
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

  useEffect(() => { fetch_(); }, [endpoint]);
  return { data, loading, error, refetch: fetch_ };
};

// ── Sub-components ────────────────────────────────────────────────────────────

// A single progress bar row
const BarRow = ({ label, used, total, loading, colorClass, subUsed, subLabel }) => {
  const percent    = pct(used, total);
  const subPercent = subUsed != null ? pct(subUsed, total) : null;

  return (
    <div className="sw-row">
      <div className="sw-row-header">
        <span className="sw-row-label">{label}</span>
        <span className="sw-row-stat">
          {loading
            ? <ImSpinner8 className="sw-spin sw-spin--sm" />
            : total
              ? <><strong>{fmtBytes(used)}</strong> of {fmtBytes(total)} — {percent}%</>
              : <strong>{fmtBytes(used)}</strong>
          }
        </span>
      </div>

      {/* Main bar */}
      <div className="sw-track">
        <div
          className={`sw-fill sw-fill--animated ${colorClass}`}
          style={{ width: loading ? '0%' : (total ? `${percent}%` : '100%'),
                   opacity: total ? 1 : 0.25 }}
        />
        {/* Sub-portion marker (e.g. Gmail+Photos within total Drive) */}
        {subPercent != null && !loading && total && (
          <div
            className="sw-fill sw-fill--sub"
            style={{ width: `${subPercent}%` }}
            title={`${subLabel}: ${fmtBytes(subUsed)}`}
          />
        )}
      </div>

      {/* Sub-label */}
      {subUsed != null && !loading && total && (
        <div className="sw-row-sublabel">
          <span className="sw-sub-dot" /> {subLabel}: {fmtBytes(subUsed)}
          <span style={{ marginLeft: 'auto' }}>
            Drive files only: {fmtBytes(used - (subUsed || 0))}
          </span>
        </div>
      )}

      {percent >= 85 && !loading && total && (
        <div className={`sw-alert ${percent >= 95 ? 'sw-alert--red' : 'sw-alert--amber'}`}>
          <MdWarningAmber />
          {percent >= 95 ? 'Drive almost full!' : 'Drive getting full — consider freeing space.'}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const StorageWidget = ({ role = 'student', size = 'full' }) => {
  const drive = useFetch('/storage/my-drive');
  const ss    = useFetch('/storage/my-studyshala');

  const refetchAll = () => { drive.refetch(); ss.refetch(); };

  // Drive data
  const driveTotal    = drive.data?.limit         || 0;
  const driveUsed     = drive.data?.usage          || 0;  // all Google (Drive+Gmail+Photos)
  const driveFiles    = drive.data?.usageInDrive   || 0;  // Drive files portion
  const driveTrash    = drive.data?.usageInDriveTrash || 0;
  const drivePct      = pct(driveUsed, driveTotal);
  const driveColorCls = barColorClass(drivePct);

  // StudyShala data
  const ssBytes       = ss.data?.totalBytes    || 0;
  const ssFiles       = ss.data?.totalFiles    || 0;
  const ssMaterials   = ss.data?.totalMaterials || 0;
  const ssLabel       = role === 'student' ? 'Files in saved materials' : 'Files uploaded by you';
  const ssMtLabel     = role === 'student' ? 'Materials saved'          : 'Materials created';

  const needsRelogin  = drive.data?.needsRelogin;

  // ── COMPACT (sidebar) ─────────────────────────────────────────────────────
  if (size === 'compact') {
    const isLoading = drive.loading || ss.loading;
    const drivePctVal = pct(driveUsed, driveTotal);

    return (
      <div className="sw sw--compact">
        {/* Row 1: Drive */}
        <div className="sw-compact-header">
          <MdCloudQueue className="sw-compact-icon" />
          <span className="sw-compact-title">My Drive</span>
          {drive.loading && <ImSpinner8 className="sw-spin sw-compact-spin" />}
        </div>
        {!drive.loading && !needsRelogin && drive.data && (
          <>
            <div className="sw-compact-label">
              {fmtBytes(driveUsed)} / {fmtBytes(driveTotal)}
              <span className="sw-compact-pct">{drivePctVal}%</span>
            </div>
            <div className="sw-track">
              <div className={`sw-fill ${driveColorCls}`} style={{ width: `${drivePctVal}%` }} />
            </div>
          </>
        )}
        {!drive.loading && needsRelogin && (
          <div className="sw-compact-error">Re-login to see quota</div>
        )}

        {/* Row 2: StudyShala */}
        <div className="sw-compact-header" style={{ marginTop: '0.45rem' }}>
          {role === 'student'
            ? <MdBookmarkAdded className="sw-compact-icon" />
            : <MdUploadFile    className="sw-compact-icon" />}
          <span className="sw-compact-title">
            {role === 'student' ? 'Saved' : 'Uploaded'} on StudyShala
          </span>
          {ss.loading && <ImSpinner8 className="sw-spin sw-compact-spin" />}
        </div>
        {!ss.loading && ss.data && (
          <>
            <div className="sw-compact-label">{fmtBytes(ssBytes)}</div>
            <div className="sw-track">
              <div className="sw-fill sw-bar--green sw-fill--indeterminate"
                style={{ width: '100%', opacity: 0.3 }} />
            </div>
          </>
        )}
      </div>
    );
  }

  // ── FULL dashboard card ───────────────────────────────────────────────────
  return (
    <div className="sw sw--full">

      {/* Header */}
      <div className="sw-head">
        <div className="sw-head-left">
          <MdCloudQueue className="sw-icon" />
          <div>
            <div className="sw-title">Storage Overview</div>
            <div className="sw-subtitle">
              Your Google Drive · StudyShala usage
            </div>
          </div>
        </div>
        <button
          className="sw-refresh"
          onClick={refetchAll}
          disabled={drive.loading || ss.loading}
          title="Refresh"
        >
          {(drive.loading || ss.loading)
            ? <ImSpinner8 className="sw-spin" />
            : <MdRefresh />}
        </button>
      </div>

      {/* Needs re-login notice */}
      {needsRelogin && (
        <div className="sw-relogin">
          <MdLogout className="sw-relogin-icon" />
          <div>
            <div className="sw-relogin-title">Drive quota unavailable</div>
            <div className="sw-relogin-sub">
              {drive.data?.message || 'Log out and log back in once to enable this.'}
            </div>
          </div>
        </div>
      )}

      {/* Fetch error */}
      {drive.error && !needsRelogin && (
        <div className="sw-error">
          {drive.error}
          <button className="sw-error-retry" onClick={drive.refetch}>Retry</button>
        </div>
      )}

      {/* ── Bar 1: Personal Google Drive ── */}
      {!needsRelogin && !drive.error && (
        <BarRow
          label="My Google Drive"
          used={driveUsed}
          total={driveTotal}
          loading={drive.loading}
          colorClass={driveColorCls}
          subUsed={driveUsed - driveFiles}
          subLabel="Gmail + Photos"
        />
      )}

      {/* Divider */}
      <div className="sw-divider" />

      {/* ── Bar 2: StudyShala usage ── */}
      {ss.error && (
        <div className="sw-error">
          {ss.error}
          <button className="sw-error-retry" onClick={ss.refetch}>Retry</button>
        </div>
      )}

      {!ss.error && (
        <>
          <div className="sw-row">
            <div className="sw-row-header">
              <span className="sw-row-label">
                {role === 'student'
                  ? '📚 StudyShala — Saved Materials'
                  : '📤 StudyShala — Your Uploads'}
              </span>
              <span className="sw-row-stat">
                {ss.loading
                  ? <ImSpinner8 className="sw-spin sw-spin--sm" />
                  : <strong>{fmtBytes(ssBytes)}</strong>}
              </span>
            </div>

            {/* Purely informational bar — no hard cap, shows filled */}
            <div className="sw-track">
              {ss.loading
                ? <div className="sw-fill sw-bar--green" style={{ width: '0%' }} />
                : <div className="sw-fill sw-bar--green sw-fill--animated"
                       style={{ width: ssBytes > 0 ? '100%' : '0%', opacity: ssBytes > 0 ? 0.6 : 0.15 }} />
              }
            </div>
          </div>

          {/* Stat pills */}
          {!ss.loading && ss.data && (
            <div className="sw-stats">
              <div className="sw-stat">
                <span className="sw-stat-val">{ssFiles}</span>
                <span className="sw-stat-lbl">{ssLabel}</span>
              </div>
              <div className="sw-stat">
                <span className="sw-stat-val">{ssMaterials}</span>
                <span className="sw-stat-lbl">{ssMtLabel}</span>
              </div>
              {driveTotal > 0 && !drive.loading && !needsRelogin && (
                <div className="sw-stat">
                  <span className="sw-stat-val">{fmtBytes(driveTotal - driveUsed)}</span>
                  <span className="sw-stat-lbl">Drive free space</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StorageWidget;
