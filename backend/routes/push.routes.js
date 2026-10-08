const { Router } = require('express');
const { getPublicKey, postSubscribe, postUnsubscribe } = require('../controllers/push.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/public-key', getPublicKey);
router.post('/subscribe', requireAuth, postSubscribe);
router.post('/unsubscribe', requireAuth, postUnsubscribe);

module.exports = router;
