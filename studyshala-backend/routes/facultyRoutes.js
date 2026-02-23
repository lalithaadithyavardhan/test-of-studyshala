const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const facultyController = require('../controllers/facultyController');
const { authenticate, isFaculty } = require('../middleware/auth');

// Multer config - allow multiple files up to 50MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|jpg|jpeg|png|zip|rar|7z|mp4|mp3/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not allowed`));
    }
  }
});

router.use(authenticate);
router.use(isFaculty);

router.get('/folders',     facultyController.getFolders);
router.post('/folders',    facultyController.createFolder);
router.get('/folders/:id', facultyController.getFolderDetails);
router.delete('/folders/:id', facultyController.deleteFolder);

// Multiple file upload - use upload.array('files', 20) for up to 20 files
router.post('/folders/:id/files', upload.array('files', 20), facultyController.uploadFiles);
router.delete('/folders/:id/files/:fileId', facultyController.deleteFile);

module.exports = router;
