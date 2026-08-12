const BaseProvider = require('./base');
const ApiError = require('../../utils/ApiError');

const API = 'https://api.linkedin.com/v2';

class LinkedInProvider extends BaseProvider {
  constructor() {
    super('linkedin');
  }

  async publish(account, content) {
    if (!account.accessToken) throw ApiError.unauthorized('LinkedIn access token missing');
    const text = [content.caption, content.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')].filter(Boolean).join('\n\n');

    let body;
    if (content.mediaUrls && content.mediaUrls.length) {
      const mediaRes = await fetch(`${API}/ugcPosts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: `urn:li:person:${account.accountId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text },
              shareMediaCategory: 'IMAGE',
              media: content.mediaUrls.slice(0, 9).map((url) => ({ status: 'READY', originalUrl: url })),
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      });
      const res = await mediaRes.json();
      if (!mediaRes.ok) throw ApiError.unprocessable(`LinkedIn API error: ${res.message || JSON.stringify(res)}`, 'SOCIAL_PUBLISH_FAILED');
      return { platform: 'linkedin', postId: res.id, raw: res };
    }

    const res = await fetch(`${API}/ugcPosts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: `urn:li:person:${account.accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw ApiError.unprocessable(`LinkedIn API error: ${json.message || JSON.stringify(json)}`, 'SOCIAL_PUBLISH_FAILED');
    return { platform: 'linkedin', postId: json.id, raw: json };
  }
}

module.exports = new LinkedInProvider();
