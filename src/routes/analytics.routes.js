const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.workspaceAnalytics);
router.get('/performance', ctrl.performance);
router.get('/recent', ctrl.recent);
router.post('/sync', ctrl.syncSocialAnalytics);

module.exports = router;
