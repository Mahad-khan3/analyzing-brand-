const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

const GRAPH = 'https://graph.facebook.com/v19.0';

class FacebookProvider extends BaseProvider {
  constructor() {
    super('facebook');
  }

  async _api(path, accessToken, method = 'GET', body = null) {
    const url = `${GRAPH}${path}`;
    const opts = { method, headers: {} };
    if (method === 'POST') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body || {});
      // FB supports tokens via query for simple calls
      const params = new URLSearchParams({ access_token: accessToken });
      return fetch(`${url}?${params}`, opts).then((r) => r.json());
    }
    const params = new URLSearchParams({ access_token: accessToken });
    return fetch(`${url}?${params}`).then((r) => r.json());
  }

  async publish(account, content) {
    if (!account.accessToken) throw ApiError.unauthorized('Facebook access token missing');
    const text = [content.caption, content.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')].filter(Boolean).join('\n\n');

    if (content.mediaUrls && content.mediaUrls.length > 0) {
      const results = [];
      for (const url of content.mediaUrls) {
        const res = await this._api(`/${account.accountId}/photos`, account.accessToken, 'POST', {
          url,
          message: text,
          published: true,
        });
        results.push(res);
        if (res.error) throw ApiError.unprocessable(`Facebook API error: ${res.error.message}`, 'SOCIAL_PUBLISH_FAILED');
      }
      return { platform: 'facebook', postIds: results.map((r) => r.id), raw: results };
    }

    const res = await this._api(`/${account.accountId}/feed`, account.accessToken, 'POST', {
      message: text,
    });
    if (res.error) throw ApiError.unprocessable(`Facebook API error: ${res.error.message}`, 'SOCIAL_PUBLISH_FAILED');
    return { platform: 'facebook', postId: res.id, raw: res };
  }
}

module.exports = new FacebookProvider();
