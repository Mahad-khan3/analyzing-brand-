const { body } = require('express-validator');

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'pinterest', 'youtube'];

const createContentValidator = [
  body('brandId').isMongoId().withMessage('Valid brandId required'),
  body('caption').optional().isLength({ max: 5000 }),
  body('platforms').optional().isArray().withMessage('platforms must be an array'),
  body('platforms.*').optional().isIn(PLATFORMS).withMessage('Invalid platform'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid date'),
];

const updateContentValidator = [
  body('caption').optional().isLength({ max: 5000 }),
  body('platforms.*').optional().isIn(PLATFORMS),
];

const scheduleValidator = [
  body('scheduledAt').isISO8601().withMessage('Valid scheduledAt (ISO date) required'),
];

const connectSocialValidator = [
  body('platform').isIn(PLATFORMS).withMessage('Invalid platform'),
  body('accountId').notEmpty().withMessage('accountId is required'),
  body('accessToken').notEmpty().withMessage('accessToken is required'),
];

const inviteValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('role').isIn(['admin', 'editor', 'viewer']).withMessage('Invalid role'),
];

const acceptInviteValidator = [
  body('token').isLength({ min: 32 }).withMessage('Invalid token'),
  body('workspaceId').isMongoId().withMessage('Valid workspaceId required'),
];

const upgradeValidator = [
  body('plan').isIn(['starter', 'pro', 'agency']).withMessage('Invalid plan'),
];

const changePlanValidator = [
  body('plan').isIn(['free', 'starter', 'pro', 'agency']).withMessage('Invalid plan'),
];

const competitorValidator = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Competitor name is required'),
  body('brandId').optional().isMongoId(),
];

module.exports = {
  createContentValidator, updateContentValidator, scheduleValidator,
  connectSocialValidator, inviteValidator, acceptInviteValidator,
  upgradeValidator, changePlanValidator, competitorValidator,
};
