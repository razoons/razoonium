const { Router } = require('express');
const { postRegister, postLogin, getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/register', postRegister);
router.post('/login', postLogin);
router.get('/me', requireAuth, getMe);

module.exports = router;
