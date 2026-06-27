const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Only one doc ever exists — use findOneAndUpdate with upsert
  _singleton: { type: String, default: 'settings', unique: true },

  // File upload limits
  maxUploadSizeMB:   { type: Number, default: 50 },  // per file, in MB
  allowedFileTypes:  {
    type: [String],
    default: ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','jpg','jpeg','png','gif','webp','zip','rar','7z','mp4','mp3']
  },

  // Feature flags — disable/enable platform features
  features: {
    studentRegistration:    { type: Boolean, default: true },
    facultyRegistration:    { type: Boolean, default: true },
    fileDownloads:          { type: Boolean, default: true },
    feedbackSubmission:     { type: Boolean, default: true },
    browseMaterials:        { type: Boolean, default: true },
    accessCodeValidation:   { type: Boolean, default: true },
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
