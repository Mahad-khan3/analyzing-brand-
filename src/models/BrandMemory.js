const mongoose = require('mongoose');

const brandMemorySchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, unique: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    summary: { type: String, default: '' },
    category: { type: String, default: '' },
    businessInfo: { type: String, default: '' },
    products: { type: [String], default: [] },
    services: { type: [String], default: [] },
    targetAudience: {
      description: { type: String, default: '' },
      demographics: { type: String, default: '' },
      interests: { type: [String], default: [] },
      painPoints: { type: [String], default: [] },
    },
    usp: { type: String, default: '' },
    positioning: { type: String, default: '' },
    brandVoice: { type: String, default: '' },
    writingStyle: { type: String, default: '' },
    marketingStyle: { type: String, default: '' },
    contentStrategy: { type: String, default: '' },
    competitors: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    cta: { type: [String], default: [] },
    faqs: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    fonts: { type: [String], default: [] },
    recentContent: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BrandMemory', brandMemorySchema);
