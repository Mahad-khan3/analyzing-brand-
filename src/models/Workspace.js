const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 500 },
    logo: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settings: {
      defaultTimezone: { type: String, default: 'UTC' },
      defaultPlatforms: { type: [String], default: ['instagram'] },
      brandVoice: { type: String, default: '' },
    },
    membersCount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', workspaceSchema);
