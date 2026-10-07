const { verifyToken } = require('../services/auth.service');

// Exige un JWT valide dans l'en-tête Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentification requise.' });
  try {
    const { uid, name } = verifyToken(token);
    req.user = { uid, name };
    next();
  } catch {
    res.status(401).json({ error: 'Session expirée, reconnecte-toi.' });
  }
}

// Exige la clé API (appels Cloud Scheduler)
function requireApiKey(req, res, next) {
  const key = process.env.API_SECRET_KEY;
  if (!key || req.get('x-api-key') !== key) return res.status(403).json({ error: 'Interdit.' });
  next();
}

module.exports = { requireAuth, requireApiKey };
