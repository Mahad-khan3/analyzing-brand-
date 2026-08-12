const success = (res, statusCode = 200, data = null, message = 'Success') => {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
};

module.exports = { success };
