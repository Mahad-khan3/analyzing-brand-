const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateSubscription, setPlan } = require('../services/subscription.service');
const { audit } = require('../services/audit.service');
const { notify } = require('../services/notification.service');

const getSubscription = asyncHandler(async (req, res) => {
  const sub = await getOrCreateSubscription(req.workspace._id);
  return success(res, 200, { subscription: sub }, 'Subscription');
});

const upgradePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!['starter', 'pro', 'agency'].includes(plan)) throw ApiError.badRequest('Invalid plan');
  const sub = await setPlan(req.workspace._id, plan, { status: 'active', paymentProvider: 'none', periodDays: 30 });
  await notify({
    user: req.user._id,
    workspace: req.workspace._id,
    type: 'subscription_update',
    title: 'Plan upgraded',
    message: `Your workspace is now on the ${plan} plan.`,
    severity: 'success',
  });
  await audit(req, 'subscription.upgraded', 'subscription', { description: `Upgraded to ${plan}` });
  return success(res, 200, { subscription: sub }, `Upgraded to ${plan}`);
});

const changePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!['free', 'starter', 'pro', 'agency'].includes(plan)) throw ApiError.badRequest('Invalid plan');
  const sub = await setPlan(req.workspace._id, plan, { status: 'active' });
  return success(res, 200, { subscription: sub }, 'Plan changed');
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const sub = await getOrCreateSubscription(req.workspace._id);
  sub.status = 'cancelled';
  sub.autoRenew = false;
  await sub.save();
  await audit(req, 'subscription.cancelled', 'subscription', { description: 'Cancelled subscription' });
  return success(res, 200, { subscription: sub }, 'Subscription cancelled');
});

module.exports = { getSubscription, upgradePlan, changePlan, cancelSubscription };
