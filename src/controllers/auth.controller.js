const User = require('../models/User');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateVerificationCode, hashToken, randomToken, sanitizeUser, generateNanoId } = require('../utils/crypto');
const { sendMail, templates } = require('../services/mail.service');
const tokenService = require('../services/token.service');
const { logActivity } = require('../services/audit.service');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Subscription = require('../models/Subscription');

const sendVerificationEmail = async (user) => {
  const code = generateVerificationCode();
  const token = randomToken(32);
  user.emailVerificationCode = code;
  user.emailVerificationToken = hashToken(token);
  await user.save();
  await sendMail({ to: user.email, ...templates.verifyEmail(user.name, code) });
  return { code };
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Please sign in.');
  }

  const user = await User.create({ name, email, password, isVerified: true, emailVerifiedAt: new Date() });

  // Auto-create a personal workspace + subscription so the user lands straight on the dashboard.
  const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user'}-${generateNanoId(4)}`;
  const workspace = await Workspace.create({ name: `${name}'s workspace`, description: 'Personal workspace', owner: user._id, slug });
  await WorkspaceMember.create({ workspace: workspace._id, user: user._id, role: 'owner', status: 'active', joinedAt: new Date() });
  await Subscription.create({ workspace: workspace._id });

  await logActivity({
    user: user._id,
    action: 'auth.register',
    category: 'auth',
    description: 'Registered a new account',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return success(res, 201, null, 'Account created. Please sign in.');
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { code, token } = req.body;
  const user = await User.findOne({ email: req.body.email ? req.body.email.toLowerCase() : undefined }).select('+password +emailVerificationToken +emailVerificationCode');
  if (!user) throw ApiError.notFound('User not found');

  const okByCode = code && user.emailVerificationCode === code;
  const okByToken = token && user.emailVerificationToken === hashToken(token);
  if (!okByCode && !okByToken) throw ApiError.badRequest('Invalid verification code', 'INVALID_CODE');

  user.isVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationCode = null;
  user.emailVerificationToken = null;
  await user.save();

  const pair = await tokenService.issueTokenPair(user, { req });
  tokenService.setAuthCookies(res, pair);

  await logActivity({ user: user._id, action: 'auth.verify_email', category: 'auth', description: 'Email verified', ip: req.ip });

  return success(res, 200, { user: sanitizeUser(user), accessToken: pair.accessToken }, 'Email verified successfully');
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.notFound('User not found');
  if (user.isVerified) return success(res, 200, null, 'Email already verified');
  await sendVerificationEmail(user);
  return success(res, 200, null, 'Verification email re-sent');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.unauthorized('Account temporarily locked. Try again later.', 'ACCOUNT_LOCKED');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isVerified) {
    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const pair = await tokenService.issueTokenPair(user, { req });
  tokenService.setAuthCookies(res, pair);

  await logActivity({ user: user._id, action: 'auth.login', category: 'auth', description: 'Logged in', ip: req.ip, userAgent: req.headers['user-agent'] });

  return success(res, 200, { user: sanitizeUser(user), accessToken: pair.accessToken }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

  const pair = await tokenService.rotateRefreshToken(refreshToken, { req });
  tokenService.setAuthCookies(res, pair);
  return success(res, 200, { accessToken: pair.accessToken }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (refreshToken) {
    const { hashToken } = require('../utils/crypto');
    const { verifyRefreshToken } = require('../utils/jwt');
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const RefreshToken = require('../models/RefreshToken');
      await RefreshToken.updateOne({ user: decoded.id, tokenHash: hashToken(refreshToken), revokedAt: null }, { revokedAt: new Date() });
    } catch {
      // ignore
    }
  }
  tokenService.clearAuthCookies(res);
  if (req.user) {
    await logActivity({ user: req.user._id, action: 'auth.logout', category: 'auth', description: 'Logged out', ip: req.ip });
  }
  return success(res, 200, null, 'Logged out');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return success(res, 200, null, 'If that email exists, a reset link has been sent');

  const resetToken = randomToken(32);
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  await sendMail({ to: user.email, ...templates.resetPassword(user.name, resetLink) });

  await logActivity({ user: user._id, action: 'auth.forgot_password', category: 'auth', description: 'Requested password reset', ip: req.ip });

  return success(res, 200, null, 'If that email exists, a reset link has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
  if (!user) throw ApiError.badRequest('Invalid reset link', 'INVALID_RESET_TOKEN');

  if (!user.passwordResetToken || user.passwordResetToken !== hashToken(token)) {
    throw ApiError.badRequest('Invalid reset link', 'INVALID_RESET_TOKEN');
  }
  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw ApiError.badRequest('Reset link has expired', 'RESET_TOKEN_EXPIRED');
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  await tokenService.revokeAllUserTokens(user._id);
  await logActivity({ user: user._id, action: 'auth.reset_password', category: 'auth', description: 'Password reset', ip: req.ip });

  return success(res, 200, null, 'Password updated. You can now log in.');
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { currentPassword, newPassword } = req.body;
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');

  user.password = newPassword;
  await user.save();
  await tokenService.revokeAllUserTokens(user._id);
  await logActivity({ user: user._id, action: 'auth.change_password', category: 'auth', description: 'Changed password', ip: req.ip });

  return success(res, 200, null, 'Password changed successfully');
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({ path: 'preferences.defaultWorkspace', select: 'name slug logo' })
    .select('-password');
  const memberships = await WorkspaceMember.find({ user: user._id, status: 'active' })
    .populate('workspace', 'name slug logo description owner');
  return success(res, 200, { user: sanitizeUser(user), workspaces: memberships.map((m) => ({ ...m.workspace.toObject(), role: m.role })) }, 'Current user');
});

const googleCallback = asyncHandler(async (req, res) => {
  throw ApiError.badRequest('Google OAuth is not configured on this server', 'OAUTH_NOT_CONFIGURED');
});

module.exports = {
  register, verifyEmail, resendVerification, login, refresh, logout,
  forgotPassword, resetPassword, changePassword, getCurrentUser, googleCallback,
};
