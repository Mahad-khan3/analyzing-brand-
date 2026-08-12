const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/media.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listMedia);
router.post('/', upload.single('file'), ctrl.uploadMedia);
router.delete('/:id', ctrl.deleteMedia);

module.exports = router;
