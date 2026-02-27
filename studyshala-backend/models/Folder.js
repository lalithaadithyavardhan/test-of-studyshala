const mongoose = require('mongoose');

// Updated to include only the requested fields and links
const fileSchema = new mongoose.Schema({
  fileId:       { type: String },
  fileName:     { type: String },
  previewLink:  { type: String },
  downloadLink: { type: String }
});

const folderSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Manual faculty name entry (not auto-pulled from User)
  facultyName:    { type: String, required: true },
  
  subjectName:    { type: String, required: true },
  department:     { type: String, required: true },
  semester:       { type: String, required: true },
  accessCode:     { type: String, index: true },
  departmentCode: { type: String },
  
  // NOTE: The permission field has been completely removed
  
  files:          [fileSchema],
  driveUrl:       { type: String, default: '#' },
  driveFolderId:  { type: String, default: 'local' },
  accessCount:    { type: Number, default: 0 },
  active:         { type: Boolean, default: true }
}, { timestamps: true });

folderSchema.index({ facultyId: 1, active: 1 });
folderSchema.index({ accessCode: 1, active: 1 });
folderSchema.index({ departmentCode: 1, active: 1 });

module.exports = mongoose.model('Folder', folderSchema);
