/**
 * StorageWidget.jsx  v5 — Sidebar compact only
 * =============================================
 * Shows how much the user has uploaded/saved on StudyShala.
 * Compact bar for the sidebar footer only.
 * No dashboard cards. No platform Drive quota. No user token.
 */

import { useState, useEffect } from 'react';
import { MdUploadFile, MdBookmarkAdded } from 'react-icons/md';
import { ImSpinner8 } from 'react-icons/im';
import api from '../api/axios';
import './StorageWidget.css';

const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / 1024 ** i).toFixed(i >= 2 ? 1 : 0) + ' ' + units[i];
};

const StorageWidget = ({ role = 'student' }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    api.get('/storage/my-studyshala')
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const isFaculty = role === 'faculty' || role === 'admin';
  const bytes     = data?.totalBytes || 0;

  return (
    <div className="sw--compact">
      <div className="sw-compact-header">
        {isFaculty
          ? <MdUploadFile    className="sw-compact-icon" />
          : <MdBookmarkAdded className="sw-compact-icon" />}
        <span className="sw-compact-title">
          {isFaculty ? 'Uploaded on StudyShala' : 'Saved on StudyShala'}
        </span>
        {loading && <ImSpinner8 className="sw-spin sw-compact-spin" />}
      </div>

      {!loading && !error && (
        <>
          <div className="sw-compact-label">{fmtBytes(bytes)}</div>
          <div className="sw-track">
            <div
              className="sw-fill sw-bar--green"
              style={{ width: bytes > 0 ? '100%' : '0%', opacity: bytes > 0 ? 0.55 : 0.15 }}
            />
          </div>
        </>
      )}

      {error && <div className="sw-compact-error">Could not load</div>}
    </div>
  );
};

export default StorageWidget;
