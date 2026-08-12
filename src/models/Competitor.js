const mongoose = require('mongoose');

const competitorSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    website: { type: String, default: '' },
    socialProfiles: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    industry: { type: String, default: '' },
    notes: { type: String, default: '' },
    analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
    analyzedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

competitorSchema.index({ workspace: 1, brand: 1 });

module.exports = mongoose.model('Competitor', competitorSchema);
