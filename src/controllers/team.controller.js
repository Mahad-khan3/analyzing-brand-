const WorkspaceMember = require('../models/WorkspaceMember');
const TeamInvitation = require('../models/TeamInvitation');
const User = require('../models/User');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { randomToken, hashToken } = require('../utils/crypto');
const { sendMail, templates } = require('../services/mail.service');
const { notify } = require('../services/notification.service');
const { audit } = require('../services/audit.service');
const { enforceLimit } = require('../services/subscription.service');

const listMembers = asyncHandler(async (req, res) => {
  const members = await WorkspaceMember.find({ workspace: req.workspace._id })
    .populate('user', 'name email profileImage role')
    .sort({ createdAt: 1 });
  const invitations = await TeamInvitation.find({ workspace: req.workspace._id, status: 'pending' });
  return success(res, 200, { members, invitations }, 'Team members');
});

const inviteMember = asyncHandler(async (req, res) => {
  await enforceLimit(req.workspace._id, 'teamMembers');
  const { email, role } = req.body;
  const normalized = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalized });
  if (existingUser) {
    const already = await WorkspaceMember.findOne({ workspace: req.workspace._id, user: existingUser._id });
    if (already && already.status === 'active') throw ApiError.conflict('User is already a member of this workspace');
  }

  const token = randomToken(32);
  const invitation = await TeamInvitation.create({
    workspace: req.workspace._id,
    invitedBy: req.user._id,
    email: normalized,
    role,
    token: hashToken(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite?token=${token}&email=${encodeURIComponent(normalized)}&workspace=${req.workspace._id}`;
  await sendMail({ to: normalized, ...templates.teamInvite(req.user.name, req.workspace.name, inviteLink) });

  if (existingUser) {
    await notify({
      user: existingUser._id,
      workspace: req.workspace._id,
      type: 'team_invitation',
      title: 'Workspace invitation',
      message: `${req.user.name} invited you to join "${req.workspace.name}"`,
      severity: 'info',
      data: { inviteLink },
    });
  }

  await audit(req, 'team.invited', 'team', { description: `Invited ${normalized} as ${role}` });
  return success(res, 201, { invitation }, 'Invitation sent');
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const { token, workspaceId } = req.body;
  const invitation = await TeamInvitation.findOne({
    token: hashToken(token),
    workspace: workspaceId,
    status: 'pending',
  });
  if (!invitation) throw ApiError.badRequest('Invalid or expired invitation');
  if (invitation.expiresAt < new Date()) throw ApiError.badRequest('Invitation expired');

  const user = await User.findOne({ email: invitation.email });
  if (!user) {
    // User doesn't exist yet — they register then re-accept via invite link.
    return success(res, 200, { requiresRegistration: true, email: invitation.email }, 'Create an account to join');
  }

  await WorkspaceMember.updateOne(
    { workspace: workspaceId, user: user._id },
    { $set: { role: invitation.role, status: 'active', joinedAt: new Date() } },
    { upsert: true }
  );
  invitation.status = 'accepted';
  invitation.invitedUser = user._id;
  invitation.acceptedAt = new Date();
  await invitation.save();

  await notify({ user: user._id, workspace: workspaceId, type: 'team_invitation', title: 'Invitation accepted', message: `You joined "${(await require('../models/Workspace').findById(workspaceId))?.name || 'workspace'}"`, severity: 'success' });
  return success(res, 200, { workspaceId }, 'Invitation accepted');
});

const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (String(userId) === String(req.workspace.owner)) throw ApiError.forbidden('Cannot remove the workspace owner');
  const member = await WorkspaceMember.findOneAndUpdate(
    { workspace: req.workspace._id, user: userId, status: 'active' },
    { status: 'suspended' },
    { new: true }
  );
  if (!member) throw ApiError.notFound('Member not found');
  await audit(req, 'team.removed', 'team', { description: `Removed member ${userId}` });
  return success(res, 200, { member }, 'Member removed');
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['admin', 'editor', 'viewer'].includes(role)) throw ApiError.badRequest('Invalid role');
  const member = await WorkspaceMember.findOneAndUpdate(
    { workspace: req.workspace._id, user: userId },
    { role },
    { new: true }
  );
  if (!member) throw ApiError.notFound('Member not found');
  await audit(req, 'team.role_updated', 'team', { description: `Set role ${role} for ${userId}` });
  return success(res, 200, { member }, 'Role updated');
});

const revokeInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inv = await TeamInvitation.findOneAndUpdate(
    { _id: id, workspace: req.workspace._id, status: 'pending' },
    { status: 'revoked' },
    { new: true }
  );
  if (!inv) throw ApiError.notFound('Invitation not found');
  return success(res, 200, { invitation: inv }, 'Invitation revoked');
});

module.exports = { listMembers, inviteMember, acceptInvitation, removeMember, updateMemberRole, revokeInvitation };
