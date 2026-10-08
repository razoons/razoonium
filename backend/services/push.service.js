const crypto = require('crypto');
const webpush = require('web-push');
const db = require('../db');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const enabled = !!(publicKey && privateKey);

if (enabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://razoonium.web.app', publicKey, privateKey);
}

const subsOf = (uid) => db.collection('users').doc(uid).collection('push');
const subId = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

async function subscribe(uid, subscription, userAgent) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw Object.assign(new Error('Abonnement invalide.'), { status: 400 });
  }
  const { endpoint, keys } = subscription;
  await subsOf(uid).doc(subId(endpoint)).set({
    subscription: { endpoint, keys }, userAgent: String(userAgent || '').slice(0, 200), createdAt: new Date(),
  });
}

async function unsubscribe(uid, endpoint) {
  if (endpoint) await subsOf(uid).doc(subId(endpoint)).delete();
}

/* Envoie à tous les appareils d'un joueur ; supprime les abonnements expirés */
async function sendToUser(uid, payload) {
  if (!enabled) return;
  const snap = await subsOf(uid).get();
  await Promise.all(snap.docs.map(async (doc) => {
    try {
      await webpush.sendNotification(doc.data().subscription, JSON.stringify(payload), { TTL: 24 * 3600 });
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await doc.ref.delete();
      else console.warn(`[push] échec pour ${uid} : ${e.statusCode || e.message}`);
    }
  }));
}

/* Ne fait jamais échouer l'appelant : les notifications sont un bonus */
async function sendMany(messages) {
  try {
    await Promise.all(messages.map(({ uid, payload }) => sendToUser(uid, payload)));
  } catch (e) {
    console.warn('[push]', e.message);
  }
}

module.exports = { enabled, publicKey, subscribe, unsubscribe, sendMany };
