/**
 * Folder (Material) model
 * ========================
 * "permission" field is kept for schema compatibility but is always 'view'.
 * The UI permission dropdown has been removed — all materials are always
 * anyoneWithLink reader on Google Drive.
 */
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType:     { type: String, required: true },
  size:         { type: Number, required: true },
  driveFileId:  { type: String },       // Google Drive file ID (primary key for access)
  uploadedAt:   { type: Date, default: Date.now },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const folderSchema = new mongoose.Schema({
  facultyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facultyName:  { type: String, required: true },
  subjectName:  { type: String, required: true },
  department:   { type: String, required: true },
  semester:     { type: String, required: true },
  accessCode:   { type: String, index: true },
  departmentCode: { type: String },
  permission:   { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  files:        [fileSchema],
  driveUrl:     { type: String, default: '#' },
  driveFolderId:{ type: String, default: 'local' },
  accessCount:  { type: Number, default: 0 },
  active:       { type: Boolean, default: true }
}, { timestamps: true });

folderSchema.index({ facultyId: 1, active: 1 });
folderSchema.index({ accessCode: 1, active: 1 });
folderSchema.index({ departmentCode: 1, active: 1 });

module.exports = mongoose.model('Folder', folderSchema);
