'use strict';
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const { HttpError } = require('./http-error');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const bootstrapRoutes = require('./routes/bootstrap');
const clientRoutes = require('./routes/clients');
const usersRoutes = require('./routes/users');
const { listings, viewings, tasks } = require('./routes/resources');

function createApp(db) {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ['https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    strictTransportSecurity: config.nodeEnv === 'production',
  }));

  // CORS is off unless CORS_ORIGIN lists the origins allowed (needed only for the Capacitor apps).
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && config.corsOrigins.includes(origin)) {
      res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' });
      if (req.method === 'OPTIONS') return res.status(204).end();
    }
    next();
  });

  app.use('/api', express.json({ limit: '100kb' }));
  const auth = requireAuth(db);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes(db, auth));
  app.use('/api/bootstrap', bootstrapRoutes(db, auth));
  app.use('/api/clients', clientRoutes(db, auth));
  app.use('/api/listings', listings(db, auth));
  app.use('/api/viewings', viewings(db, auth));
  app.use('/api/tasks', tasks(db, auth));
  app.use('/api/users', usersRoutes(db, auth));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  app.use(express.static(config.webRoot, { index: 'index.html', maxAge: 0 }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });
  return app;
}

module.exports = { createApp };
