const { Router } = require('express');
const ctrl = require('../controllers/game.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/join', ctrl.join);
router.get('/:id', ctrl.get);
router.delete('/:id', ctrl.remove);
router.delete('/:id/membership', ctrl.leave);
router.post('/:id/start', ctrl.start);
router.put('/:id/orders', ctrl.orders);

module.exports = router;
