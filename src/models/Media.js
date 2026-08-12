const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['image', 'video', 'logo', 'product_image', 'generated_image', 'document', 'other'],
      default: 'image',
      index: true,
    },
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: 'image' },
    format: { type: String, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    sizeBytes: { type: Number, default: 0 },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    altText: { type: String, default: '' },
  },
  { timestamps: true }
);

mediaSchema.index({ workspace: 1, brand: 1, type: 1 });

module.exports = mongoose.model('Media', mediaSchema);
