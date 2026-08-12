const ApiError = require('../../utils/ApiError');

class BaseProvider {
  constructor(platform) {
    this.platform = platform;
  }

  async publish(account, content) {
    throw ApiError.unprocessable(`${this.platform} publishing is not implemented on this server`, 'SOCIAL_NOT_IMPLEMENTED');
  }

  async refreshToken(account) {
    throw ApiError.unprocessable(`${this.platform} token refresh is not supported`, 'SOCIAL_NOT_IMPLEMENTED');
  }

  async fetchAnalytics(account, contentId) {
    return null;
  }

  async fetchAccountInfo(account) {
    return account.metadata || {};
  }
}

module.exports = BaseProvider;
