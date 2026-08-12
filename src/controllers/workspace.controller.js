const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Brand = require('../models/Brand');
const Subscription = require('../models/Subscription');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateNanoId } = require('../utils/crypto');
const { audit } = require('../services/audit.service');
const { getOrCreateSubscription } = require('../services/subscription.service');

const getMyWorkspaces = asyncHandler(async (req, res) => {
  const memberships = await WorkspaceMember.find({ user: req.user._id, status: 'active' })
    .populate('workspace')
    .sort({ createdAt: -1 });
  const data = memberships.map((m) => ({ ...m.workspace.toObject(), role: m.role }));
  return success(res, 200, { workspaces: data }, 'Workspaces');
});

const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws'}-${generateNanoId(4)}`;

  const workspace = await Workspace.create({ name, description, owner: req.user._id, slug });
  await WorkspaceMember.create({ workspace: workspace._id, user: req.user._id, role: 'owner', status: 'active', joinedAt: new Date() });
  await Subscription.create({ workspace: workspace._id });

  await audit(req, 'workspace.created', 'settings', { workspace, description: `Created workspace "${name}"` });
  return success(res, 201, { workspace }, 'Workspace created');
});

const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = req.workspace;
  const [brands, members, subscription] = await Promise.all([
    Brand.find({ workspace: workspace._id, isActive: true }).sort({ createdAt: -1 }),
    WorkspaceMember.find({ workspace: workspace._id }).populate('user', 'name email profileImage').sort({ createdAt: 1 }),
    getOrCreateSubscription(workspace._id),
  ]);
  return success(res, 200, { workspace, brands, members, subscription }, 'Workspace detail');
});

const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description, settings } = req.body;
  const workspace = req.workspace;
  if (name) workspace.name = name;
  if (description !== undefined) workspace.description = description;
  if (settings) workspace.settings = { ...workspace.settings?.toObject?.() || {}, ...settings };
  await workspace.save();
  await audit(req, 'workspace.updated', 'settings', { workspace, description: `Updated workspace "${workspace.name}"` });
  return success(res, 200, { workspace }, 'Workspace updated');
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = req.workspace;
  const { hardDelete } = req.query;
  if (hardDelete === 'true') {
    await Promise.all([
      Brand.deleteMany({ workspace: workspace._id }),
      WorkspaceMember.deleteMany({ workspace: workspace._id }),
      Subscription.deleteOne({ workspace: workspace._id }),
      require('../models/Content').deleteMany({ workspace: workspace._id }),
      require('../models/Media').deleteMany({ workspace: workspace._id }),
      require('../models/BrandLibrary').deleteMany({ workspace: workspace._id }),
      require('../models/SocialAccount').deleteMany({ workspace: workspace._id }),
    ]);
    await Workspace.deleteOne({ _id: workspace._id });
  } else {
    workspace.isActive = false;
    await workspace.save();
    await WorkspaceMember.updateMany({ workspace: workspace._id }, { status: 'suspended' });
  }
  await audit(req, 'workspace.deleted', 'settings', { workspace, description: `Deleted workspace "${workspace.name}"` });
  return success(res, 200, null, 'Workspace deleted');
});

const switchWorkspace = asyncHandler(async (req, res) => {
  const user = req.user;
  user.preferences = user.preferences || {};
  user.preferences.defaultWorkspace = req.workspace._id;
  await user.save();
  return success(res, 200, { workspace: req.workspace }, 'Workspace switched');
});

module.exports = { getMyWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, switchWorkspace };
