const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/library.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listAssets);
router.post('/', ctrl.createAsset);
router.put('/:id', ctrl.updateAsset);
router.delete('/:id', ctrl.deleteAsset);

module.exports = router;
