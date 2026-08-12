const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    profileImage: { type: String, default: '' },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    preferences: {
      timezone: { type: String, default: 'UTC' },
      defaultWorkspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
      contentDefaults: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    emailVerificationToken: { type: String },
    emailVerificationCode: { type: String },
    emailVerifiedAt: { type: Date, default: null },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
