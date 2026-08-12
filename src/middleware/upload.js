const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  return cb(new Error('Unsupported file type. Allowed: jpeg, png, gif, webp, mp4, mov, pdf'));
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 10 },
  fileFilter,
});

const multerMemory = multer.memoryStorage();

module.exports = { upload, multerMemory, MAX_SIZE };
