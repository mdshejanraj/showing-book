'use strict';
// Generic owner-scoped CRUD for a table. Every statement is parameterised and every
// read/update/delete is filtered by owner_id, so a user can never reach another user's rows.
const crypto = require('crypto');
const express = require('express');
const { HttpError } = require('../http-error');
const { parseBody } = require('../validate');

/**
 * spec = {
 *   table, fields: { apiName: { col, rule } }, toApi(row), beforeWrite?(db, user, values)
 * }
 */
function ownedRouter(db, auth, spec) {
  const router = express.Router();
  const cols = Object.values(spec.fields).map((f) => f.col);
  const rules = Object.fromEntries(Object.entries(spec.fields).map(([k, f]) => [k, f.rule]));
  const toDb = (values) => Object.entries(spec.fields).map(([k, f]) => (f.toDb ? f.toDb(values[k]) : values[k]));

  const insert = db.prepare(`INSERT INTO ${spec.table} (id, owner_id, ${cols.join(', ')}) VALUES (?, ?, ${cols.map(() => '?').join(', ')})`);
  const update = db.prepare(`UPDATE ${spec.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND owner_id = ?`);
  const remove = db.prepare(`DELETE FROM ${spec.table} WHERE id = ? AND owner_id = ?`);
  const get = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ? AND owner_id = ?`);

  router.use(auth);

  router.post('/', (req, res, next) => {
    try {
      const values = parseBody(req.body, rules);
      if (spec.beforeWrite) spec.beforeWrite(db, req.user, values);
      const id = crypto.randomUUID();
      insert.run(id, req.user.id, ...toDb(values));
      res.status(201).json(spec.toApi(get.get(id, req.user.id)));
    } catch (e) { next(e); }
  });

  router.put('/:id', (req, res, next) => {
    try {
      if (!get.get(req.params.id, req.user.id)) throw new HttpError(404, 'Not found');
      const values = parseBody(req.body, rules);
      if (spec.beforeWrite) spec.beforeWrite(db, req.user, values);
      update.run(...toDb(values), req.params.id, req.user.id);
      res.json(spec.toApi(get.get(req.params.id, req.user.id)));
    } catch (e) { next(e); }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      if (remove.run(req.params.id, req.user.id).changes === 0) throw new HttpError(404, 'Not found');
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}

// A viewing/task may only point at a client that belongs to the same user.
function checkClientOwner(db, user, values) {
  if (!values.client) return;
  const ok = db.prepare('SELECT 1 FROM clients WHERE id = ? AND owner_id = ?').get(values.client, user.id);
  if (!ok) throw new HttpError(400, 'Unknown client');
}

module.exports = { ownedRouter, checkClientOwner };
