const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscription.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upgradeValidator, changePlanValidator } = require('../validators/content.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.getSubscription);
router.post('/upgrade', requireRole('owner', 'admin'), validate(upgradeValidator), ctrl.upgradePlan);
router.post('/plan', requireRole('owner', 'admin'), validate(changePlanValidator), ctrl.changePlan);
router.post('/cancel', requireRole('owner', 'admin'), ctrl.cancelSubscription);

module.exports = router;
