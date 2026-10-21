'use strict';
// Usage: node server/scripts/db.js init | seed | reset
const fs = require('fs');
const config = require('../src/config');
const { open, applySchema, applySeed } = require('../src/db');

const cmd = process.argv[2];
if (!['init', 'seed', 'reset'].includes(cmd)) {
  console.error('Usage: db.js init | seed | reset');
  process.exit(1);
}
if (cmd === 'reset' && config.nodeEnv === 'production') {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}
if (cmd === 'reset') {
  for (const f of [config.databasePath, config.databasePath + '-wal', config.databasePath + '-shm']) {
    fs.rmSync(f, { force: true });
  }
}
const db = open();
if (cmd === 'init' || cmd === 'reset') { applySchema(db); console.log('Schema applied to', config.databasePath); }
if (cmd === 'seed' || cmd === 'reset') { applySeed(db); console.log('Demo data loaded.'); }
db.close();
