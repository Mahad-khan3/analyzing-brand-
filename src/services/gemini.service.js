const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

class GeminiService {
  constructor() {
    this.model = env.GEMINI_MODEL;
    this.hasKey = env.hasGemini();
  }

  ensureConfigured() {
    if (!this.hasKey) {
      throw ApiError.unprocessable(
        'Gemini API key is not configured on the server. Add GEMINI_API_KEY to the backend .env file.',
        'GEMINI_NOT_CONFIGURED'
      );
    }
  }

  async _generateText(prompt, { temperature, maxOutputTokens, model } = {}) {
    this.ensureConfigured();
    const url = `${BASE_URL}/models/${model || this.model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature !== undefined ? temperature : env.GEMINI_TEMPERATURE,
        maxOutputTokens: maxOutputTokens || env.GEMINI_MAX_TOKENS,
      },
    };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw ApiError.unprocessable(`Gemini API unreachable: ${err.message}`, 'AI_SERVICE_ERROR');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error?.message || `Gemini API error (${res.status})`;
      if (res.status === 429) throw ApiError.tooManyRequests('AI rate limit reached, try again soon', 'AI_RATE_LIMITED');
      throw ApiError.unprocessable(msg, 'AI_SERVICE_ERROR');
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const usage = data?.usageMetadata || {};
    if (!text) throw ApiError.unprocessable('AI returned an empty response', 'AI_EMPTY_RESPONSE');

    return { text, tokensUsed: usage.totalTokenCount || 0, model: model || this.model };
  }

  async generateText(prompt, opts = {}) {
    return this._generateText(prompt, opts);
  }

  async generateJSON(prompt, opts = {}) {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no extra text.`;
    const { text, ...rest } = await this._generateText(jsonPrompt, {
      temperature: 0.4,
      ...opts,
    });
    return { json: parseJSON(text), text, ...rest };
  }

  async chat(messages, opts = {}) {
    this.ensureConfigured();
    const url = `${BASE_URL}/models/${opts.model || this.model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
    const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const body = {
      contents,
      generationConfig: {
        temperature: opts.temperature !== undefined ? opts.temperature : env.GEMINI_TEMPERATURE,
        maxOutputTokens: opts.maxOutputTokens || env.GEMINI_MAX_TOKENS,
      },
    };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw ApiError.unprocessable(`Gemini API unreachable: ${err.message}`, 'AI_SERVICE_ERROR');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw ApiError.unprocessable(data?.error?.message || `Gemini API error (${res.status})`, 'AI_SERVICE_ERROR');
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) throw ApiError.unprocessable('AI returned an empty response', 'AI_EMPTY_RESPONSE');
    return { text, tokensUsed: data?.usageMetadata?.totalTokenCount || 0 };
  }
}

function parseJSON(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw ApiError.unprocessable('AI returned invalid JSON', 'AI_INVALID_JSON');
  }
}

module.exports = new GeminiService();
