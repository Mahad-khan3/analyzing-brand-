const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'pinterest', 'youtube'],
      index: true,
    },
    accountId: { type: String, required: true },
    accountName: { type: String, default: '' },
    username: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenType: { type: String, default: 'Bearer' },
    tokenExpiresAt: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    status: { type: String, enum: ['connected', 'expired', 'disconnected', 'error'], default: 'connected' },
    lastError: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

socialAccountSchema.index({ workspace: 1, platform: 1, accountId: 1 }, { unique: true });

socialAccountSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.accessToken;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
