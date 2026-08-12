const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/activity.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect);

router.get('/me', ctrl.listMyActivities);
router.use(setWorkspace, requireWorkspace);
router.get('/', ctrl.listActivities);

module.exports = router;
