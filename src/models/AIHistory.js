const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'brand_analysis',
        'startup_analysis',
        'startup_kickoff',
        'brand_name_ideas',
        'logo_generation',
        'logo_tips',
        'website_advice',
        'post_idea',
        'product_post_idea',
        'caption',
        'hashtag',
        'bio',
        'posting_schedule',
        'image_generation',
        'content_calendar',
        'competitor_analysis',
        'brand_chat',
        'content_generation',
      ],
      index: true,
    },
    title: { type: String, default: '' },
    prompt: { type: String, default: '' },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: {} },
    provider: { type: String, default: 'gemini' },
    model: { type: String, default: '' },
    tokensUsed: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'processing'], default: 'success' },
    errorMessage: { type: String, default: '' },
    durationMs: { type: Number, default: 0 },
    savedToLibrary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

aiHistorySchema.index({ workspace: 1, brand: 1, createdAt: -1 });
aiHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AIHistory', aiHistorySchema);
