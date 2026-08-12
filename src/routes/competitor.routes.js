const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/competitor.controller');
const { protect, setWorkspace, requireWorkspace, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { competitorValidator } = require('../validators/content.validators');

router.use(protect, setWorkspace, requireWorkspace);

router.get('/', ctrl.listCompetitors);
router.post('/', requireRole('owner', 'admin', 'editor'), validate(competitorValidator), ctrl.createCompetitor);
router.put('/:id', requireRole('owner', 'admin', 'editor'), ctrl.updateCompetitor);
router.delete('/:id', requireRole('owner', 'admin'), ctrl.deleteCompetitor);

module.exports = router;
