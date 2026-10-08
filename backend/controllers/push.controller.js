const push = require('../services/push.service');

function getPublicKey(_req, res) {
  if (!push.enabled) return res.status(503).json({ error: 'Notifications non configurées sur le serveur.' });
  res.json({ publicKey: push.publicKey });
}

async function postSubscribe(req, res) {
  await push.subscribe(req.user.uid, req.body?.subscription, req.get('user-agent'));
  res.status(204).end();
}

async function postUnsubscribe(req, res) {
  await push.unsubscribe(req.user.uid, req.body?.endpoint);
  res.status(204).end();
}

module.exports = { getPublicKey, postSubscribe, postUnsubscribe };
