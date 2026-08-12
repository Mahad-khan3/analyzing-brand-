const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/scheduler.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/status', ctrl.status);
router.get('/jobs/:jobId', ctrl.jobStatus);

module.exports = router;
