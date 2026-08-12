const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.patch('/users/:userId', ctrl.updateUser);
router.get('/workspaces', ctrl.listWorkspaces);
router.get('/brands', ctrl.listBrands);
router.get('/ai-usage', ctrl.listAIUsage);
router.get('/subscriptions', ctrl.listSubscriptions);
router.get('/logs', ctrl.listLogs);

module.exports = router;
