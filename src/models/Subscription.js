const mongoose = require('mongoose');

const planDefinitions = {
  free: { aiGenerations: 100000, brands: 1000, teamMembers: 100, socialAccounts: 50, scheduledPosts: 100000, analytics: true },
  starter: { aiGenerations: 200, brands: 3, teamMembers: 3, socialAccounts: 5, scheduledPosts: 100, analytics: true },
  pro: { aiGenerations: 1000, brands: 10, teamMembers: 10, socialAccounts: 15, scheduledPosts: 1000, analytics: true },
  agency: { aiGenerations: 5000, brands: 50, teamMembers: 50, socialAccounts: 50, scheduledPosts: 10000, analytics: true },
};

const subscriptionSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'agency'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired'],
      default: 'active',
    },
    limits: { type: mongoose.Schema.Types.Mixed, default: planDefinitions.free },
    usage: {
      aiGenerations: { type: Number, default: 0 },
      scheduledPosts: { type: Number, default: 0 },
      publishedPosts: { type: Number, default: 0 },
    },
    currentPeriodStart: { type: Date, default: () => new Date() },
    currentPeriodEnd: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    paymentProvider: { type: String, enum: ['stripe', 'paypal', 'manual', 'none'], default: 'none' },
    paymentCustomerId: { type: String, default: '' },
    paymentSubscriptionId: { type: String, default: '' },
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionSchema.methods.canUse = function canUse(resource) {
  const max = this.limits && this.limits[resource];
  if (max === undefined || max === null) return true;
  if (max === true) return true;
  if (max === false) return false;
  const used = (this.usage && this.usage[resource]) || 0;
  return used < max;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
module.exports.planDefinitions = planDefinitions;
