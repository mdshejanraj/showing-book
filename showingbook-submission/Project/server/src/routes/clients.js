'use strict';
const crypto = require('crypto');
const express = require('express');
const { HttpError } = require('../http-error');
const { str, oneOf, parseBody } = require('../validate');
const { transaction } = require('../db');

const STAGES = ['Lead', 'Searching', 'Viewing', 'Offer', 'Closed'];

const rules = {
  name: str({ max: 120, required: true }),
  phone: str({ max: 40 }),
  email: str({ max: 200 }),
  stage: oneOf(STAGES),
  budget: str({ max: 200 }),
  notes: str({ max: 4000 }),
  fb: str({ max: 300 }), ig: str({ max: 300 }), li: str({ max: 300 }), ot: str({ max: 300 }),
};

// Only http(s) links are kept, so a stored link can never be a javascript: URL.
function safeUrl(s) {
  s = (s || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  return `https://${s}`;
}

function parseTags(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 20) throw new HttpError(400, 'tags must be a list of at most 20 items');
  const tags = raw.map((t) => String(t).trim()).filter(Boolean);
  if (tags.some((t) => t.length > 40)) throw new HttpError(400, 'A tag is too long (max 40)');
  return [...new Set(tags)];
}

function toApi(row, tags) {
  return {
    id: row.id, name: row.name, phone: row.phone, email: row.email, stage: row.stage, budget: row.budget, notes: row.notes,
    social: { fb: row.social_fb, ig: row.social_ig, li: row.social_li, ot: row.social_ot },
    tags,
  };
}

module.exports = (db, auth) => {
  const router = express.Router();
  router.use(auth);

  const get = db.prepare('SELECT * FROM clients WHERE id = ? AND owner_id = ?');
  const tagsOf = db.prepare('SELECT tag FROM client_tags WHERE client_id = ? ORDER BY tag');
  const insert = db.prepare(`INSERT INTO clients (id, owner_id, name, phone, email, stage, budget, notes, social_fb, social_ig, social_li, social_ot)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const update = db.prepare(`UPDATE clients SET name = ?, phone = ?, email = ?, stage = ?, budget = ?, notes = ?,
                             social_fb = ?, social_ig = ?, social_li = ?, social_ot = ? WHERE id = ? AND owner_id = ?`);
  const clearTags = db.prepare('DELETE FROM client_tags WHERE client_id = ?');
  const addTag = db.prepare('INSERT INTO client_tags (client_id, tag) VALUES (?, ?)');
  const remove = db.prepare('DELETE FROM clients WHERE id = ? AND owner_id = ?');

  const social = (b) => [safeUrl(b.fb), safeUrl(b.ig), safeUrl(b.li), safeUrl(b.ot)];
  const respond = (id, ownerId) => toApi(get.get(id, ownerId), tagsOf.all(id).map((t) => t.tag));

  const save = transaction(db, (id, ownerId, b, tags, isNew) => {
    if (isNew) insert.run(id, ownerId, b.name, b.phone, b.email, b.stage, b.budget, b.notes, ...social(b));
    else update.run(b.name, b.phone, b.email, b.stage, b.budget, b.notes, ...social(b), id, ownerId);
    clearTags.run(id);
    for (const t of tags) addTag.run(id, t);
  });

  router.post('/', (req, res, next) => {
    try {
      const b = parseBody(req.body, rules);
      const tags = parseTags(req.body.tags);
      const id = crypto.randomUUID();
      save(id, req.user.id, b, tags, true);
      res.status(201).json(respond(id, req.user.id));
    } catch (e) { next(e); }
  });

  router.put('/:id', (req, res, next) => {
    try {
      if (!get.get(req.params.id, req.user.id)) throw new HttpError(404, 'Not found');
      const b = parseBody(req.body, rules);
      save(req.params.id, req.user.id, b, parseTags(req.body.tags), false);
      res.json(respond(req.params.id, req.user.id));
    } catch (e) { next(e); }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      if (remove.run(req.params.id, req.user.id).changes === 0) throw new HttpError(404, 'Not found');
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
};
module.exports.toApi = toApi;
