'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { HttpError } = require('../http-error');
const { str, parseBody } = require('../validate');
const { signToken } = require('../middleware/auth');

// A valid bcrypt hash used to keep response time equal when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

module.exports = (db, auth) => {
  const router = express.Router();
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === 'test' ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });

  router.post('/login', limiter, async (req, res, next) => {
    try {
      const b = parseBody(req.body, { email: str({ max: 200, required: true }), password: str({ max: 200, required: true }) });
      const user = byEmail.get(b.email);
      const ok = await bcrypt.compare(b.password, user ? user.password_hash : DUMMY_HASH);
      if (!user || !ok) throw new HttpError(401, 'Wrong email or password');
      res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (e) { next(e); }
  });

  router.get('/me', auth, (req, res) => res.json({ user: req.user }));

  router.post('/change-password', auth, async (req, res, next) => {
    try {
      const b = parseBody(req.body, { current: str({ max: 200, required: true }), next: str({ max: 200, required: true }) });
      if (b.next.length < 10) throw new HttpError(400, 'New password must be at least 10 characters');
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      if (!(await bcrypt.compare(b.current, row.password_hash))) throw new HttpError(400, 'Current password is wrong');
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(b.next, config.bcryptRounds), req.user.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
};
