const fal = require('./fal.service');
const cloudinary = require('./cloudinary.service');
const Media = require('../models/Media');
const Brand = require('../models/Brand');
const ApiError = require('../utils/ApiError');
const { getOrCreateMemory } = require('./brandMemory.service');
const gemini = require('./gemini.service');

const LOGO_STYLES = ['text', 'icon', 'mascot', 'lettermark', 'emblem', 'combination'];

const styleDescriptions = {
  text: 'wordmark using the brand name in a premium custom typography treatment',
  icon: 'a minimal modern icon or symbol representing the brand',
  mascot: 'a friendly mascot character representing the brand',
  lettermark: 'an elegant monogram/lettermark using brand initials',
  emblem: 'a badge/emblem style logo with a seal-like composition',
  combination: 'a combination of icon plus brand name wordmark',
};

const buildLogoPrompt = (brand, { style, colors, description }) => {
  const styleDesc = styleDescriptions[style] || styleDescriptions.icon;
  const palette = (colors && colors.length ? colors.join(', ') : `${brand.colors?.primary}, ${brand.colors?.secondary}, ${brand.colors?.accent}`);
  return [
    `Professional ${style} logo for the brand "${brand.name}".`,
    `Style: ${styleDesc}.`,
    `Brand description: ${description || brand.description || brand.name}.`,
    `Use a clean color palette: ${palette}.`,
    `Design should be flat vector style, centered composition, isolated on a solid ${brand.colors?.background || 'white'} background, no photorealistic elements, no 3D rendering, high contrast, scalable, no text spelling errors, no watermark.`,
    `Output as a square logo mark suitable for a brand profile picture and social media use.`,
  ].join(' ');
};

const generateLogo = async ({ brand, user, style = 'icon', colors = null, description = null, count = 4, workspace }) => {
  const variants = [];
  for (let i = 0; i < count; i += 1) {
    const prompt = buildLogoPrompt(brand, {
      style,
      colors: colors || (brand.colors ? [brand.colors.primary, brand.colors.secondary, brand.colors.accent] : null),
      description,
    });
    const result = await fal.generateImage(prompt, { width: 1024, height: 1024 });
    let cloud = null;
    try {
      cloud = await cloudinary.uploadUrl(result.url, { folder: `brandpilot/${brand.workspace}/logos`, resourceType: 'image' });
    } catch (err) {
      console.warn('[image] cloudinary upload skipped for logo:', err.message);
    }
    variants.push({
      style,
      prompt,
      url: cloud ? cloud.url : result.url,
      publicId: cloud ? cloud.publicId : '',
      width: result.width,
      height: result.height,
    });
  }
  return variants;
};

const buildPostImagePrompt = (brand, { title, caption, price, extraText, imageConcept, buttonText }) => {
  const memory = (brand._memory) || {};
  const palette = [brand.colors?.primary, brand.colors?.secondary, brand.colors?.accent].filter(Boolean).join(', ');
  const lines = [
    `Premium professional social media marketing graphic for the brand "${brand.name}".`,
    `Brand theme: ${brand.theme}.`,
    `Color palette: ${palette || 'elegant dark navy with gold accents'}.`,
    `Fonts: ${brand.fonts?.heading || 'Sora'} for headings, ${brand.fonts?.body || 'Inter'} for body text.`,
  ];
  if (title) lines.push(`Headline text: "${title}" (short, bold, attention-grabbing).`);
  if (caption) lines.push(`Subtext: "${caption.slice(0, 120)}" (keep short).`);
  if (price) lines.push(`Price display: "${price}" as a highlighted badge.`);
  if (buttonText) lines.push(`A clear prominent button labeled "${buttonText}" (e.g., BUY NOW / SHOP NOW / ORDER NOW) displayed in the design.`);
  if (extraText) lines.push(`Additional text: "${extraText}".`);
  if (brand.logoUrl) lines.push(`Brand logo (${brand.logoUrl}) placed in a corner at ~15% size, without altering its look.`);
  if (imageConcept) lines.push(`Visual concept: ${imageConcept}`);
  lines.push(
    'Composition: high-end professional layout with clean typography, subtle gradients, realistic soft shadows and depth, ' +
    'balanced negative space, optimized for social media feed (square). No watermark, no low-quality artifacts, photorealistic premium finish.'
  );
  return lines.join(' ');
};

const withProductImage = async ({ brand, productImageUrl, prompt }) => {
  const basePrompt = prompt || buildPostImagePrompt(brand, {});
  return fal.generateImage(basePrompt, {
    imageUrl: productImageUrl,
    imagePrompt: 'Keep the provided product image EXACTLY as-is (do not change, crop or distort the product). ' +
      'Place it naturally into the generated premium background design, add realistic grounding shadows, ' +
      'matching lighting, and professional composition for a social media post.',
    width: 1080,
    height: 1080,
  });
};

const generatePostImage = async ({ brand, user, workspace, productImageUrl, title, caption, price, extraText, imageConcept, buttonText, customPrompt, useSavedIdentity = true }) => {
  const memory = await getOrCreateMemory(brand);
  brand._memory = memory;

  const prompt = customPrompt || buildPostImagePrompt(brand, { title, caption, price, extraText, imageConcept, buttonText });

  let result;
  if (productImageUrl) {
    result = await withProductImage({ brand, productImageUrl, prompt });
  } else {
    result = await fal.generateImage(prompt, { width: 1080, height: 1080 });
  }

  let cloud = null;
  try {
    cloud = await cloudinary.uploadUrl(result.url, { folder: `brandpilot/${brand.workspace}/posts`, resourceType: 'image' });
  } catch (err) {
    console.warn('[image] cloudinary upload skipped for post image:', err.message);
  }

  const media = await Media.create({
    workspace,
    brand: brand._id,
    uploadedBy: user,
    type: 'generated_image',
    url: cloud ? cloud.url : result.url,
    publicId: cloud ? cloud.publicId : '',
    width: result.width,
    height: result.height,
    metadata: { prompt, model: result.model },
  });

  return { media, prompt, url: media.url };
};

module.exports = { generateLogo, generatePostImage, buildPostImagePrompt, buildLogoPrompt, LOGO_STYLES };
