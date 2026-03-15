/**
 * Folder (Material) model  v3
 * ============================
 * Added: isAdminCourse — marks materials created by admin as public courses
 *        accessible to all students/faculty without an access code.
 */
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  originalName:  { type: String, required: true },
  mimeType:      { type: String, required: true },
  size:          { type: Number, required: true },
  driveFileId:   { type: String },
  uploadedAt:    { type: Date, default: Date.now },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  downloadCount: { type: Number, default: 0 }
});

const subFolderSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  driveSubFolderId: { type: String, default: null },
  files:            [fileSchema],
  createdAt:        { type: Date, default: Date.now }
});

const folderSchema = new mongoose.Schema({
  facultyId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facultyName:       { type: String, required: true },
  subjectName:       { type: String, required: true },
  department:        { type: String, required: true },
  semester:          { type: String, required: true },
  accessCode:        { type: String, index: true },
  departmentCode:    { type: String },
  permission:        { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  files:             [fileSchema],
  subFolders:        { type: [subFolderSchema], default: [] },
  messageToStudents: { type: String, default: '', maxlength: 2000 },
  driveUrl:          { type: String, default: '#' },
  driveFolderId:     { type: String, default: 'local' },
  accessCount:       { type: Number, default: 0 },
  active:            { type: Boolean, default: true },
  // NEW: admin-created public courses — no access code required
  isAdminCourse:     { type: Boolean, default: false },
  courseCategory:    { type: String, default: '' }, // e.g. Timetable, Regulation, Universal
}, { timestamps: true });

folderSchema.index({ facultyId: 1, active: 1 });
folderSchema.index({ accessCode: 1, active: 1 });
folderSchema.index({ departmentCode: 1, active: 1 });
folderSchema.index({ isAdminCourse: 1, active: 1 });

module.exports = mongoose.model('Folder', folderSchema);
