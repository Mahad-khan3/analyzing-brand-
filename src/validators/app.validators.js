const { body } = require('express-validator');
const { LOGO_STYLES } = require('../services/imageDesign.service');
const { POST_TYPES } = require('../services/ai.service');

const createWorkspaceValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Workspace name is required'),
];

const updateWorkspaceValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
];

const createBrandValidator = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Brand name is required'),
  body('description').optional().isLength({ max: 4000 }),
  body('website').optional().isURL({ require_protocol: false }).withMessage('Invalid website URL'),
  body('isStartup').optional().isBoolean(),
];

const updateBrandValidator = [
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('description').optional().isLength({ max: 4000 }),
];

const analysisValidator = [
  body('force').optional().isBoolean(),
];

const brandKitValidator = [
  body('mode').optional().isIn(['startup', 'existing']),
];

const usernameValidator = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
];

const logoValidator = [
  body('style').optional().isIn(LOGO_STYLES).withMessage(`style must be one of: ${LOGO_STYLES.join(', ')}`),
  body('count').optional().isInt({ min: 1, max: 6 }).withMessage('count must be 1-6'),
];

const postIdeaValidator = [
  body('postType').optional().isIn(POST_TYPES).withMessage(`postType must be one of: ${POST_TYPES.join(', ')}`),
  body('topic').optional().trim().isLength({ max: 200 }),
  body('count').optional().isInt({ min: 1, max: 15 }),
];

const captionValidator = [
  body('postType').optional().isIn(POST_TYPES),
  body('topic').optional().isLength({ max: 200 }),
  body('style').optional().isLength({ max: 100 }),
];

const hashtagValidator = [
  body('topic').optional().isLength({ max: 200 }),
  body('count').optional().isInt({ min: 1, max: 30 }),
];

const imageGeneratorValidator = [
  body('title').optional().isLength({ max: 200 }),
  body('caption').optional().isLength({ max: 2000 }),
  body('price').optional().isLength({ max: 100 }),
  body('extraText').optional().isLength({ max: 500 }),
  body('imageConcept').optional().isLength({ max: 2000 }),
  body('productImageUrl').optional().isURL().withMessage('Invalid product image URL'),
  body('buttonText').optional().isLength({ max: 100 }),
  body('customPrompt').optional().isLength({ max: 4000 }),
];

const contentCalendarValidator = [
  body('frequency').optional().isInt({ min: 1, max: 14 }),
  body('days').optional().isInt({ min: 7, max: 90 }),
];

const chatValidator = [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message is required'),
];

module.exports = {
  createWorkspaceValidator, updateWorkspaceValidator, createBrandValidator, updateBrandValidator,
  analysisValidator, brandKitValidator, usernameValidator, logoValidator, postIdeaValidator, captionValidator,
  hashtagValidator, imageGeneratorValidator, contentCalendarValidator, chatValidator,
};
