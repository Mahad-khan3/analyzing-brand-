const Subscription = require('../models/Subscription');
const { planDefinitions } = require('../models/Subscription');
const WorkspaceMember = require('../models/WorkspaceMember');
const SocialAccount = require('../models/SocialAccount');
const Content = require('../models/Content');
const Brand = require('../models/Brand');
const ApiError = require('../utils/ApiError');

const getOrCreateSubscription = async (workspaceId) => {
  let sub = await Subscription.findOne({ workspace: workspaceId });
  if (!sub) {
    sub = await Subscription.create({ workspace: workspaceId });
  }
  const def = planDefinitions[sub.plan];
  if (def && JSON.stringify(sub.limits) !== JSON.stringify(def)) {
    sub.limits = def;
    await sub.save();
  }
  if (new Date(sub.currentPeriodEnd) < new Date() && sub.status === 'active') {
    sub.status = 'expired';
    await sub.save();
  }
  return sub;
};

const setPlan = async (workspaceId, plan, opts = {}) => {
  if (!planDefinitions[plan]) throw ApiError.badRequest('Invalid plan');
  const sub = await getOrCreateSubscription(workspaceId);
  sub.plan = plan;
  sub.limits = planDefinitions[plan];
  sub.status = opts.status || 'active';
  sub.paymentProvider = opts.paymentProvider || 'none';
  sub.paymentCustomerId = opts.paymentCustomerId || sub.paymentCustomerId;
  sub.paymentSubscriptionId = opts.paymentSubscriptionId || sub.paymentSubscriptionId;
  if (opts.periodDays) {
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = new Date(Date.now() + opts.periodDays * 24 * 60 * 60 * 1000);
  }
  await sub.save();
  return sub;
};

const enforceLimit = async (workspaceId, resource) => {
  const sub = await getOrCreateSubscription(workspaceId);
  const limits = planDefinitions[sub.plan] || sub.limits || planDefinitions.free;
  let current = 0;
  if (resource === 'brands') current = await Brand.countDocuments({ workspace: workspaceId, isActive: true });
  else if (resource === 'teamMembers') current = await WorkspaceMember.countDocuments({ workspace: workspaceId, status: 'active' });
  else if (resource === 'socialAccounts') current = await SocialAccount.countDocuments({ workspace: workspaceId, status: 'connected' });
  else if (resource === 'scheduledPosts') current = await Content.countDocuments({ workspace: workspaceId, status: 'scheduled' });

  const max = limits[resource];
  if (typeof max === 'boolean') {
    if (!max) throw ApiError.forbidden(`Your ${sub.plan} plan does not include ${resource}. Upgrade to enable it.`, 'LIMIT_EXCEEDED');
    return { sub, current, max };
  }
  if (max !== undefined && max !== null && current >= max) {
    throw ApiError.forbidden(`Plan limit reached for ${resource} (${current}/${max}). Upgrade your plan.`, 'LIMIT_EXCEEDED');
  }
  return { sub, current, max };
};

const recordAIUsage = async (workspaceId, amount = 1) => {
  const sub = await getOrCreateSubscription(workspaceId);
  const max = (planDefinitions[sub.plan] || sub.limits || planDefinitions.free).aiGenerations;
  if (typeof max === 'number' && (sub.usage.aiGenerations || 0) + amount > max) {
    throw ApiError.forbidden(`AI generation limit reached (${sub.usage.aiGenerations}/${max}). Upgrade your plan.`, 'LIMIT_EXCEEDED');
  }
  sub.usage.aiGenerations = (sub.usage.aiGenerations || 0) + amount;
  await sub.save();
  return sub;
};

module.exports = { getOrCreateSubscription, setPlan, enforceLimit, recordAIUsage, planDefinitions };
