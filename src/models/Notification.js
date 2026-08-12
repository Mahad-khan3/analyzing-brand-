const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    type: {
      type: String,
      enum: [
        'post_published',
        'post_failed',
        'post_scheduled',
        'ai_generation_completed',
        'team_invitation',
        'subscription_update',
        'account_event',
        'system',
      ],
      default: 'system',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    severity: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
