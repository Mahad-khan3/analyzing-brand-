const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

const GRAPH = 'https://graph.facebook.com/v19.0';

class InstagramProvider extends BaseProvider {
  constructor() {
    super('instagram');
  }

  async publish(account, content) {
    if (!account.accessToken) throw ApiError.unauthorized('Instagram access token missing');
    if (!content.mediaUrls || !content.mediaUrls.length) {
      throw ApiError.unprocessable('Instagram posts require at least one image', 'SOCIAL_MEDIA_REQUIRED');
    }
    const igUserId = account.metadata?.ig_user_id || account.accountId;
    const caption = [content.caption, content.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')].filter(Boolean).join('\n\n');

    const single = content.mediaUrls[0];
    const mediaRes = await this._api(`/${igUserId}/media`, account.accessToken, 'POST', {
      image_url: single,
      caption,
    });
    if (mediaRes.error) throw ApiError.unprocessable(`Instagram API error: ${mediaRes.error.message}`, 'SOCIAL_PUBLISH_FAILED');

    const publishRes = await this._api(`/${igUserId}/media_publish`, account.accessToken, 'POST', {
      creation_id: mediaRes.id,
    });
    if (publishRes.error) throw ApiError.unprocessable(`Instagram publish error: ${publishRes.error.message}`, 'SOCIAL_PUBLISH_FAILED');

    return { platform: 'instagram', postId: publishRes.id, raw: publishRes };
  }

  async _api(path, accessToken, method = 'GET', body = null) {
    const url = `${GRAPH}${path}`;
    const opts = { method, headers: {} };
    if (method === 'POST') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body || {});
    }
    const params = new URLSearchParams({ access_token: accessToken });
    return fetch(`${url}?${params}`, opts).then((r) => r.json());
  }
}

module.exports = new InstagramProvider();
