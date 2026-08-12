const ai = require('../services/ai.service');
const imageDesign = require('../services/imageDesign.service');
const ApiErrorBadRequest = require('../utils/ApiError').badRequest;
const ApiErrorNotFound = require('../utils/ApiError').notFound;
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../services/cloudinary.service');
const Media = require('../models/Media');
const BrandLibrary = require('../models/BrandLibrary');
const AIHistory = require('../models/AIHistory');
const { audit } = require('../services/audit.service');
const { recordAIUsage } = require('../services/subscription.service');

const track = (req, action, category = 'ai', extra = {}) =>
  audit(req, action, category, { ...extra, brand: req.brand?._id, description: extra.description || action });

const runAnalysis = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const analysis = brand.isStartup
    ? await ai.startupBlueprint({ brand, user: req.user, workspace: req.workspace._id })
    : await ai.analyzeExistingBusiness({ brand, user: req.user, workspace: req.workspace._id });

  brand.onboarding.status = 'in_progress';
  await brand.save();
  await track(req, 'ai.brand_analysis', 'ai', { metadata: { source: analysis.source } });
  return success(res, 200, { analysis }, 'Brand analysis complete');
});

const runBrandKit = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const { mode } = req.body;

  if (mode === 'startup') brand.isStartup = true;
  else if (mode === 'existing') brand.isStartup = false;
  brand.onboarding.status = 'analyzing';
  brand.onboarding.currentStep = 1;
  await brand.save();

  const analysis = brand.isStartup
    ? await ai.startupBlueprint({ brand, user: req.user, workspace: req.workspace._id })
    : await ai.analyzeExistingBusiness({ brand, user: req.user, workspace: req.workspace._id });

  const kit = await ai.generateBrandKit({ brand, user: req.user, workspace: req.workspace._id });

  analysis.brandKit = kit;
  await analysis.save();

  brand.onboarding.status = 'identity_saved';
  brand.onboarding.currentStep = 99;
  ['analysis', 'usernames'].forEach((step) => {
    if (!brand.onboarding.stepsCompleted.includes(step)) brand.onboarding.stepsCompleted.push(step);
  });
  await brand.save();

  await track(req, 'ai.brand_kit', 'ai', { metadata: { mode, source: analysis.source } });
  return success(res, 200, { analysis, kit }, 'Brand kit complete');
});

const getBrandMemory = asyncHandler(async (req, res) => {
  const memory = await ai.getBrandMemory(req.brand);
  return success(res, 200, { memory }, 'Brand memory');
});

const usernameSuggestions = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { usernames } = await ai.generateUsernameSuggestions({ brand: req.brand, user: req.user, workspace: req.workspace._id });
  await track(req, 'ai.username_generation');
  return success(res, 200, { usernames }, 'Username suggestions generated');
});

const saveUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;
  req.brand.username = username;
  await req.brand.save();
  return success(res, 200, { brand: req.brand }, 'Username saved');
});

const generateLogos = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { style = 'icon', count = 4, colors, description } = req.body;
  const variants = await imageDesign.generateLogo({
    brand: req.brand,
    user: req.user._id,
    workspace: req.workspace._id,
    style,
    count: Math.min(count, 6),
    colors,
    description,
  });

  const assets = [];
  for (const v of variants) {
    const asset = await BrandLibrary.create({
      workspace: req.workspace._id,
      brand: req.brand._id,
      user: req.user._id,
      assetType: 'logo',
      name: `${req.brand.name} logo (${style})`,
      imageUrl: v.url,
      publicId: v.publicId || '',
      prompt: v.prompt,
      tags: ['logo', style],
      data: { style: v.style },
    });
    assets.push(asset);
  }
  await track(req, 'ai.logo_generation', 'ai', { metadata: { style, count: variants.length } });
  return success(res, 200, { variants, assets }, 'Logos generated');
});

const setBrandLogo = asyncHandler(async (req, res) => {
  const { logoUrl, publicId, style, theme, colors, assetId } = req.body;
  const brand = req.brand;
  if (logoUrl) {
    brand.logoUrl = logoUrl;
    if (publicId) brand.logoPublicId = publicId;
    if (style) brand.logoStyle = style;
    if (theme) brand.theme = theme;
    if (colors) {
      brand.colors = {
        primary: colors.primary || brand.colors?.primary,
        secondary: colors.secondary || brand.colors?.secondary,
        accent: colors.accent || brand.colors?.accent,
        background: colors.background || brand.colors?.background || '#FFFFFF',
        text: colors.text || brand.colors?.text || '#2D3436',
      };
    }
    await brand.save();

    if (assetId) {
      await BrandLibrary.updateMany({ _id: assetId }, { isBrandLogo: true });
      await BrandLibrary.updateMany({ brand: brand._id, _id: { $ne: assetId } }, { isBrandLogo: false });
    } else {
      await BrandLibrary.updateMany({ brand: brand._id, imageUrl: logoUrl }, { isBrandLogo: true });
    }
  }
  await track(req, 'ai.logo_set', 'ai');
  return success(res, 200, { brand }, 'Brand logo updated');
});

const postIdeas = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { postType, topic, count } = req.body;
  const result = await ai.generatePostIdeas({ brand: req.brand, user: req.user, workspace: req.workspace._id, postType, topic, count });
  await track(req, 'ai.post_ideas');
  return success(res, 200, result, 'Post ideas generated');
});

const caption = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { postType, topic, style, tone, keyPoints, product } = req.body;
  const result = await ai.generateCaption({ brand: req.brand, user: req.user, workspace: req.workspace._id, postType, topic, style, tone, keyPoints, product });
  await track(req, 'ai.caption');
  return success(res, 200, result, 'Caption generated');
});

const hashtags = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { topic, postType, count } = req.body;
  const result = await ai.generateHashtags({ brand: req.brand, user: req.user, workspace: req.workspace._id, topic, postType, count });
  await track(req, 'ai.hashtags');
  return success(res, 200, result, 'Hashtags generated');
});

const improveCaption = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { caption, instruction } = req.body;
  if (!caption) return success(res, 400, null, 'Caption is required');
  const improved = await ai.improveCaption({ brand: req.brand, user: req.user, workspace: req.workspace._id, caption, instruction });
  await track(req, 'ai.improve_caption');
  return success(res, 200, { caption: improved }, 'Caption improved');
});

const generatePostImage = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { title, caption, price, extraText, imageConcept, productImageUrl, mediaId, buttonText, customPrompt } = req.body;
  let productUrl = productImageUrl;
  if (!productUrl && mediaId) {
    const media = await Media.findOne({ _id: mediaId, workspace: req.workspace._id });
    productUrl = media?.url;
  }

  const result = await imageDesign.generatePostImage({
    brand: req.brand,
    user: req.user._id,
    workspace: req.workspace._id,
    productImageUrl: productUrl,
    title,
    caption,
    price,
    extraText,
    imageConcept,
    buttonText,
    customPrompt,
  });

  const asset = await BrandLibrary.create({
    workspace: req.workspace._id,
    brand: req.brand._id,
    user: req.user._id,
    assetType: 'post_image',
    name: `${req.brand.name} post image`,
    imageUrl: result.url,
    publicId: result.media.publicId || '',
    prompt: result.prompt,
    tags: ['post', 'generated'],
    data: { title, caption, price },
  });

  await track(req, 'ai.image_generation', 'ai', { metadata: { productImage: Boolean(productUrl) } });
  return success(res, 200, { ...result, asset }, 'Post image generated');
});

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiErrorBadRequest('Product image is required');
  const up = await cloudinary.uploadBuffer(req.file.buffer, { folder: `brandpilot/${req.workspace._id}/products`, resourceType: 'image' });
  const media = await Media.create({
    workspace: req.workspace._id,
    brand: req.brand._id,
    uploadedBy: req.user._id,
    type: 'product_image',
    url: up.url,
    publicId: up.publicId,
    width: up.width,
    height: up.height,
    sizeBytes: up.sizeBytes,
    mimeType: req.file.mimetype,
    filename: req.file.originalname,
  });
  await track(req, 'media.product_uploaded', 'media');
  return success(res, 201, { media }, 'Product image uploaded');
});

const generateContentCalendar = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { frequency, platforms, days, startDate } = req.body;
  const result = await ai.generateContentCalendar({
    brand: req.brand, user: req.user, workspace: req.workspace._id,
    frequency, platforms, days, startDate,
  });
  await track(req, 'ai.content_calendar');
  return success(res, 200, result, 'Content calendar generated');
});

const competitorAnalysis = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const Competitor = require('../models/Competitor');
  const competitor = await Competitor.findOne({ _id: req.params.competitorId, workspace: req.workspace._id });
  if (!competitor) throw ApiErrorNotFound('Competitor not found');
  const analysis = await ai.analyzeCompetitor({ brand: req.brand, user: req.user, workspace: req.workspace._id, competitor });
  competitor.analysis = analysis;
  competitor.analyzedAt = new Date();
  await competitor.save();
  await track(req, 'ai.competitor_analysis');
  return success(res, 200, { analysis, competitor }, 'Competitor analyzed');
});

const chat = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { message, history } = req.body;
  if (!message) throw ApiErrorBadRequest('Message is required');
  const reply = await ai.brandChat({ brand: req.brand, user: req.user, workspace: req.workspace._id, message, history });
  await track(req, 'ai.brand_chat');
  return success(res, 200, { reply }, 'Reply generated');
});

const history = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const filter = { brand: req.brand._id };
  if (type) filter.type = type;
  const items = await AIHistory.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await AIHistory.countDocuments(filter);
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'AI history');
});

const allHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, type } = req.query;
  const filter = { workspace: req.workspace._id };
  if (type) filter.type = type;
  const items = await AIHistory.find(filter)
    .populate('brand', 'name logoUrl category')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await AIHistory.countDocuments(filter);
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'AI history');
});

const startupKickoff = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { platforms } = req.body;
  const plan = await ai.startupKickoff({ brand: req.brand, user: req.user, workspace: req.workspace._id });
  if (platforms && platforms.length) {
    try {
      const sched = await ai.postingSchedule({ brand: req.brand, user: req.user, workspace: req.workspace._id, platforms });
      plan.schedule = sched.schedule || plan.schedule;
      plan.scheduleNotes = sched.notes || '';
    } catch { /* schedule is optional */ }
  }
  await track(req, 'ai.startup_kickoff', 'ai');
  return success(res, 200, { plan }, 'Startup plan generated');
});

const logoTips = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const tips = await ai.logoTips({ brand: req.brand, user: req.user, workspace: req.workspace._id });
  await track(req, 'ai.logo_tips', 'ai');
  return success(res, 200, { tips }, 'Logo tips generated');
});

const websiteAdvice = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const advice = await ai.websiteAdvice({ brand: req.brand, user: req.user, workspace: req.workspace._id });
  await track(req, 'ai.website_advice', 'ai');
  return success(res, 200, { advice }, 'Website advice generated');
});

const productPostIdeas = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { productName, salePrice, offer, count } = req.body;
  const result = await ai.productPostIdeas({
    brand: req.brand, user: req.user, workspace: req.workspace._id,
    productName, salePrice, offer, count,
  });
  await track(req, 'ai.product_post_idea', 'ai');
  return success(res, 200, result, 'Product post ideas generated');
});

const bio = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { platform } = req.body;
  const result = await ai.generateBio({ brand: req.brand, user: req.user, workspace: req.workspace._id, platform });
  await track(req, 'ai.bio', 'ai');
  return success(res, 200, result, 'Bio generated');
});

const postingSchedule = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { platforms } = req.body;
  const result = await ai.postingSchedule({ brand: req.brand, user: req.user, workspace: req.workspace._id, platforms });
  await track(req, 'ai.posting_schedule', 'ai');
  return success(res, 200, result, 'Posting schedule generated');
});

const generateComboPost = asyncHandler(async (req, res) => {
  await recordAIUsage(req.workspace._id);
  const { postType, topic, style } = req.body;
  const idea = await ai.generatePostIdeas({ brand: req.brand, user: req.user, workspace: req.workspace._id, postType, topic, count: 1 });
  const first = idea.ideas[0] || {};
  const cap = await ai.generateCaption({
    brand: req.brand, user: req.user, workspace: req.workspace._id,
    postType: first.postType || postType, topic, style, keyPoints: first.idea,
  });
  await track(req, 'ai.post_generation');
  return success(res, 200, { idea: first, ...cap }, 'Post generated');
});

module.exports = {
  runAnalysis, runBrandKit, getBrandMemory, usernameSuggestions, saveUsername, generateLogos, setBrandLogo,
  postIdeas, caption, hashtags, improveCaption, generatePostImage, uploadProductImage,
  generateContentCalendar, competitorAnalysis, chat, history, allHistory, generateComboPost,
  startupKickoff, logoTips, websiteAdvice, productPostIdeas, bio, postingSchedule,
};
