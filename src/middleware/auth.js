const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

const protect = asyncHandler(async (req, res, next) => {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) throw ApiError.unauthorized('Authentication required');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(decoded.id).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationCode');
  if (!user) throw ApiError.unauthorized('User no longer exists');

  if (!user.isVerified) {
    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  req.user = user;
  req.token = token;
  next();
});

const protectOptional = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    } catch {
      // ignore
    }
  }
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
  next();
};

const setWorkspace = asyncHandler(async (req, res, next) => {
  const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
  if (workspaceId) req.selectedWorkspaceId = workspaceId;
  next();
});

const requireWorkspace = asyncHandler(async (req, res, next) => {
  if (!req.selectedWorkspaceId) {
    throw ApiError.badRequest('workspaceId is required', 'WORKSPACE_REQUIRED');
  }
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const membership = await WorkspaceMember.findOne({
    workspace: req.selectedWorkspaceId,
    user: req.user.id,
    status: 'active',
  });
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }

  const workspace = await Workspace.findById(req.selectedWorkspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');

  req.workspace = workspace;
  req.membership = membership;
  next();
});

const requireRole = (...roles) => asyncHandler(async (req, res, next) => {
  if (!req.membership) throw ApiError.forbidden('Workspace access required');
  if (!roles.includes(req.membership.role)) {
    throw ApiError.forbidden(`Requires workspace role: ${roles.join(' or ')}`);
  }
  next();
});

module.exports = { protect, protectOptional, authorize, setWorkspace, requireWorkspace, requireRole };
