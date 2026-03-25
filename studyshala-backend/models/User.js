const mongoose = require('mongoose');

const savedMaterialSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  savedAt: { type: Date, default: Date.now }
});

const accessHistorySchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  accessCode: { type: String, required: true },
  accessedAt: { type: Date, default: Date.now }
});

const recentFileSchema = new mongoose.Schema({
  fileId:     { type: String, required: true },   
  fileName:   { type: String, required: true },
  mimeType:   { type: String, default: '' },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  subjectName:{ type: String, default: '' },
  viewedAt:   { type: Date,   default: Date.now }
});

const starredFileSchema = new mongoose.Schema({
  fileId:     { type: String, required: true },
  fileName:   { type: String, required: true },
  mimeType:   { type: String, default: '' },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  subjectName:{ type: String, default: '' },
  starredAt:  { type: Date,   default: Date.now }
});

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  department: String,
  semester: String,
  departmentCode: String,  

  token: { type: String, default: null },
  googleRefreshToken: { type: String, default: null }, // 👈 Added for 'offline' access support

  savedMaterials: [savedMaterialSchema],
  accessHistory:  { type: [accessHistorySchema], default: [] },
  recentFiles:    { type: [recentFileSchema], default: [] },   
  starredFiles:   { type: [starredFileSchema], default: [] },  
  
  tourCompleted:       { type: Boolean, default: false }, 
  phase2TourCompleted: { type: Boolean, default: false }, 
  active: { type: Boolean, default: true },
  profilePicture: String,
  lastLogin: Date
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });
userSchema.index({ 'savedMaterials.materialId': 1 });

module.exports = mongoose.model('User', userSchema);
