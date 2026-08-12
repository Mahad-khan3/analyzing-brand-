const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyEmailValidator = [
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('code').optional().isLength({ min: 6, max: 6 }).withMessage('Invalid code'),
  body('token').optional().isLength({ min: 32 }).withMessage('Invalid token'),
];

const emailValidator = [body('email').isEmail().withMessage('Valid email required').normalizeEmail()];

const forgotPasswordValidator = emailValidator;

const resetPasswordValidator = [
  body('token').isLength({ min: 32 }).withMessage('Invalid token'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const refreshValidator = [
  body('refreshToken').optional().notEmpty().withMessage('refreshToken required'),
];

module.exports = {
  registerValidator, loginValidator, verifyEmailValidator, emailValidator,
  forgotPasswordValidator, resetPasswordValidator, changePasswordValidator, refreshValidator,
};
