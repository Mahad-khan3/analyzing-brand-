const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', maxlength: 300 },
    caption: { type: String, default: '', maxlength: 5000 },
    hashtags: { type: [String], default: [] },
    cta: { type: String, default: '' },
    link: { type: String, default: '' },
    media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
    mediaUrls: { type: [String], default: [] },
    platforms: {
      type: [String],
      default: ['instagram'],
      enum: ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'pinterest', 'youtube'],
    },
    postType: { type: String, default: '' },
    topic: { type: String, default: '' },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'scheduled', 'processing', 'published', 'failed', 'cancelled'],
      index: true,
    },
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
    jobId: { type: String, default: null },
    publishResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
    lastError: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    isDraft: { type: Boolean, default: false },
    analytics: {
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      saved: { type: Number, default: 0 },
    },
    sourcePrompt: { type: String, default: '' },
    aiMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

contentSchema.index({ workspace: 1, brand: 1, status: 1 });
contentSchema.index({ workspace: 1, scheduledAt: 1 });
contentSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Content', contentSchema);
