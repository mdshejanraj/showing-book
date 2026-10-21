'use strict';
// Admin area: manage the team's accounts. Every route here requires the admin role.
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { HttpError } = require('../http-error');
const { str, oneOf, parseBody } = require('../validate');
const { requireRole } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = (db, auth) => {
  const router = express.Router();
  router.use(auth, requireRole('admin'));

  const list = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.created_at,
      (SELECT COUNT(*) FROM clients c WHERE c.owner_id = u.id) AS leads,
      (SELECT COUNT(*) FROM viewings v WHERE v.owner_id = u.id) AS viewings,
      (SELECT COUNT(*) FROM listings l WHERE l.owner_id = u.id) AS listings
      FROM users u ORDER BY u.created_at, u.email`);
  const byId = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?');
  const byEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");

  function checkPassword(p) {
    if (p.length < 10) throw new HttpError(400, 'Password must be at least 10 characters');
  }

  router.get('/', (_req, res) => res.json({ users: list.all() }));

  router.post('/', async (req, res, next) => {
    try {
      const b = parseBody(req.body, {
        email: str({ max: 200, required: true }), name: str({ max: 120, required: true }),
        role: oneOf(['admin', 'agent']), password: str({ max: 200, required: true }),
      });
      if (!EMAIL_RE.test(b.email)) throw new HttpError(400, 'email is not valid');
      checkPassword(b.password);
      if (byEmail.get(b.email)) throw new HttpError(409, 'That email is already in use');
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
        .run(id, b.email, b.name, await bcrypt.hash(b.password, config.bcryptRounds), b.role);
      res.status(201).json(byId.get(id));
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const target = byId.get(req.params.id);
      if (!target) throw new HttpError(404, 'Not found');
      const b = parseBody(req.body, {
        name: str({ max: 120, required: true }), role: oneOf(['admin', 'agent']), password: str({ max: 200 }),
      });
      if (target.role === 'admin' && b.role !== 'admin' && adminCount.get().n <= 1) {
        throw new HttpError(400, 'There must be at least one admin');
      }
      db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(b.name, b.role, target.id);
      if (b.password) {
        checkPassword(b.password);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(b.password, config.bcryptRounds), target.id);
      }
      res.json(byId.get(target.id));
    } catch (e) { next(e); }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');
      if (db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id).changes === 0) throw new HttpError(404, 'Not found');
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
};
