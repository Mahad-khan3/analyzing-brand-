const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workspace.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createWorkspaceValidator, updateWorkspaceValidator } = require('../validators/app.validators');

router.use(protect);

router.get('/', ctrl.getMyWorkspaces);

router.post('/', validate(createWorkspaceValidator), ctrl.createWorkspace);

router.use('/:workspaceId', setWorkspace, requireWorkspace);

router.get('/:workspaceId', ctrl.getWorkspace);
router.put('/:workspaceId', requireRole('owner', 'admin'), validate(updateWorkspaceValidator), ctrl.updateWorkspace);
router.delete('/:workspaceId', requireRole('owner'), ctrl.deleteWorkspace);
router.post('/:workspaceId/switch', ctrl.switchWorkspace);

module.exports = router;
