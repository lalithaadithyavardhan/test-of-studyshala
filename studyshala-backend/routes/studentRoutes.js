const express = require('express');
const router  = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, isStudent } = require('../middleware/auth');

router.use(authenticate);
router.use(isStudent);

router.post('/validate-code',              studentController.validateAccessCode);
router.post('/save-material',              studentController.saveMaterial);
router.get('/saved-materials',             studentController.getSavedMaterials);
router.delete('/saved-materials/:id',      studentController.removeSavedMaterial);
router.get('/access-history',              studentController.getAccessHistory);
router.get('/materials/:id/files',         studentController.getMaterialFiles);
// FIX: redirects to Google Drive public URL — no REFRESH_TOKEN needed
router.get('/materials/:id/files/:fileId/download', studentController.downloadFile);

module.exports = router;
