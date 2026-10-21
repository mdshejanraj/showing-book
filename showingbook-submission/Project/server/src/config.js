'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');

// Minimal .env loader (no dependency). Real environment variables always win.
function loadEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvFile(path.join(ROOT, '.env'));

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const PLACEHOLDER = 'change-me';

function jwtSecret() {
  const s = env.JWT_SECRET || '';
  const weak = s.length < 32 || s.toLowerCase().includes(PLACEHOLDER);
  if (weak && nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters (see .env.example).');
  }
  // Development/test only: a random per-process secret, so no static secret ever ships in the code.
  return weak ? require('crypto').randomBytes(32).toString('hex') : s;
}

module.exports = {
  ROOT,
  nodeEnv,
  port: Number(env.PORT) || 3000,
  databasePath: path.resolve(ROOT, env.DATABASE_PATH || 'data/showingbook.db'),
  schemaPath: path.join(ROOT, 'database', 'schema.sql'),
  seedPath: path.join(ROOT, 'database', 'seed.sql'),
  webRoot: path.join(ROOT, 'Project', 'web', 'public'),
  jwtSecret: jwtSecret(),
  jwtExpiresIn: env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: env.TRUST_PROXY === '1',
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  bcryptRounds: nodeEnv === 'test' ? 4 : 11,
};
