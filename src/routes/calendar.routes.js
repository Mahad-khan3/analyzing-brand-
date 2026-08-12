const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/calendar.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');
const { loadContent } = require('../middleware/resource');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.calendarData);
router.patch('/:id/reschedule', loadContent, ctrl.reschedule);

module.exports = router;
