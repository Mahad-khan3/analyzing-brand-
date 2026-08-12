const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const workspaceRoutes = require('./workspace.routes');
const brandRoutes = require('./brand.routes');
const aiRoutes = require('./ai.routes');
const mediaRoutes = require('./media.routes');
const contentRoutes = require('./content.routes');
const calendarRoutes = require('./calendar.routes');
const socialRoutes = require('./social.routes');
const analyticsRoutes = require('./analytics.routes');
const schedulerRoutes = require('./scheduler.routes');
const teamRoutes = require('./team.routes');
const subscriptionRoutes = require('./subscription.routes');
const notificationRoutes = require('./notification.routes');
const competitorRoutes = require('./competitor.routes');
const commentsRoutes = require('./comments.routes');
const dmRoutes = require('./dm.routes');
const activityRoutes = require('./activity.routes');
const adminRoutes = require('./admin.routes');
const libraryRoutes = require('./library.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', message: 'BrandPilot AI API healthy' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/brands', brandRoutes);
router.use('/ai', aiRoutes);
router.use('/media', mediaRoutes);
router.use('/content', contentRoutes);
router.use('/calendar', calendarRoutes);
router.use('/social', socialRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/scheduler', schedulerRoutes);
router.use('/team', teamRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/competitors', competitorRoutes);
router.use('/comments', commentsRoutes);
router.use('/dm', dmRoutes);
router.use('/activity', activityRoutes);
router.use('/admin', adminRoutes);
router.use('/library', libraryRoutes);

module.exports = router;
