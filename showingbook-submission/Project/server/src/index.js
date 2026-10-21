'use strict';
const config = require('./config');
const { open, applySchema } = require('./db');
const { createApp } = require('./app');
const { ensureFirstAdmin } = require('./bootstrap-admin');

const db = open();
applySchema(db); // idempotent: every statement is CREATE ... IF NOT EXISTS
ensureFirstAdmin(db);

const server = createApp(db).listen(config.port, () => {
  console.log(`ShowingBook running on http://localhost:${config.port} (${config.nodeEnv})`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => { db.close(); process.exit(0); }));
}
