const express = require('express');
const router  = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, isStudent } = require('../middleware/auth');

router.use(authenticate);
router.use(isStudent);

// Access code validation
router.post('/validate-code', studentController.validateAccessCode);

// Save material
router.post('/save-material', studentController.saveMaterial);

// Saved materials
router.get('/saved-materials', studentController.getSavedMaterials);
router.delete('/saved-materials/:id', studentController.removeSavedMaterial);

// Access history
router.get('/access-history', studentController.getAccessHistory);

// Material files (for saved or history items)
router.get('/materials/:id/files', studentController.getMaterialFiles);

// Download
router.get('/materials/:id/files/:fileId/download', studentController.downloadFile);

module.exports = router;
