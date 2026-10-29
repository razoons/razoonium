# 🏰 Le Château des Ténèbres

Jeu de traître et de déduction sociale au tour par tour (4 à 10 joueurs) en **Progressive Web App** — voir [rules.md](rules.md) pour le cahier des charges.

Un Tueur désigné en secret, des survivants qui se cachent, écoutent et accusent. Chaque manche : le Tueur choisit sa position, chacun agit à son tour (se cacher, se déplacer, frapper), puis le bilan tombe ; le débat se tient hors du jeu (WhatsApp…).

Application web full-stack déployée sur **Google Cloud Run** (backend) et **Firebase Hosting** (frontend).

- **Backend** : Node.js + Express 5
- **Frontend** : Vue 3 + Vite + Vuetify
- **Base de données** : Firestore
- **PWA** : vite-plugin-pwa (manifest, service worker, installable sur mobile)
- **Auth** : pseudo + mot de passe (scrypt), session JWT
- **Avancement des parties** : chaque joueur connecté interroge la partie toutes les 3 s, ce qui fait avancer les délais échus ; Cloud Scheduler → `POST /api/cron/tick` toutes les 5 min prend le relais quand personne n'est connecté

## Organisation du code

| Fichier | Rôle |
|---|---|
| `backend/services/game.engine.js` | Règles du jeu (fonctions pures) : plan du château, perception, ordre de passage, actions, blackout, bilans |
| `backend/services/game.service.js` | Parties Firestore : salon, transitions de phases transactionnelles, délais, vues filtrées par joueur, tchat, notifications |
| `backend/services/auth.service.js` | Comptes et JWT |
| `frontend/src/views/Game.vue` | Salon d'attente + partie (onglets Château, Journal) |
| `frontend/src/components/CastleMap.vue` | Plan du château (salles, passages, bruits) |
| `frontend/src/styles/chateau.css` | Thème gothique |

Firestore : `users/{pseudo}`, `games/{id}` (état complet de la partie, secrets compris : rôles, positions, salles — le serveur ne renvoie à chaque joueur que ce qu'il perçoit), `games/{id}/chat/{msgId}` (tchat du salon d'attente).

Les parties de l'ancien jeu (Razoonium) restent listées en archive et peuvent seulement être supprimées par leur hôte.

Icônes PWA : générées depuis `frontend/public/favicon.svg` avec `cd frontend && npx pwa-assets-generator`.

---

## Architecture

```
Utilisateur
    │
    ▼
Firebase Hosting (frontend Vue.js)
    │  /api/** → réécriture Firebase
    ▼
Cloud Run (backend Express)
    │
    ▼
Firestore (base de données)
```

En développement, le proxy Vite redirige `/api/*` vers `localhost:8080`.

---

## Initialisation d'un nouveau projet

Le script de setup configure automatiquement les fichiers, crée les ressources GCP et effectue le premier déploiement.

```bash
npm run setup
```

Il demande interactivement :
- Le nom de l'application
- La région GCP (défaut : `europe-west1`)
- Un projet GCP unique ou deux projets séparés dev / prod

Ce que le script fait :
- Remplace les placeholders dans `package.json`, `cloud-run.dev.yaml`, `cloud-run.prod.yaml`, `firebase.json`, `.firebaserc`, `backend/.env`
- Active les APIs GCP nécessaires
- Crée le repository Artifact Registry, la base Firestore, configure les IAM Cloud Build
- Effectue le premier déploiement backend sur Cloud Run
- Configure Firebase Hosting

> **Prérequis** : `gcloud` et `firebase` CLI installés et dans le PATH.

---

## Démarrage local

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

npm run dev   # backend :8080 + frontend :5173
```

---

## Variables d'environnement

| Fichier | Rôle | Commité ? |
|---|---|---|
| `backend/.env.example` | Modèle documentant toutes les variables | ✅ oui |
| `backend/.env` | Valeurs locales de développement | ❌ non (gitignored) |

| Variable | Type | Description |
|---|---|---|
| `APP_NAME` | normale | Nom affiché dans les logs et les réponses API |
| `PORT` | normale | Port d'écoute du serveur (défaut : `8080`) |
| `ALLOWED_ORIGIN` | normale | Origine CORS autorisée |
| `GOOGLE_CLOUD_PROJECT` | normale | ID du projet GCP |
| `MIN_PLAYERS` | normale | Joueurs minimum pour lancer (défaut : 4) |
| `API_SECRET_KEY` | **secret** | Clé envoyée par Cloud Scheduler (en-tête `x-api-key`) |
| `JWT_SECRET` | **secret** | Signature des sessions |
| `VAPID_SUBJECT` | normale | Contact déclaré aux services push (URL du site) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | **secret** | Paire de clés Web Push — sans elles, les notifications sont désactivées. `npm run secrets:vapid` copie celles de `backend/.env` dans Secret Manager (et les génère si absentes) |

Les variables normales sont déclarées dans `cloud-run.dev.yaml` / `cloud-run.prod.yaml` et injectées automatiquement au déploiement.

> **Note CORS** : en développement, le proxy Vite évite les requêtes cross-origin. La configuration CORS est active uniquement en production.

---

## Secrets via Google Secret Manager

Les secrets ne doivent **jamais** apparaître dans le code ou les variables d'env en clair. Cloud Run les injecte depuis Secret Manager.

### Créer un secret

```bash
echo -n "ma-valeur-secrete" | gcloud secrets create api-secret-key \
  --data-file=- \
  --replication-policy=automatic \
  --project <PROJECT_ID>
```

### Autoriser Cloud Run à lire le secret

```bash
PROJECT_NUMBER=$(gcloud projects describe <PROJECT_ID> --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding api-secret-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project <PROJECT_ID>
```

### Mettre à jour un secret

```bash
echo -n "nouvelle-valeur" | gcloud secrets versions add api-secret-key \
  --data-file=- \
  --project <PROJECT_ID>
# Cloud Run (configuré avec :latest) utilisera la nouvelle version au prochain démarrage.
```

### Lire les secrets configurés sur le service

```bash
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> \
  --format='yaml(spec.template.spec.containers[0].env)' \
  --project <PROJECT_ID>
```

---

## Déploiement

| Commande | Description |
|---|---|
| `npm run deploy:dev` | Déploie backend + frontend en dev |
| `npm run deploy:prod` | Déploie backend + frontend en prod |
| `npm run deploy:backend:dev` | Backend seul (dev) |
| `npm run deploy:frontend:dev` | Frontend seul (dev) |
