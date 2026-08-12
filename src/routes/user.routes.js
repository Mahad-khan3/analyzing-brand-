const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/me', protect, ctrl.getProfile);

router.put(
  '/me',
  protect,
  upload.single('profileImage'),
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('preferences').optional().custom((v) => {
      if (v && typeof v === 'object') return true;
      if (typeof v === 'string') {
        try { JSON.parse(v); return true; } catch { return false; }
      }
      return false;
    }).withMessage('preferences must be an object'),
  ]),
  ctrl.updateProfile
);

module.exports = router;
