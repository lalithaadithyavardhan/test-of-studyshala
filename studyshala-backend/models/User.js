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
  departmentCode: String,  // legacy - current active code
  
  // Student-specific fields
  savedMaterials: [savedMaterialSchema],
  accessHistory: [accessHistorySchema],
  
  active: { type: Boolean, default: true },
  profilePicture: String,
  lastLogin: Date
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });
userSchema.index({ 'savedMaterials.materialId': 1 });

module.exports = mongoose.model('User', userSchema);
