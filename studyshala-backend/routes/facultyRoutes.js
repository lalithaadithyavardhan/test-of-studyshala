const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const facultyController = require('../controllers/facultyController');
const { authenticate, isFaculty } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },   // 50 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|jpg|jpeg|png|gif|webp|zip|rar|7z|mp4|mp3/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    allowed.test(ext) ? cb(null, true) : cb(new Error(`File type .${ext} not allowed`));
  }
});

router.use(authenticate);
router.use(isFaculty);

router.get('/folders',                                        facultyController.getFolders);
router.post('/folders',                                       facultyController.createFolder);
router.get('/folders/:id',                                    facultyController.getFolderDetails);
router.delete('/folders/:id',                                 facultyController.deleteFolder);
router.post('/folders/:id/files', upload.array('files', 20), facultyController.uploadFiles);
router.delete('/folders/:id/files/:fileId',                   facultyController.deleteFile);
// Faculty can also download their own files via redirect
router.get('/folders/:id/files/:fileId/download',             facultyController.downloadFile);

module.exports = router;
