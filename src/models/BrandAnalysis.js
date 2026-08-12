const mongoose = require('mongoose');

const brandAnalysisSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    source: { type: String, enum: ['existing_business', 'startup'], required: true },
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
    competitors: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    usp: { type: String, default: '' },
    brandVoice: { type: String, default: '' },
    writingStyle: { type: String, default: '' },
    marketingStyle: { type: String, default: '' },
    contentStrategy: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    cta: { type: [String], default: [] },
    faqs: { type: [String], default: [] },
    socialPresence: { type: mongoose.Schema.Types.Mixed, default: {} },
    socialPerformance: { type: mongoose.Schema.Types.Mixed, default: {} },
    brandColors: { type: [String], default: [] },
    fonts: { type: [String], default: [] },
    positioning: { type: String, default: '' },
    brandKit: { type: mongoose.Schema.Types.Mixed, default: null },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    analysisDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

brandAnalysisSchema.index({ brand: 1, analysisDate: -1 });

module.exports = mongoose.model('BrandAnalysis', brandAnalysisSchema);
