#!/usr/bin/env node
// vapid-secrets.js — Copie les clés VAPID de backend/.env dans Secret Manager
// (les génère dans .env si absentes). Usage : npm run secrets:vapid [-- <projectId>]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'backend', '.env');
const NAMES = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];

const projectId = process.argv[2]
  || JSON.parse(fs.readFileSync(path.join(ROOT, '.firebaserc'), 'utf8')).projects.default;

let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
const read = (name) => (env.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

if (!read('VAPID_PUBLIC_KEY') || !read('VAPID_PRIVATE_KEY')) {
  const keys = require(path.join(ROOT, 'backend', 'node_modules', 'web-push')).generateVAPIDKeys();
  env = env.replace(/^VAPID_(PUBLIC|PRIVATE)_KEY=.*\r?\n?/gm, '').trimEnd()
    + `\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`;
  fs.writeFileSync(ENV_FILE, env, 'utf8');
  console.log('Nouvelles clés VAPID écrites dans backend/.env');
}

function exists(name) {
  try {
    execSync(`gcloud secrets describe ${name} --project ${projectId}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

for (const name of NAMES) {
  const cmd = exists(name)
    ? `gcloud secrets versions add ${name} --data-file=- --project ${projectId}`
    : `gcloud secrets create ${name} --data-file=- --replication-policy=automatic --project ${projectId}`;
  // valeur passée sur stdin, sans retour à la ligne final
  execSync(cmd, { input: read(name), stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(`✔ ${name} → Secret Manager (${projectId})`);
}
