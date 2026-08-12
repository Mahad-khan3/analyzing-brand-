const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isFalBillingIssue = (msg) =>
  /locked|balance|billing|insufficient|billing_required|403/i.test(msg || '');

class FalService {
  constructor() {
    this.baseUrl = env.FAL_BASE_URL;
    this.defaultModel = env.FAL_MODEL;
    this.timeout = env.FAL_TIMEOUT_MS;
    this.hasKey = env.hasFal();
  }

  ensureConfigured() {
    if (!this.hasKey) {
      throw ApiError.unprocessable(
        'FAL key is not configured on the server. Add FAL_KEY to the backend .env file.',
        'FAL_NOT_CONFIGURED'
      );
    }
  }

  // Try fal.ai first (best quality). If it is out of balance, not configured,
  // or errors for any reason, fall back to the free Pollinations service so the
  // app keeps working without a paid image account.
  async generateImage(prompt, opts = {}) {
    if (this.hasKey) {
      try {
        return await this.generateWithFal(prompt, opts);
      } catch (err) {
        const message = err?.message || String(err);
        if (isFalBillingIssue(message)) {
          console.warn('[image] fal.ai billing/balance issue, using free fallback:', message);
        } else {
          console.warn('[image] fal.ai generation failed, using free fallback:', message);
        }
      }
    }
    return this.generateWithPollinations(prompt, opts);
  }

  async generateWithFal(prompt, { model, width, height, imageUrl, imagePrompt } = {}) {
    this.ensureConfigured();
    const selectedModel = model || this.defaultModel;
    const input = {
      prompt,
      image_size: {
        width: width || env.FLUX_DEFAULT_WIDTH,
        height: height || env.FLUX_DEFAULT_HEIGHT,
      },
      num_images: 1,
      sync_mode: false,
    };

    if (imageUrl) input.image_url = imageUrl;
    if (imagePrompt) input.image_prompt = imagePrompt;

    const queueUrl = `${this.baseUrl}/${selectedModel}`;
    const headers = {
      Authorization: `Key ${env.FAL_KEY}`,
      'Content-Type': 'application/json',
    };

    let submitRes;
    try {
      submitRes = await fetch(queueUrl, { method: 'POST', headers, body: JSON.stringify(input) });
    } catch (err) {
      throw ApiError.unprocessable(`Image service unreachable: ${err.message}`, 'IMAGE_SERVICE_ERROR');
    }

    if (!submitRes.ok) {
      const bodyText = await submitRes.text().catch(() => '');
      throw ApiError.unprocessable(`Image generation failed (${submitRes.status}): ${bodyText}`, 'IMAGE_SERVICE_ERROR');
    }

    const { request_id: requestId, status_url: statusUrl, response_url: responseUrl } = await submitRes.json();
    if (!requestId) throw ApiError.unprocessable('Image service did not return a request id', 'IMAGE_SERVICE_ERROR');

    const startedAt = Date.now();
    for (;;) {
      if (Date.now() - startedAt > this.timeout) {
        throw ApiError.unprocessable('Image generation timed out', 'IMAGE_TIMEOUT');
      }
      await sleep(2500);

      let statusRes;
      try {
        statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${env.FAL_KEY}` } });
      } catch {
        continue;
      }
      if (!statusRes.ok) continue;
      const status = await statusRes.json().catch(() => ({}));
      if (status.status === 'COMPLETED' || status.status === 'SUCCEEDED') break;
      if (status.status === 'FAILED' || status.status === 'CANCELLED') {
        throw ApiError.unprocessable('Image generation failed', 'IMAGE_GENERATION_FAILED');
      }
    }

    let result;
    try {
      const resultRes = await fetch(responseUrl, { headers: { Authorization: `Key ${env.FAL_KEY}` } });
      if (!resultRes.ok) throw new Error('bad result status');
      result = await resultRes.json();
    } catch (err) {
      throw ApiError.unprocessable(`Failed to fetch generated image: ${err.message}`, 'IMAGE_SERVICE_ERROR');
    }

    const image = result?.images?.[0] || result?.image || result;
    const url = image?.url || image?.image_url || result?.url;
    if (!url) throw ApiError.unprocessable('Image service returned no image', 'IMAGE_SERVICE_ERROR');

    return {
      url,
      width: image?.width || null,
      height: image?.height || null,
      model: selectedModel,
      raw: result,
    };
  }

  // Free fallback — no API key needed. Pollinations generates the image on
  // request; the returned URL is used both for display and cloudinary upload.
  async generateWithPollinations(prompt, { width, height } = {}) {
    const w = width || env.FLUX_DEFAULT_WIDTH || 1080;
    const h = height || env.FLUX_DEFAULT_HEIGHT || 1080;
    const seed = Math.floor(Math.random() * 1e9);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;

    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(this.timeout) });
    } catch (err) {
      throw ApiError.unprocessable(
        'Image service unreachable (both fal.ai and the free fallback failed). Top up fal.ai at https://fal.ai/dashboard/billing or check your connection.',
        'IMAGE_SERVICE_ERROR'
      );
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw ApiError.unprocessable(
        `Image generation failed (${res.status}): ${bodyText}. Top up fal.ai at https://fal.ai/dashboard/billing or try again.`,
        'IMAGE_SERVICE_ERROR'
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw ApiError.unprocessable('Image service returned an invalid response', 'IMAGE_SERVICE_ERROR');
    }

    return { url, width: w, height: h, model: 'pollinations', raw: null };
  }
}

module.exports = new FalService();
