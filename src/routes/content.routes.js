const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/content.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const { loadContent } = require('../middleware/resource');
const validate = require('../middleware/validate');
const { createContentValidator, updateContentValidator, scheduleValidator } = require('../validators/content.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listContent);
router.post('/', requireRole('owner', 'admin', 'editor'), validate(createContentValidator), ctrl.createContent);

router.use('/:id', loadContent);

router.get('/:id', ctrl.getContent);
router.put('/:id', requireRole('owner', 'admin', 'editor'), validate(updateContentValidator), ctrl.updateContent);
router.delete('/:id', requireRole('owner', 'admin', 'editor'), ctrl.deleteContent);
router.post('/:id/duplicate', requireRole('owner', 'admin', 'editor'), ctrl.duplicateContent);
router.post('/:id/schedule', requireRole('owner', 'admin', 'editor'), validate(scheduleValidator), ctrl.scheduleContent);
router.post('/:id/cancel-schedule', requireRole('owner', 'admin', 'editor'), ctrl.cancelSchedule);
router.post('/:id/publish-now', requireRole('owner', 'admin', 'editor'), ctrl.publishNow);
router.post('/:id/retry', requireRole('owner', 'admin', 'editor'), ctrl.retryPublish);

module.exports = router;
