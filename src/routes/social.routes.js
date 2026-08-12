const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/social.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectSocialValidator } = require('../validators/content.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/platforms', ctrl.getPlatforms);
router.get('/', ctrl.listAccounts);
router.post('/connect', requireRole('owner', 'admin'), validate(connectSocialValidator), ctrl.connectAccount);
router.post('/:id/refresh', requireRole('owner', 'admin'), ctrl.refreshAccount);
router.post('/:id/disconnect', requireRole('owner', 'admin'), ctrl.disconnectAccount);

module.exports = router;
