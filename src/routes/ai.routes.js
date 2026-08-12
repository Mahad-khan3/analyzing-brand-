const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ai.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const { loadBrand } = require('../middleware/resource');
const validate = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  analysisValidator, brandKitValidator, usernameValidator, logoValidator, postIdeaValidator, captionValidator,
  hashtagValidator, imageGeneratorValidator, contentCalendarValidator, chatValidator,
} = require('../validators/app.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/history', ctrl.allHistory);

router.use('/brands/:brandId', loadBrand);

router.post('/brands/:brandId/analyze', requireRole('owner', 'admin', 'editor'), aiLimiter, validate(analysisValidator), ctrl.runAnalysis);
router.post('/brands/:brandId/startup-kickoff', aiLimiter, ctrl.startupKickoff);
router.post('/brands/:brandId/logo-tips', aiLimiter, ctrl.logoTips);
router.post('/brands/:brandId/website-advice', aiLimiter, ctrl.websiteAdvice);
router.post('/brands/:brandId/product-post-ideas', aiLimiter, ctrl.productPostIdeas);
router.post('/brands/:brandId/bio', aiLimiter, ctrl.bio);
router.post('/brands/:brandId/posting-schedule', aiLimiter, ctrl.postingSchedule);
router.post('/brands/:brandId/analyze-kit', requireRole('owner', 'admin', 'editor'), aiLimiter, validate(brandKitValidator), ctrl.runBrandKit);
router.get('/brands/:brandId/memory', ctrl.getBrandMemory);
router.get('/brands/:brandId/history', ctrl.history);

router.post('/brands/:brandId/usernames', aiLimiter, ctrl.usernameSuggestions);
router.post('/brands/:brandId/usernames/save', validate(usernameValidator), ctrl.saveUsername);

router.post('/brands/:brandId/logos', aiLimiter, validate(logoValidator), ctrl.generateLogos);
router.post('/brands/:brandId/logos/set', ctrl.setBrandLogo);

router.post('/brands/:brandId/post-ideas', aiLimiter, validate(postIdeaValidator), ctrl.postIdeas);
router.post('/brands/:brandId/caption', aiLimiter, validate(captionValidator), ctrl.caption);
router.post('/brands/:brandId/hashtags', aiLimiter, validate(hashtagValidator), ctrl.hashtags);
router.post('/brands/:brandId/caption/improve', aiLimiter, ctrl.improveCaption);
router.post('/brands/:brandId/generate-post', aiLimiter, ctrl.generateComboPost);

router.post('/brands/:brandId/images/product', requireRole('owner', 'admin', 'editor'), upload.single('image'), ctrl.uploadProductImage);
router.post('/brands/:brandId/images/post', aiLimiter, validate(imageGeneratorValidator), ctrl.generatePostImage);

router.post('/brands/:brandId/content-calendar', aiLimiter, validate(contentCalendarValidator), ctrl.generateContentCalendar);
router.post('/brands/:brandId/competitors/:competitorId/analyze', aiLimiter, ctrl.competitorAnalysis);
router.post('/brands/:brandId/chat', aiLimiter, validate(chatValidator), ctrl.chat);

module.exports = router;
