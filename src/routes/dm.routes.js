const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dm.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listDMs);
router.get('/:accountId', ctrl.fetchDMs);

module.exports = router;
