const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator, loginValidator, verifyEmailValidator, emailValidator,
  resetPasswordValidator, changePasswordValidator, refreshValidator,
} = require('../validators/auth.validators');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & account management
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Account created, verification email sent }
 */
router.post('/register', authLimiter, validate(registerValidator), ctrl.register);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with code or token
 *     tags: [Auth]
 */
router.post('/verify-email', validate(verifyEmailValidator), ctrl.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 */
router.post('/resend-verification', validate(emailValidator), ctrl.resendVerification);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validate(loginValidator), ctrl.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token (rotation)
 *     tags: [Auth]
 */
router.post('/refresh', validate(refreshValidator), ctrl.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout (revokes refresh token)
 *     tags: [Auth]
 */
router.post('/logout', ctrl.logout);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 */
router.post('/forgot-password', authLimiter, validate(emailValidator), ctrl.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 */
router.post('/reset-password', validate(resetPasswordValidator), ctrl.resetPassword);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Auth]
 */
router.post('/change-password', protect, validate(changePasswordValidator), ctrl.changePassword);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 */
router.get('/me', protect, ctrl.getCurrentUser);

router.get('/google/callback', ctrl.googleCallback);

module.exports = router;
