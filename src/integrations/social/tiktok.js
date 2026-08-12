const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

class TikTokProvider extends BaseProvider {
  constructor() {
    super('tiktok');
  }

  async publish(account) {
    throw ApiError.unprocessable(
      'TikTok publishing requires TikTok Content Posting API client credentials. Configure TIKTOK_CLIENT_KEY/SECRET and connect an account.',
      'SOCIAL_NOT_CONFIGURED'
    );
  }
}

module.exports = new TikTokProvider();
