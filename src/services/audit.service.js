const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ workspace, user, brand, action, category = 'system', description = '', metadata = {}, ip = '', userAgent = '' }) => {
  try {
    await ActivityLog.create({
      workspace: workspace || null,
      user: user || null,
      brand: brand || null,
      action,
      category,
      description,
      metadata: metadata || {},
      ip,
      userAgent,
    });
  } catch (err) {
    console.warn('[audit] failed to write activity log:', err.message);
  }
};

const audit = (req, action, category = 'system', extra = {}) => {
  return logActivity({
    workspace: extra.workspace || req.workspace?._id || null,
    user: extra.user || req.user?._id || null,
    brand: extra.brand || null,
    action,
    category,
    description: extra.description || '',
    metadata: extra.metadata || {},
    ip: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  });
};

module.exports = { logActivity, audit };
