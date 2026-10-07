require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const cronRoutes = require('./routes/cron.routes');

const app = express();
const port = process.env.PORT || 8080;
const appName = process.env.APP_NAME || 'MyApp';
const apiSecretKey = process.env.API_SECRET_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN;

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/cron', cronRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Erreurs (Express 5 transmet automatiquement les rejets des handlers async)
app.use((err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

app.listen(port, () => {
  console.log(`[${appName}] Serveur prêt sur le port ${port}`);
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET non définie — l\'authentification ne fonctionnera pas.');
  }
  if (!apiSecretKey) {
    console.warn('⚠️  API_SECRET_KEY non définie — /api/cron/tick désactivé.');
  }
});
