const Notification = require('../models/Notification');

const notify = async ({ user, workspace = null, type = 'system', title, message = '', data = {}, severity = 'info' }) => {
  try {
    await Notification.create({ user, workspace, type, title, message, data, severity });
  } catch (err) {
    console.warn('[notify] failed to create notification:', err.message);
  }
};

module.exports = { notify };
