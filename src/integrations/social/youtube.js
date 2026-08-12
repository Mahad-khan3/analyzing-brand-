const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

class YouTubeProvider extends BaseProvider {
  constructor() {
    super('youtube');
  }

  async publish(account) {
    throw ApiError.unprocessable(
      'YouTube publishing requires OAuth with upload scope and a Google API key. Configure GOOGLE credentials to enable it.',
      'SOCIAL_NOT_CONFIGURED'
    );
  }
}

module.exports = new YouTubeProvider();
