const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comments.controller');
const { protect, setWorkspace, requireWorkspace } = require('../middleware/auth');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listComments);
router.get('/content/:contentId', ctrl.fetchComments);

module.exports = router;
