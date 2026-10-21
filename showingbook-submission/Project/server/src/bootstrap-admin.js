'use strict';
// First-run helper: if the database has no users and ADMIN_EMAIL / ADMIN_PASSWORD are set, create that admin.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');

function ensureFirstAdmin(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return false;
  if (!config.adminEmail || !config.adminPassword) return false;
  if (config.adminPassword.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), config.adminEmail, 'Administrator', bcrypt.hashSync(config.adminPassword, config.bcryptRounds), 'admin');
  console.log(`Created first admin account: ${config.adminEmail}`);
  return true;
}
module.exports = { ensureFirstAdmin };
