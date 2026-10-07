const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const db = require('../db');

const COLLECTION = 'users';
const scrypt = promisify(crypto.scrypt);
const TOKEN_TTL = '30d';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET non définie.');
  return secret;
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return { salt, hash };
}

function signToken(user) {
  return jwt.sign({ uid: user.id, name: user.username }, jwtSecret(), { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret());
}

async function register(username, password) {
  const key = username.toLowerCase();
  const ref = db.collection(COLLECTION).doc(key);
  const { salt, hash } = await hashPassword(password);
  const user = { username, salt, hash, createdAt: new Date() };
  try {
    await ref.create(user);
  } catch (e) {
    if (e.code === 6) return null; // ALREADY_EXISTS
    throw e;
  }
  return { id: key, username };
}

async function login(username, password) {
  const snap = await db.collection(COLLECTION).doc(username.toLowerCase()).get();
  if (!snap.exists) return null;
  const { salt, hash } = snap.data();
  const attempt = await hashPassword(password, salt);
  const ok = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt.hash, 'hex'));
  return ok ? { id: snap.id, username: snap.data().username } : null;
}

module.exports = { register, login, signToken, verifyToken };
