const mongoose = require('mongoose');

const memberRoles = ['owner', 'admin', 'editor', 'viewer'];
const memberPermissions = {
  create_brand: ['owner', 'admin', 'editor'],
  edit_brand: ['owner', 'admin', 'editor'],
  delete_brand: ['owner', 'admin'],
  create_content: ['owner', 'admin', 'editor'],
  publish_content: ['owner', 'admin', 'editor'],
  manage_social: ['owner', 'admin'],
  manage_team: ['owner', 'admin'],
  manage_subscription: ['owner', 'admin'],
  view_analytics: ['owner', 'admin', 'editor', 'viewer'],
};

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: memberRoles, default: 'viewer', index: true },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active', index: true },
    permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

workspaceMemberSchema.methods.can = function can(permission) {
  const allowed = memberPermissions[permission] || [];
  return allowed.includes(this.role);
};

module.exports = mongoose.model('WorkspaceMember', workspaceMemberSchema);
module.exports.memberRoles = memberRoles;
module.exports.memberPermissions = memberPermissions;
