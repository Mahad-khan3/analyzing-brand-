const mongoose = require('mongoose');

const teamInvitationSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'], default: 'pending', index: true },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

teamInvitationSchema.index({ workspace: 1, status: 1 });
teamInvitationSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model('TeamInvitation', teamInvitationSchema);
