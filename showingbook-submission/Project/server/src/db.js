'use strict';
// SQLite through Node's built-in node:sqlite (Node 22.13+): no native add-on to compile or download.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

function open(file = config.databasePath) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return db;
}

function applySchema(db) {
  db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
}

function applySeed(db) {
  db.exec(fs.readFileSync(config.seedPath, 'utf8'));
}

// Wraps fn so that all its statements commit together or not at all.
function transaction(db, fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
}

module.exports = { open, applySchema, applySeed, transaction };
