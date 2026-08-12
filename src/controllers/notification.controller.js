const Notification = require('../models/Notification');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const filter = { user: req.user._id };
  const items = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  const total = await Notification.countDocuments(filter);
  return success(res, 200, { items, unread, total, page: Number(page), limit: Number(limit) }, 'Notifications');
});

const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');
  n.isRead = true;
  n.readAt = new Date();
  await n.save();
  return success(res, 200, { notification: n }, 'Marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  return success(res, 200, null, 'All notifications read');
});

module.exports = { listNotifications, markRead, markAllRead };
