const { Router } = require('express');
const { tick } = require('../controllers/game.controller');
const { requireApiKey } = require('../middleware/auth');

const router = Router();

// Cloud Scheduler → POST /api/cron/tick (en-tête x-api-key)
router.post('/tick', requireApiKey, tick);

module.exports = router;
