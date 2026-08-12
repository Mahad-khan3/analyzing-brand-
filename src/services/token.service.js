const mongoose = require('mongoose');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashToken, generateNanoId } = require('../utils/crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const secure = env.isProduction();
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax' });
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'lax', path: '/api/v1/auth' });
};

const issueTokenPair = async (user, { req, familyId = null } = {}) => {
  const payload = { id: user._id.toString(), role: user.role };

  const family = familyId || generateNanoId(16);
  const refreshToken = signRefreshToken({ id: user._id.toString(), family });
  const accessToken = signAccessToken(payload);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    familyId: family,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: (req && req.headers['user-agent']) || '',
    ip: (req && (req.ip || req.connection.remoteAddress)) || '',
    lastUsedAt: new Date(),
  });

  return { accessToken, refreshToken, familyId: family };
};

const rotateRefreshToken = async (refreshToken, { req, user }) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await RefreshToken.findOne({ tokenHash, revokedAt: null }).populate('user', '+password');
  if (!stored) throw ApiError.unauthorized('Refresh token not found or revoked');

  if (stored.expiresAt < new Date()) {
    stored.revokedAt = new Date();
    await stored.save();
    throw ApiError.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
  }

  if (user && stored.user && stored.user._id.toString() !== user._id.toString()) {
    throw ApiError.unauthorized('Refresh token does not match user');
  }

  // Rotate: revoke this token, issue a new one in the same family.
  stored.revokedAt = new Date();
  await stored.save();

  const pair = await issueTokenPair(stored.user || user, {
    req,
    familyId: stored.familyId,
  });

  // revoke any other tokens in the family (rotation reuse detection)
  await RefreshToken.updateMany(
    { familyId: stored.familyId, revokedAt: null },
    { revokedAt: new Date() }
  );

  return pair;
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

module.exports = { issueTokenPair, rotateRefreshToken, revokeAllUserTokens, setAuthCookies, clearAuthCookies };
