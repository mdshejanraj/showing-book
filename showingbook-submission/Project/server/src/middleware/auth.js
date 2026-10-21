'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../http-error');

function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Verifies the Bearer token and loads the user fresh from the database,
// so deleted users and role changes take effect immediately.
function requireAuth(db) {
  const find = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?');
  return (req, _res, next) => {
    const header = req.get('authorization') || '';
    const m = header.match(/^Bearer (.+)$/i);
    if (!m) return next(new HttpError(401, 'Sign in required'));
    let payload;
    try { payload = jwt.verify(m[1], config.jwtSecret, { algorithms: ['HS256'] }); }
    catch { return next(new HttpError(401, 'Session expired, please sign in again')); }
    const user = find.get(payload.sub);
    if (!user) return next(new HttpError(401, 'Account no longer exists'));
    req.user = user;
    next();
  };
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do this'));
  next();
};

module.exports = { signToken, requireAuth, requireRole };
