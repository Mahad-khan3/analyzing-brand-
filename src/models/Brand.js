const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 4000 },
    website: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
    facebook: { type: String, default: '', trim: true },
    linkedin: { type: String, default: '', trim: true },
    twitter: { type: String, default: '', trim: true },
    youtube: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    isStartup: { type: Boolean, default: false },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    logoStyle: { type: String, default: '' },
    theme: {
      type: String,
      default: 'premium',
      enum: ['premium', 'minimal', 'bold', 'playful', 'luxury', 'eco', 'tech', 'vintage', 'modern', 'custom'],
    },
    colors: {
      primary: { type: String, default: '#6C5CE7' },
      secondary: { type: String, default: '#00CEC9' },
      accent: { type: String, default: '#FD79A8' },
      background: { type: String, default: '#FFFFFF' },
      text: { type: String, default: '#2D3436' },
    },
    fonts: {
      heading: { type: String, default: 'Sora' },
      body: { type: String, default: 'Inter' },
    },
    username: { type: String, default: '', trim: true },
    onboarding: {
      status: {
        type: String,
        default: 'not_started',
        enum: ['not_started', 'in_progress', 'analyzing', 'usernames', 'logo', 'identity_saved', 'completed'],
      },
      currentStep: { type: Number, default: 0 },
      stepsCompleted: { type: [String], default: [] },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brandSchema.index({ workspace: 1, name: 1 });

module.exports = mongoose.model('Brand', brandSchema);
