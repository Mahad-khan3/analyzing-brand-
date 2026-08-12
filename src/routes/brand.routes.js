const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/brand.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const { loadBrand } = require('../middleware/resource');
const validate = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { createBrandValidator, updateBrandValidator } = require('../validators/app.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listBrands);
router.post('/', requireRole('owner', 'admin', 'editor'), validate(createBrandValidator), ctrl.createBrand);

router.use('/:brandId', loadBrand);

router.get('/:brandId', ctrl.getBrand);
router.put('/:brandId', requireRole('owner', 'admin', 'editor'), validate(updateBrandValidator), ctrl.updateBrand);
router.delete('/:brandId', requireRole('owner', 'admin'), ctrl.deleteBrand);
router.post('/:brandId/logo', requireRole('owner', 'admin', 'editor'), upload.single('logo'), ctrl.uploadBrandLogo);
router.patch('/:brandId/onboarding', ctrl.updateOnboarding);
router.post('/:brandId/onboarding/complete', ctrl.completeOnboarding);

module.exports = router;
