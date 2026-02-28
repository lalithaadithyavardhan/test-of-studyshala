const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({

  fileId: String,

  fileName: String,

  previewLink: String,

  downloadLink: String

}, { _id: false });

const folderSchema = new mongoose.Schema({

  facultyId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: 'User',

    required: true

  },

  facultyName: String,

  subjectName: String,

  department: String,

  semester: String,

  accessCode: {

    type: String,

    index: true

  },

  departmentCode: String,

  files: {

    type: [fileSchema],

    default: []

  },

  driveUrl: String,

  driveFolderId: String,

  accessCount: {

    type: Number,

    default: 0

  },

  active: {

    type: Boolean,

    default: true

  }

}, {

  timestamps: true

});

folderSchema.index({ facultyId: 1, active: 1 });

folderSchema.index({ accessCode: 1, active: 1 });

folderSchema.index({ departmentCode: 1, active: 1 });

module.exports = mongoose.model('Folder', folderSchema);
