/* ═══════════════════════════════════════════════════════════════════════════
   StudyShala — StudentFileBrowser Styles  (Dark Theme)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Layout ─────────────────────────────────────────────────────────────── */
.file-browser-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: #121212;
  color: #e0e0e0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

/* ── Loading Screen ─────────────────────────────────────────────────────── */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100vh;
  font-size: 1.1rem;
  color: #3b82f6;
  background-color: #121212;
}

/* Spinner animation */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2a2a2d;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error / Empty State ────────────────────────────────────────────────── */
.error-state {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  max-width: 420px;
}

.error-icon {
  font-size: 48px;
}

.error-state p {
  color: #ccc;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

/* Inline non-fatal error toast */
.inline-error-toast {
  background-color: rgba(239, 68, 68, 0.12);
  border-left: 3px solid #ef4444;
  color: #fca5a5;
  padding: 10px 20px;
  font-size: 13px;
}

/* ── LEFT PANE ──────────────────────────────────────────────────────────── */
.file-list-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1c;
  border-right: 1px solid #2d2d30;
  min-width: 0; /* prevent flex overflow */
}

/* Header bar */
.file-browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid #2d2d30;
  background-color: #1a1a1c;
  flex-wrap: wrap;
  gap: 10px;
}

/* Breadcrumbs */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #888;
  min-width: 0;
}

.breadcrumb-link {
  cursor: pointer;
  transition: color 0.2s;
  white-space: nowrap;
}

.breadcrumb-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

.breadcrumb-sep {
  color: #555;
  font-size: 16px;
}

.current-path {
  color: #f0f0f0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

/* Action buttons row */
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.action-divider {
  width: 1px;
  height: 24px;
  background-color: #3a3a3d;
  margin: 0 4px;
}

/* Material meta strip */
.material-meta-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  background-color: #161618;
  border-bottom: 1px solid #2d2d30;
  font-size: 12px;
  color: #888;
  overflow-x: auto;
  white-space: nowrap;
}

.material-meta-strip span:first-child {
  color: #bbb;
  font-weight: 500;
}

.meta-sep {
  color: #444;
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
.btn-outline {
  background: transparent;
  border: 1px solid #484848;
  color: #ccc;
  padding: 7px 13px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s;
  white-space: nowrap;
}

.btn-outline:hover:not(:disabled) {
  background: #272729;
  border-color: #777;
  color: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  color: #fff;
  padding: 7px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.18s;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.88;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

/* Save feedback variants */
.btn-success {
  background: linear-gradient(135deg, #16a34a, #15803d) !important;
}

.btn-muted {
  background: #374151 !important;
}

button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.fullscreen-hint-btn {
  margin-top: 12px;
  width: 100%;
  justify-content: center;
}

/* ── File list column headers ───────────────────────────────────────────── */
.file-list-header {
  display: flex;
  align-items: center;
  padding: 9px 24px;
  background-color: #161618;
  border-bottom: 1px solid #2d2d30;
  font-size: 11px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  user-select: none;
}

.master-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #3b82f6;
  cursor: pointer;
}

/* Column widths */
.col-checkbox { width: 40px; flex-shrink: 0; display: flex; align-items: center; }
.col-icon     { width: 52px; flex-shrink: 0; text-align: center; }
.col-name     { flex: 2; min-width: 0; }
.col-date     { flex: 1; min-width: 90px; }
.col-size     { width: 90px; flex-shrink: 0; text-align: right; }

/* ── File rows ──────────────────────────────────────────────────────────── */
.file-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 20px;
}

/* Scrollbar styling */
.file-list-container::-webkit-scrollbar { width: 6px; }
.file-list-container::-webkit-scrollbar-track { background: transparent; }
.file-list-container::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
.file-list-container::-webkit-scrollbar-thumb:hover { background: #555; }

.file-row {
  display: flex;
  align-items: center;
  padding: 11px 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, border-left 0.15s;
  border-left: 3px solid transparent;
  user-select: none;
}

.file-row:hover {
  background-color: #222224;
}

.file-row.selected {
  background-color: rgba(37, 99, 235, 0.13);
}

.file-row.active-preview {
  background-color: #242427;
  border-left: 3px solid #3b82f6;
}

.file-row.downloading {
  opacity: 0.6;
  pointer-events: none;
}

/* Checkbox inside row */
.col-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #3b82f6;
  cursor: pointer;
  margin-left: 2px;
}

.file-icon {
  font-size: 22px;
  line-height: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-badge {
  font-size: 11px;
  color: #60a5fa;
  margin-left: 8px;
  font-weight: 400;
}

.col-date {
  font-size: 12px;
  color: #888;
}

.col-size {
  font-size: 12px;
  color: #888;
  text-align: right;
}

/* Empty folder */
.empty-folder {
  text-align: center;
  margin-top: 80px;
  color: #555;
}

.empty-icon {
  font-size: 52px;
  margin-bottom: 14px;
}

.empty-folder p {
  font-size: 15px;
  color: #666;
}

/* ── RIGHT PANE (Preview) ───────────────────────────────────────────────── */
.file-preview-pane {
  width: 380px;
  flex-shrink: 0;
  background-color: #1c1c1f;
  border-left: 1px solid #2d2d30;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 18px;
  border-bottom: 1px solid #2d2d30;
  background-color: #161618;
  flex-shrink: 0;
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ccc;
  letter-spacing: 0.3px;
}

.close-preview {
  background: none;
  border: none;
  color: #666;
  font-size: 17px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  line-height: 1;
}

.close-preview:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  /* BUG FIX: Original height was fixed at 350px. When the preview pane is
     taller than that, the iframe didn't fill the space. Now it uses flex-grow
     so it expands to fill available height. */
  flex: 1;
  min-height: 200px;
  border: none;
  border-bottom: 1px solid #2d2d30;
  background-color: #fff; /* White background for transparent PDFs */
}

.preview-details {
  padding: 16px 18px;
  overflow-y: auto;
  flex-shrink: 0;
}

.preview-details h4 {
  margin: 0 0 14px 0;
  color: #eee;
  font-size: 14px;
  word-break: break-all;
  line-height: 1.4;
}

.preview-details p {
  display: flex;
  gap: 8px;
  color: #999;
  font-size: 12px;
  margin: 6px 0;
  border-bottom: 1px solid #2a2a2d;
  padding-bottom: 6px;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 56px;
}

.empty-preview,
.no-preview-available {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  padding: 30px 20px;
  text-align: center;
  gap: 10px;
}

.empty-preview-icon,
.no-preview-icon {
  font-size: 36px;
  line-height: 1;
}

.empty-preview p,
.no-preview-available p {
  font-size: 14px;
  color: #777;
  margin: 0;
}

.empty-preview small,
.no-preview-available small {
  font-size: 12px;
  color: #555;
}

/* ── FULL SCREEN MODAL ──────────────────────────────────────────────────── */

/*
  BUG FIX: The original .full-screen-modal was a flex column that occupied
  the whole viewport but had no distinct backdrop / dialog separation.
  Clicking "outside" did nothing. We now split it into a backdrop (.full-screen-modal)
  and a centered dialog (.full-screen-dialog) so backdrop clicks close the modal,
  and the layout is more robust.
*/
.full-screen-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(6, 6, 8, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.full-screen-dialog {
  width: 100%;
  height: 100%;
  max-width: 1200px;
  max-height: calc(100vh - 40px);
  background-color: #1a1a1c;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.18s ease;
}

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.full-screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background-color: #161618;
  border-bottom: 1px solid #2d2d30;
  flex-shrink: 0;
}

.full-screen-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #ddd;
  overflow: hidden;
}

.full-screen-title span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.full-screen-close {
  background: #ef4444;
  color: white;
  border: none;
  padding: 7px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s;
  flex-shrink: 0;
}

.full-screen-close:hover {
  background: #dc2626;
}

.full-screen-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.full-screen-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: #fff;
}

.fullscreen-no-preview {
  flex: 1;
  font-size: 16px;
}

/* ── Responsive adjustments ─────────────────────────────────────────────── */
@media (max-width: 900px) {
  .file-preview-pane {
    display: none; /* hide on small screens; use fullscreen instead */
  }

  .file-browser-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .current-path {
    max-width: 160px;
  }
}

@media (max-width: 600px) {
  .col-date { display: none; }
  .col-size { display: none; }
  .file-browser-header { padding: 12px 14px; }
  .material-meta-strip { padding: 7px 14px; }
  .file-list-header { padding: 8px 14px; }
}
