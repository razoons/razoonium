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
router.get('/:id/candidates', ctrl.candidates);
router.post('/:id/players', ctrl.addPlayer);
router.delete('/:id/membership', ctrl.leave);
router.post('/:id/start', ctrl.start);
router.put('/:id/order', ctrl.order);
router.post('/:id/action', ctrl.action);
router.post('/:id/wall', ctrl.wall);
router.post('/:id/ghost', ctrl.ghost);
router.post('/:id/sight', ctrl.sight);
router.put('/:id/sight/:player', ctrl.sightAnswer);
router.post('/:id/chat', ctrl.chat);

module.exports = router;
