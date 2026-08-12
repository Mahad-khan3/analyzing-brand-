const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

class TwitterProvider extends BaseProvider {
  constructor() {
    super('twitter');
  }

  async publish(account) {
    throw ApiError.unprocessable(
      'X/Twitter publishing requires OAuth 1.0a consumer keys + user tokens. Add TWITTER_API_KEY/SECRET and connect an account to enable it.',
      'SOCIAL_NOT_CONFIGURED'
    );
  }
}

module.exports = new TwitterProvider();
