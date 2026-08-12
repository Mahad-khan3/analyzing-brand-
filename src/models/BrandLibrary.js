const mongoose = require('mongoose');

const libraryAssetSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assetType: {
      type: String,
      required: true,
      enum: ['logo', 'post_image', 'product_image', 'post_idea', 'caption', 'hashtag_set', 'video', 'document', 'other'],
      index: true,
    },
    name: { type: String, default: '' },
    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    cta: { type: String, default: '' },
    prompt: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    folder: { type: String, default: 'General' },
    isFavorite: { type: Boolean, default: false },
    sourceHistory: { type: mongoose.Schema.Types.ObjectId, ref: 'AIHistory', default: null },
    isBrandLogo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

libraryAssetSchema.index({ workspace: 1, brand: 1, assetType: 1 });
libraryAssetSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BrandLibrary', libraryAssetSchema);
