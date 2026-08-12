const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/team.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { inviteValidator, acceptInviteValidator } = require('../validators/content.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listMembers);
router.post('/invite', requireRole('owner', 'admin'), validate(inviteValidator), ctrl.inviteMember);
router.post('/accept', validate(acceptInviteValidator), ctrl.acceptInvitation);
router.patch('/:userId/role', requireRole('owner', 'admin'), ctrl.updateMemberRole);
router.delete('/:userId', requireRole('owner', 'admin'), ctrl.removeMember);
router.post('/invitations/:id/revoke', requireRole('owner', 'admin'), ctrl.revokeInvitation);

module.exports = router;
