const { register, login, signToken } = require('../services/auth.service');

const USERNAME_RE = /^[\p{L}\p{N}_-]{3,16}$/u;

function readCredentials(req, res) {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Pseudo : 3 à 16 caractères (lettres, chiffres, _ ou -).' });
    return null;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
    return null;
  }
  return { username, password };
}

async function postRegister(req, res) {
  const creds = readCredentials(req, res);
  if (!creds) return;
  const user = await register(creds.username, creds.password);
  if (!user) return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });
  res.status(201).json({ token: signToken(user), user });
}

async function postLogin(req, res) {
  const creds = readCredentials(req, res);
  if (!creds) return;
  const user = await login(creds.username, creds.password);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' });
  res.json({ token: signToken(user), user });
}

function getMe(req, res) {
  res.json({ user: { id: req.user.uid, username: req.user.name } });
}

module.exports = { postRegister, postLogin, getMe };
