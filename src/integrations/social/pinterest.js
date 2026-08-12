const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

class PinterestProvider extends BaseProvider {
  constructor() {
    super('pinterest');
  }

  async publish(account, content) {
    if (!account.accessToken) throw ApiError.unauthorized('Pinterest access token missing');
    const url = content.link || content.mediaUrls?.[0] || '';
    const media = content.mediaUrls?.[0];
    if (!media) throw ApiError.unprocessable('Pinterest pins require an image', 'SOCIAL_MEDIA_REQUIRED');

    const body = {
      board_id: account.metadata?.board_id || account.accountId,
      title: content.title || content.caption?.slice(0, 100) || '',
      description: content.caption || '',
      media_source: { source_type: 'image_url', url: media },
    };
    if (url) body.link = url;

    const res = await fetch('https://api-sandbox.pinterest.com/v5/pins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw ApiError.unprocessable(`Pinterest API error: ${json.message || JSON.stringify(json)}`, 'SOCIAL_PUBLISH_FAILED');
    return { platform: 'pinterest', postId: json.id, raw: json };
  }
}

module.exports = new PinterestProvider();
