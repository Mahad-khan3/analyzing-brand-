const gemini = require('./gemini.service');
const ApiError = require('../utils/ApiError');
const { buildBrandContext, buildSystemPrompt, getOrCreateMemory, syncMemoryFromAnalysis } = require('./brandMemory.service');
const BrandAnalysis = require('../models/BrandAnalysis');

const JSON_SCHEMA_NOTE =
  '\nReturn the response ONLY as valid JSON. Do not include markdown, code fences or any extra text.';

const buildPayload = (context, instruction) => {
  const system = buildSystemPrompt();
  const user = `${system}\n\n--- BRAND MEMORY CONTEXT (always use this as the source of truth) ---\n${context}\n\n--- TASK ---\n${instruction}${JSON_SCHEMA_NOTE}`;
  return user;
};

const runGeneration = async ({ brand, type, instruction, temperature = 0.7, history, user, workspace, model }) => {
  const memory = await getOrCreateMemory(brand);
  const context = buildBrandContext(brand, memory);
  const prompt = buildPayload(context, instruction);

  const startedAt = Date.now();
  let result;
  try {
    result = history
      ? await gemini.chat(history, { temperature, model })
      : await gemini.generateText(prompt, { temperature, model });
  } catch (err) {
    await saveHistory({ brand, user, workspace, type, input: { instruction }, output: null, status: 'failed', errorMessage: err.message, durationMs: Date.now() - startedAt });
    throw err;
  }

  await saveHistory({
    brand,
    user,
    workspace,
    type,
    title: type.replace(/_/g, ' '),
    input: { instruction },
    output: { text: result.text },
    status: 'success',
    durationMs: Date.now() - startedAt,
    tokensUsed: result.tokensUsed,
    model: result.model,
  });

  return result.text;
};

const saveHistory = async (data) => {
  try {
    const AIHistory = require('../models/AIHistory');
    await AIHistory.create(data);
  } catch (err) {
    console.warn('[ai] history save failed:', err.message);
  }
};

const extractJSON = async (brand, type, instruction, user, workspace, { temperature = 0.4 } = {}) => {
  const memory = await getOrCreateMemory(brand);
  const context = buildBrandContext(brand, memory);
  const prompt = buildPayload(context, instruction);

  const startedAt = Date.now();
  try {
    const { json, text, tokensUsed, model } = await gemini.generateJSON(prompt, { temperature });
    await saveHistory({
      brand, user, workspace, type,
      title: type.replace(/_/g, ' '),
      input: { instruction },
      output: { json },
      status: 'success',
      durationMs: Date.now() - startedAt,
      tokensUsed,
      model,
    });
    return json;
  } catch (err) {
    await saveHistory({
      brand, user, workspace, type,
      input: { instruction },
      output: null,
      status: 'failed',
      errorMessage: err.message,
      durationMs: Date.now() - startedAt,
    });
    throw err;
  }
};

// ---------------------------------------------------------------- analyses

const extractWebsiteText = async (url) => {
  const clean = (u) => (u && !u.startsWith('http') ? `https://${u}` : u);
  try {
    const res = await fetch(clean(url), { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return '';
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 6000);
  } catch {
    return '';
  }
};

const analyzeExistingBusiness = async ({ brand, user, workspace }) => {
  const sources = [];
  if (brand.website) {
    const websiteText = await extractWebsiteText(brand.website);
    if (websiteText) sources.push(`WEBSITE (${brand.website}) CONTENT:\n${websiteText}`);
    else sources.push(`WEBSITE (${brand.website}): could not be fetched automatically (blocked or unreachable). Use the description only.`);
  }
  for (const key of ['instagram', 'facebook', 'linkedin', 'twitter', 'youtube']) {
    if (brand[key]) {
      sources.push(`${key.toUpperCase()} PROFILE: ${brand[key]} (content fetched via saved brand data only; no live scraping available without API connection).`);
    }
  }

  const instruction = `
Analyze the following business as a senior brand & social media strategist. Use the brand memory context plus these fetched sources:

--- COLLECTED SOURCES ---
${sources.join('\n\n') || 'No external sources available. Use the brand memory context only.'}

Produce a complete brand analysis document with EXACTLY this JSON structure:
{
  "category": "primary business category",
  "businessInfo": "2-3 sentence business summary",
  "products": ["array of products"],
  "services": ["array of services"],
  "targetAudience": {
    "description": "who the audience is",
    "demographics": "age/geography/etc",
    "interests": ["interest 1", "interest 2"],
    "painPoints": ["pain point 1"]
  },
  "competitors": ["competitor names/links"],
  "keywords": ["6-10 keywords"],
  "usp": "unique selling proposition",
  "brandVoice": "brand voice description",
  "writingStyle": "writing style",
  "marketingStyle": "marketing style",
  "contentStrategy": "content strategy summary",
  "hashtags": ["12-20 brand hashtags"],
  "cta": ["call to actions"],
  "faqs": ["frequently asked questions customers have"],
  "socialPresence": { "platform": "notes on their presence" },
  "socialPerformance": { "platform": "notes" },
  "brandColors": ["2-4 hex colors that fit the brand"],
  "fonts": ["2 recommended font names"]
}`;

  const json = await extractJSON(brand, 'brand_analysis', instruction, user, workspace);
  const analysis = await BrandAnalysis.create({
    brand: brand._id,
    workspace: brand.workspace,
    source: 'existing_business',
    ...json,
    analysisDate: new Date(),
  });
  await syncMemoryFromAnalysis(brand, analysis);
  await applyAnalysisToBrand(brand, analysis);
  return analysis;
};

const startupBlueprint = async ({ brand, user, workspace }) => {
  const instruction = `
This is a NEW STARTUP with no website or social presence yet. Act as a world-class brand strategist and design a complete brand blueprint.

Produce EXACTLY this JSON structure:
{
  "category": "business category",
  "businessInfo": "2-3 sentence business summary",
  "products": ["array of products"],
  "services": ["array of services"],
  "targetAudience": {
    "description": "who the audience is",
    "demographics": "age/geography/etc",
    "interests": ["interest 1", "interest 2"],
    "painPoints": ["pain point 1"]
  },
  "usp": "unique selling proposition",
  "positioning": "brand positioning statement",
  "brandVoice": "brand voice description",
  "writingStyle": "writing style",
  "marketingStyle": "marketing style",
  "contentStrategy": "content strategy summary",
  "keywords": ["6-10 keywords"],
  "brandColors": ["3 hex colors: primary, secondary, accent"],
  "fonts": ["2 recommended font names"],
  "hashtags": ["12-20 startup hashtags"],
  "cta": ["call to actions"]
}`;

  const json = await extractJSON(brand, 'startup_analysis', instruction, user, workspace);
  const analysis = await BrandAnalysis.create({
    brand: brand._id,
    workspace: brand.workspace,
    source: 'startup',
    category: json.category || '',
    businessInfo: json.businessInfo || brand.description || '',
    products: json.products || [],
    services: json.services || [],
    targetAudience: json.targetAudience || {},
    competitors: json.competitors || [],
    keywords: json.keywords || [],
    usp: json.usp || '',
    positioning: json.positioning || '',
    brandVoice: json.brandVoice || '',
    writingStyle: json.writingStyle || '',
    marketingStyle: json.marketingStyle || '',
    contentStrategy: json.contentStrategy || '',
    hashtags: json.hashtags || [],
    cta: json.cta || [],
    faqs: json.faqs || [],
    brandColors: json.brandColors || [],
    fonts: json.fonts || [],
    analysisDate: new Date(),
  });
  await syncMemoryFromAnalysis(brand, analysis);
  await applyAnalysisToBrand(brand, analysis);
  return analysis;
};

const applyAnalysisToBrand = async (brand, analysis) => {
  brand.category = analysis.category || brand.category;
  if (analysis.brandColors && analysis.brandColors.length >= 3) {
    brand.colors = {
      primary: analysis.brandColors[0],
      secondary: analysis.brandColors[1],
      accent: analysis.brandColors[2],
      background: brand.colors?.background || '#FFFFFF',
      text: brand.colors?.text || '#2D3436',
    };
  }
  await brand.save();
};

// ------------------------------------------------------------- generators

const POST_TYPES = ['promotional', 'educational', 'product_showcase', 'tips', 'story', 'meme', 'carousel', 'quote', 'before_after', 'announcement'];

const generatePostIdeas = async ({ brand, user, workspace, postType, topic, count = 8 }) => {
  const instruction = `
Generate ${count} fresh social media post ideas for the post type "${postType || 'mix'}"${topic ? ` on the topic "${topic}"` : ''}.
Cover engaging, platform-native concepts. Return EXACTLY this JSON structure:
{
  "ideas": [
    {
      "postType": "one of: ${POST_TYPES.join(', ')}",
      "title": "catchy post title",
      "idea": "2-3 sentence full post idea description",
      "caption": "a ready-to-post caption (30-60 words)",
      "cta": "one strong call to action",
      "hashtags": ["5-8 hashtags"],
      "imageConcept": "detailed visual concept description for the post image"
    }
  ]
}`;
  const json = await extractJSON(brand, 'post_idea', instruction, user, workspace);
  return { ideas: json.ideas || [] };
};

const generateCaption = async ({ brand, user, workspace, postType, topic, style, tone, keyPoints, product }) => {
  const instruction = `
Write ONE outstanding social media caption.
- Post type: ${postType || 'general'}
- Topic: ${topic || brand.name}
- Tone/style: ${style || tone || 'match the brand voice'}
${keyPoints ? `- Key points to include: ${keyPoints}` : ''}
${product ? `- Product/service to feature: ${product}` : ''}

Return EXACTLY this JSON structure:
{
  "caption": "the final caption",
  "title": "short post title",
  "cta": "call to action",
  "hashtags": ["8-12 relevant hashtags"],
  "notes": "brief explanation of choices"
}`;
  return extractJSON(brand, 'caption', instruction, user, workspace);
};

const generateHashtags = async ({ brand, user, workspace, topic, postType, count = 15 }) => {
  const instruction = `
Generate ${count} highly relevant hashtags ${topic ? `for the topic "${topic}"` : ''} ${postType ? `for post type "${postType}"` : ''}.
Mix broad and niche tags. Return EXACTLY this JSON structure:
{
  "hashtags": ["tag1", "tag2"],
  "recommended": "1-2 sentence guidance on usage"
}`;
  return extractJSON(brand, 'hashtag', instruction, user, workspace);
};

const generateContentCalendar = async ({ brand, user, workspace, frequency = 5, platforms = ['instagram'], days = 30, startDate }) => {
  const instruction = `
Create a ${days}-day content calendar starting ${startDate || 'today'} posting ${frequency} times per week on platforms: ${platforms.join(', ')}.
Return EXACTLY this JSON structure:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "platform": "instagram",
      "postType": "promotional | educational | ...",
      "title": "post title",
      "idea": "what to post",
      "caption": "draft caption",
      "hashtags": ["5-8 hashtags"],
      "cta": "call to action",
      "imageConcept": "visual concept"
    }
  ],
  "strategyNotes": "overall content strategy summary"
}`;
  const json = await extractJSON(brand, 'content_calendar', instruction, user, workspace);
  return json;
};

const generateUsernameSuggestions = async ({ brand, user, workspace }) => {
  const instruction = `
Generate 12 clever Instagram username suggestions for this brand.
Rules: easy to type, memorable, relevant to the category, ideally 4-20 characters, use underscores/dots/spaces tastefully.
Return EXACTLY this JSON structure:
{
  "usernames": [
    { "username": "suggestion", "availabilityStatus": "unknown", "reason": "short reason why it fits" }
  ]
}`;
  return extractJSON(brand, 'username_generation', instruction, user, workspace);
};

const improveCaption = async ({ brand, user, workspace, caption, instruction }) => {
  const context = await buildContextText(brand);
  const prompt = `${buildSystemPrompt()}\n\n--- BRAND MEMORY ---\n${context}\n\n--- TASK ---\nImprove this social media caption for the brand: ${JSON.stringify(caption)}\n${instruction ? `Also apply: ${instruction}` : 'Make it more engaging, on-brand and persuasive.'}\n\nReturn ONLY the improved caption text.`;
  const { text } = await gemini.generateText(prompt, { temperature: 0.7 });
  await saveHistory({ brand, user, workspace, type: 'caption', input: { caption, instruction }, output: { text }, status: 'success' });
  return text;
};

const analyzeCompetitor = async ({ brand, user, workspace, competitor }) => {
  const instruction = `
Analyze this competitor: NAME: ${competitor.name} | WEBSITE: ${competitor.website || 'n/a'} | INDUSTRY: ${competitor.industry || 'n/a'} | PROFILES: ${JSON.stringify(competitor.socialProfiles || {})}
Notes: ${competitor.notes || 'none'}

Return EXACTLY this JSON structure:
{
  "positioning": "their positioning",
  "content": "their content style",
  "hashtags": ["hashtags they likely use"],
  "topics": ["topics they cover"],
  "marketingStyle": "their marketing approach",
  "opportunities": ["3-5 gaps/opportunities for the brand"],
  "strengths": ["strengths"],
  "weaknesses": ["weaknesses"]
}`;
  return extractJSON(brand, 'competitor_analysis', instruction, user, workspace);
};

const brandChat = async ({ brand, user, workspace, message, history = [] }) => {
  const memory = await getOrCreateMemory(brand);
  const context = buildBrandContext(brand, memory);
  const systemPrompt = `${buildSystemPrompt()}\n\n--- BRAND MEMORY (use as source of truth) ---\n${context}\n\nYou are BrandPilot AI. Answer the user's brand questions using this memory. Be concise and actionable.`;

  const messages = [{ role: 'user', content: systemPrompt }];
  history.slice(-10).forEach((m) => {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  });
  messages.push({ role: 'user', content: message });

  const { text, tokensUsed } = await gemini.chat(messages, { temperature: 0.7 });
  await saveHistory({
    brand, user, workspace, type: 'brand_chat',
    input: { message }, output: { text },
    status: 'success', tokensUsed,
  });
  return text;
};

const buildContextText = async (brand) => {
  const memory = await getOrCreateMemory(brand);
  return buildBrandContext(brand, memory);
};

const generateBrandKit = async ({ brand, user, workspace }) => {
  const instruction = `
Create a complete brand starter kit for this business. Act as a world-class brand strategist.

Produce a detailed JSON document with EXACTLY this structure:
{
  "businessSummary": "2-3 sentence complete summary of the business: what it does, who it serves, why it matters",
  "businessDetails": {
    "name": "business name",
    "category": "business category",
    "offerings": "what products/services are offered",
    "audience": "who the target audience is",
    "tone": "the brand tone to use",
    "goal": "the main business/marketing goal"
  },
  "websiteIdeas": [
    { "name": "brandable website name", "url": "the .com/.shop/.co domain suggestion", "reason": "why this name works" }
  ],
  "references": [
    { "name": "reference brand or inspiration", "url": "their website if known", "whatToLearn": "what to learn from them" }
  ],
  "usernames": [
    { "username": "suggestion", "availabilityStatus": "unknown", "reason": "short reason why it fits" }
  ],
  "postIdeas": [
    {
      "postType": "promotional | educational | product_showcase | tips | story | meme | carousel | quote | before_after | announcement",
      "title": "catchy post title",
      "idea": "2-3 sentence full post idea",
      "caption": "a ready-to-post caption (30-60 words)",
      "cta": "one strong call to action",
      "hashtags": ["5-8 hashtags"],
      "imageConcept": "detailed visual concept for the post image"
    }
  ]
}

Guidelines:
- websiteIdeas: 5-6 ideas.
- references: 3-5 ideas.
- usernames: 10-12 ideas, 4-20 characters, easy to type and memorable.
- postIdeas: 6 ideas, platform-native and engaging.`;
  const kit = await extractJSON(brand, 'brand_kit', instruction, user, workspace);
  return {
    businessSummary: kit.businessSummary || '',
    businessDetails: kit.businessDetails || {},
    websiteIdeas: Array.isArray(kit.websiteIdeas) ? kit.websiteIdeas : [],
    references: Array.isArray(kit.references) ? kit.references : [],
    usernames: Array.isArray(kit.usernames) ? kit.usernames : [],
    postIdeas: Array.isArray(kit.postIdeas) ? kit.postIdeas : [],
  };
};

const startupKickoff = async ({ brand, user, workspace }) => {
  const instruction = `
This is a brand-new startup with no website or social presence yet. Act as a world-class brand strategist and produce a complete from-scratch launch plan for "${brand.name}" (${brand.description || brand.category || 'category not specified'}).

Return EXACTLY this JSON structure:
{
  "businessInfo": "2-3 sentence summary of what the business does, who it serves, and why it matters",
  "category": "recommended business category",
  "brandNameIdeas": [
    { "name": "brandable name for Instagram/brand use", "reason": "why it fits", "availableSuffixes": "e.g. @name, name.co" }
  ],
  "usernames": [
    { "username": "instagram username idea", "availabilityStatus": "unknown", "reason": "why it works" }
  ],
  "websiteAdvice": {
    "sections": ["homepage", "about", "products", "testimonials", "contact"],
    "content": "what content each section should have (2-3 sentences)",
    "theme": "recommended website theme/design direction based on the business",
    "colors": ["3-4 hex colors"],
    "fonts": ["2 recommended font names"]
  },
  "references": [
    { "name": "reference brand in the same industry", "url": "their website URL", "whatToLearn": "what to learn from them" }
  ],
  "postIdeas": [
    {
      "postType": "one of: promotional, educational, product_showcase, tips, story, meme, carousel, quote, before_after, announcement",
      "title": "catchy post title",
      "idea": "2-3 sentence full post idea",
      "caption": "ready-to-post caption (30-60 words)",
      "cta": "one strong call to action",
      "hashtags": ["5-8 hashtags"],
      "imageConcept": "detailed visual concept for the post image"
    }
  ],
  "schedule": [
    { "day": "Monday", "postType": "educational", "time": "11:00 AM", "title": "post title", "reason": "why this slot works" }
  ],
  "bio": "a 150-character ready-to-use Instagram/brand bio that can also be copied to other profiles"
}

Guidelines:
- brandNameIdeas: 6 ideas, easy to say, spell and type, brandable.
- usernames: 8 ideas, 4-20 characters.
- references: 4-5 real well-known websites/brands in the same industry (only well-known ones).
- postIdeas: 6 ideas, platform-native and engaging.
- schedule: one row per day of the week (7 rows) with the best posting time.`;
  const json = await extractJSON(brand, 'startup_kickoff', instruction, user, workspace);
  return {
    businessInfo: json.businessInfo || '',
    category: json.category || '',
    brandNameIdeas: Array.isArray(json.brandNameIdeas) ? json.brandNameIdeas : [],
    usernames: Array.isArray(json.usernames) ? json.usernames : [],
    websiteAdvice: json.websiteAdvice || {},
    references: Array.isArray(json.references) ? json.references : [],
    postIdeas: Array.isArray(json.postIdeas) ? json.postIdeas : [],
    schedule: Array.isArray(json.schedule) ? json.schedule : [],
    bio: json.bio || '',
  };
};

const logoTips = async ({ brand, user, workspace }) => {
  const instruction = `
Analyze the current branding of "${brand.name}" (${brand.category || brand.description || 'business'}).
The brand's current logo is: ${brand.logoUrl ? `available at ${brand.logoUrl}` : 'not set yet'}.
Recommended brand colors: ${brand.colors ? `${brand.colors.primary}, ${brand.colors.secondary}, ${brand.colors.accent}` : 'not set'}.

Return EXACTLY this JSON structure:
{
  "currentVerdict": "1-2 sentence honest assessment of the current logo (or that no logo exists yet)",
  "issues": ["3-5 problems with the current logo, if any"],
  "recommendedStyle": "one of: text/wordmark, icon, mascot, lettermark, emblem, combination",
  "recommendation": "detailed recommendation on what kind of logo the brand should have, with reasoning",
  "colors": ["2-4 recommended colors with a short reason per color as {color} - {reason}"],
  "tips": ["5-7 actionable logo improvement tips"],
  "promptIdeas": ["3 ready-to-use image generation prompts to create a better logo"]
}`;
  return extractJSON(brand, 'logo_tips', instruction, user, workspace);
};

const websiteAdvice = async ({ brand, user, workspace }) => {
  const hasWebsite = Boolean(brand.website);
  const instruction = `
Business: "${brand.name}" (${brand.category || brand.description || 'no category'}).
Current website: ${brand.website || 'NONE — this business has no website yet.'}
${hasWebsite ? 'The user already has a website and wants concrete improvements.' : 'The user has no website and needs advice to build one from scratch.'}

Return EXACTLY this JSON structure:
{
  "hasWebsite": ${hasWebsite},
  "summary": "2-3 sentence overview of the situation and the priority actions",
  ${hasWebsite
    ? `"improvements": [
      { "area": "homepage / speed / SEO / mobile / copy / trust / checkout etc.", "problem": "what is likely wrong", "fix": "what to change and how" }
    ],
    "contentSuggestions": ["4-6 content/feature suggestions for the website"],`
    : `"theme": "recommended website theme and design direction for this business",
    "sections": ["homepage", "about", "products/services", "testimonials", "contact"],
    "content": "what content each section needs (2-3 sentences)",
    "recommendedTools": ["easy website builders suitable for a small business"],`}
  "colors": ["3-4 hex colors"],
  "fonts": ["2 recommended fonts"],
  "references": [
    { "name": "well-known website in the same industry", "url": "URL", "whatToLearn": "what to learn" }
  ]
}`;
  return extractJSON(brand, 'website_advice', instruction, user, workspace);
};

const productPostIdeas = async ({ brand, user, workspace, productName, salePrice, offer, count = 3 }) => {
  const instruction = `
Create ${count} high-converting PRODUCT SHOWCASE post ideas for "${brand.name}".
Product: ${productName || brand.name}
Sale price / offer: ${salePrice || 'Regular price'}, ${offer || 'mention the current offer/buy-now call'}

Each post must showcase the product with: product name, brand name, sale price, and a strong "Buy Now" / offer button.
Return EXACTLY this JSON structure:
{
  "ideas": [
    {
      "postType": "product_showcase",
      "title": "catchy post title",
      "idea": "2-3 sentence description of the visual and copy for the post",
      "caption": "ready-to-post caption (30-60 words) that includes the product name, brand name, price and offer",
      "cta": "one strong call to action (e.g. 'Buy Now')",
      "hashtags": ["5-8 hashtags"],
      "imageConcept": "detailed visual concept: product name, brand name, sale price and Buy Now button placement in the design"
    }
  ]
}`;
  const json = await extractJSON(brand, 'product_post_idea', instruction, user, workspace);
  return { ideas: json.ideas || [] };
};

const generateBio = async ({ brand, user, workspace, platform }) => {
  const instruction = `
Write a short, punchy brand bio for "${brand.name}" (${brand.category || brand.description || 'business'}) for ${platform || 'Instagram'}.
Include what they do, who it is for, and one hook. Keep it under 160 characters for Instagram.

Return EXACTLY this JSON structure:
{
  "bio": "the final bio (under 160 chars)",
  "alternates": ["3 alternate bio versions"],
  "keywords": ["4-6 words/hashtags to add"],
  "tips": ["3-4 tips on what to put in the profile bio"]
}`;
  return extractJSON(brand, 'bio', instruction, user, workspace);
};

const postingSchedule = async ({ brand, user, workspace, platforms }) => {
  const instruction = `
Create a weekly social media posting schedule for "${brand.name}" (${brand.category || brand.description || 'business'}).
Platforms: ${(platforms && platforms.length ? platforms.join(', ') : 'Instagram, Facebook, LinkedIn')}.

Return EXACTLY this JSON structure:
{
  "schedule": [
    { "day": "Monday", "time": "best time", "platform": "platform", "postType": "post type", "title": "suggested post", "reason": "why this slot works" }
  ],
  "notes": "2-3 sentence overall guidance on how often to post and when"
}`;
  const json = await extractJSON(brand, 'posting_schedule', instruction, user, workspace);
  return json;
};

module.exports = {
  analyzeExistingBusiness,
  startupBlueprint,
  startupKickoff,
  logoTips,
  websiteAdvice,
  productPostIdeas,
  generateBio,
  postingSchedule,
  generateBrandKit,
  generatePostIdeas,
  generateCaption,
  generateHashtags,
  generateContentCalendar,
  generateUsernameSuggestions,
  improveCaption,
  analyzeCompetitor,
  brandChat,
  getBrandMemory: getOrCreateMemory,
  POST_TYPES,
};
