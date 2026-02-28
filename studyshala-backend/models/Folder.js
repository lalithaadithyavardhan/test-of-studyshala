const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({

  fileId: {
    type: String,
    required: true
  },

  fileName: {
    type: String,
    required: true
  },

  previewLink: {
    type: String,
    required: true
  },

  downloadLink: {
    type: String,
    required: true
  }

}, { _id: false });

const folderSchema = new mongoose.Schema({

  facultyId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: 'User',

    required: true

  },

  facultyName: {

    type: String,

    required: true

  },

  subjectName: {

    type: String,

    required: true

  },

  department: {

    type: String,

    required: true

  },

  semester: {

    type: String,

    required: true

  },

  accessCode: {

    type: String,

    required: true,

    index: true

  },

  departmentCode: {

    type: String

  },

  files: {

    type: [fileSchema],

    default: []

  },

  driveUrl: {

    type: String,

    default: ''

  },

  driveFolderId: {

    type: String,

    default: ''

  },

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

folderSchema.index({

  facultyId: 1,

  active: 1

});

folderSchema.index({

  accessCode: 1,

  active: 1

});

folderSchema.index({

  departmentCode: 1,

  active: 1

});

module.exports = mongoose.model('Folder', folderSchema);
