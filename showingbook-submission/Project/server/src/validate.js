'use strict';
const { HttpError } = require('./http-error');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Rule builders. Each rule is (value, label) => cleaned value, or throws HttpError(400).
const str = ({ max = 200, required = false } = {}) => (v, label) => {
  const s = v == null ? '' : String(v).trim();
  if (required && !s) throw new HttpError(400, `${label} is required`);
  if (s.length > max) throw new HttpError(400, `${label} is too long (max ${max})`);
  return s;
};
const oneOf = (list) => (v, label) => {
  if (!list.includes(v)) throw new HttpError(400, `${label} must be one of: ${list.join(', ')}`);
  return v;
};
const date = () => (v, label) => {
  if (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    throw new HttpError(400, `${label} must be a date (YYYY-MM-DD)`);
  }
  return v;
};
const time = () => (v, label) => {
  if (typeof v !== 'string' || !TIME_RE.test(v)) throw new HttpError(400, `${label} must be a time (HH:MM)`);
  return v;
};
const int = (min, max) => (v, label) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}`);
  return n;
};
const bool = () => (v) => (v === true || v === 1 || v === '1' ? 1 : 0);

function parseBody(body, rules) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'JSON body required');
  const out = {};
  for (const [key, rule] of Object.entries(rules)) out[key] = rule(body[key], key);
  return out;
}

module.exports = { str, oneOf, date, time, int, bool, parseBody };
