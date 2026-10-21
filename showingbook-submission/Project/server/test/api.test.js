'use strict';
process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { open, applySchema, applySeed } = require('../src/db');
const { createApp } = require('../src/app');

let server, base, db;
const tokens = {};

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (email) => (await api('POST', '/api/auth/login', { body: { email, password: 'Demo#Pass2026' } })).body.token;

before(async () => {
  db = open(':memory:');
  applySchema(db);
  applySeed(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  tokens.admin = await login('admin@showingbook.demo');
  tokens.agent = await login('agent@showingbook.demo');
  tokens.agent2 = await login('agent2@showingbook.demo');
});
after(() => { server.close(); db.close(); });

test('schema creates from empty and seed password hash matches the documented demo password', () => {
  const row = db.prepare("SELECT password_hash FROM users WHERE id = 'u-admin'").get();
  assert.ok(bcrypt.compareSync('Demo#Pass2026', row.password_hash));
});

test('login rejects wrong password and unknown email with the same message', async () => {
  const a = await api('POST', '/api/auth/login', { body: { email: 'agent@showingbook.demo', password: 'nope-nope-nope' } });
  const b = await api('POST', '/api/auth/login', { body: { email: 'ghost@example.com', password: 'nope-nope-nope' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
});

test('every data route and every mutating route requires a signed-in user', async () => {
  const calls = [
    ['GET', '/api/bootstrap'], ['GET', '/api/auth/me'], ['POST', '/api/auth/change-password'],
    ['POST', '/api/clients'], ['PUT', '/api/clients/c1'], ['DELETE', '/api/clients/c1'],
    ['POST', '/api/listings'], ['PUT', '/api/listings/l1'], ['DELETE', '/api/listings/l1'],
    ['POST', '/api/viewings'], ['PUT', '/api/viewings/v1'], ['DELETE', '/api/viewings/v1'],
    ['POST', '/api/tasks'], ['PUT', '/api/tasks/t1'], ['DELETE', '/api/tasks/t1'],
    ['GET', '/api/users'], ['POST', '/api/users'], ['PUT', '/api/users/u-agent'], ['DELETE', '/api/users/u-agent'],
  ];
  for (const [m, p] of calls) {
    const r = await api(m, p, { body: m === 'GET' || m === 'DELETE' ? undefined : {} });
    assert.equal(r.status, 401, `${m} ${p} should be 401 without a token`);
  }
  assert.equal((await api('GET', '/api/bootstrap', { token: 'garbage' })).status, 401);
});

test('admin area is role-protected: agents get 403, admins get through', async () => {
  for (const [m, p] of [['GET', '/api/users'], ['POST', '/api/users'], ['PUT', '/api/users/u-agent2'], ['DELETE', '/api/users/u-agent2']]) {
    const r = await api(m, p, { token: tokens.agent, body: m === 'POST' || m === 'PUT' ? {} : undefined });
    assert.equal(r.status, 403, `${m} ${p} must be forbidden for agents`);
  }
  const ok = await api('GET', '/api/users', { token: tokens.admin });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.users.length >= 3);
});

test('bootstrap returns only the caller\'s own records', async () => {
  const a = (await api('GET', '/api/bootstrap', { token: tokens.agent })).body;
  const b = (await api('GET', '/api/bootstrap', { token: tokens.agent2 })).body;
  assert.equal(a.clients.length, 4);
  assert.equal(b.clients.length, 1);
  assert.ok(!a.clients.some((c) => c.id === 'c5'));
  assert.deepEqual(a.clients.find((c) => c.id === 'c1').tags.sort(), ['3-bed', 'garden']);
});

test('users cannot read, change or delete each other\'s records', async () => {
  for (const [res, id] of [['clients', 'c5'], ['listings', 'l1'], ['viewings', 'v1'], ['tasks', 't1']]) {
    const tok = res === 'clients' ? tokens.agent : tokens.agent2;
    const put = await api('PUT', `/api/${res}/${id}`, { token: tok, body: { name: 'x', stage: 'Lead', address: 'x', status: 'Active', property: 'x', date: '2030-01-01', time: '10:00', dur: 60, title: 'x', due: '2030-01-01' } });
    assert.equal(put.status, 404, `PUT ${res}/${id} must not reach another user's row`);
    assert.equal((await api('DELETE', `/api/${res}/${id}`, { token: tok })).status, 404);
  }
  assert.ok(db.prepare("SELECT 1 FROM clients WHERE id = 'c5'").get());
});

test('viewing cannot reference another user\'s client', async () => {
  const r = await api('POST', '/api/viewings', { token: tokens.agent, body: { client: 'c5', property: 'X', date: '2030-01-01', time: '10:00', dur: 60, status: 'scheduled', notes: '' } });
  assert.equal(r.status, 400);
});

test('client CRUD with tags and safe links', async () => {
  const created = await api('POST', '/api/clients', { token: tokens.agent, body: { name: 'Test Lead', phone: '1', email: '', stage: 'Lead', budget: '', notes: '', fb: 'javascript:alert(1)', ig: 'instagram.com/x', li: '', ot: '', tags: ['a', 'b', 'a'] } });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.tags, ['a', 'b']);
  assert.equal(created.body.social.fb, '');
  assert.equal(created.body.social.ig, 'https://instagram.com/x');
  const id = created.body.id;
  const upd = await api('PUT', `/api/clients/${id}`, { token: tokens.agent, body: { name: 'Renamed', phone: '1', email: '', stage: 'Offer', budget: '', notes: '', fb: '', ig: '', li: '', ot: '', tags: ['z'] } });
  assert.equal(upd.body.stage, 'Offer');
  assert.deepEqual(upd.body.tags, ['z']);
  assert.equal((await api('DELETE', `/api/clients/${id}`, { token: tokens.agent })).status, 204);
});

test('viewing, listing and task CRUD', async () => {
  const v = await api('POST', '/api/viewings', { token: tokens.agent, body: { client: 'c1', property: '1 Test Rd', date: '2030-05-05', time: '09:15', dur: 45, status: 'scheduled', notes: 'n', confirmed: false, reminded: false } });
  assert.equal(v.status, 201);
  const moved = await api('PUT', `/api/viewings/${v.body.id}`, { token: tokens.agent, body: { ...v.body, time: '11:00', confirmed: true } });
  assert.equal(moved.body.time, '11:00');
  assert.equal(moved.body.confirmed, true);
  const l = await api('POST', '/api/listings', { token: tokens.agent, body: { address: '9 New St', price: '$1', status: 'Active' } });
  assert.equal((await api('PUT', `/api/listings/${l.body.id}`, { token: tokens.agent, body: { address: '9 New St', price: '$1', status: 'Sold' } })).body.status, 'Sold');
  const t = await api('POST', '/api/tasks', { token: tokens.agent, body: { title: 'Do it', due: '2030-02-02', client: '', done: false } });
  assert.equal((await api('PUT', `/api/tasks/${t.body.id}`, { token: tokens.agent, body: { ...t.body, done: true } })).body.done, true);
});

test('validation rejects bad input', async () => {
  const bad = [
    ['/api/viewings', { property: 'X', date: 'tomorrow', time: '10:00', dur: 60, status: 'scheduled' }],
    ['/api/viewings', { property: 'X', date: '2030-01-01', time: '25:00', dur: 60, status: 'scheduled' }],
    ['/api/viewings', { property: 'X', date: '2030-01-01', time: '10:00', dur: 5, status: 'scheduled' }],
    ['/api/listings', { address: '', price: '', status: 'Active' }],
    ['/api/listings', { address: 'A', price: '', status: 'Hacked' }],
    ['/api/tasks', { title: 'x', due: 'nope' }],
    ['/api/clients', { name: 'x', stage: 'Nope' }],
  ];
  for (const [p, body] of bad) assert.equal((await api('POST', p, { token: tokens.agent, body })).status, 400, p);
});

test('SQL injection strings are stored as plain text and do not break queries', async () => {
  const evil = "x'); DROP TABLE clients;--";
  const r = await api('POST', '/api/listings', { token: tokens.agent, body: { address: evil, price: '', status: 'Active' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.address, evil);
  assert.ok(db.prepare('SELECT 1 FROM clients LIMIT 1').get());
});

test('admin can create users, change role, reset password and delete; last admin is protected', async () => {
  const c = await api('POST', '/api/users', { token: tokens.admin, body: { email: 'new@example.com', name: 'New', role: 'agent', password: 'a-long-password-1' } });
  assert.equal(c.status, 201);
  assert.equal((await api('POST', '/api/users', { token: tokens.admin, body: { email: 'new@example.com', name: 'Dup', role: 'agent', password: 'a-long-password-1' } })).status, 409);
  assert.equal((await api('POST', '/api/users', { token: tokens.admin, body: { email: 'weak@example.com', name: 'W', role: 'agent', password: 'short' } })).status, 400);
  const loginNew = await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'a-long-password-1' } });
  assert.equal(loginNew.status, 200);
  assert.equal((await api('PUT', `/api/users/${c.body.id}`, { token: tokens.admin, body: { name: 'New', role: 'agent', password: 'another-long-pass-2' } })).status, 200);
  assert.equal((await api('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'a-long-password-1' } })).status, 401);
  assert.equal((await api('DELETE', `/api/users/${c.body.id}`, { token: tokens.admin })).status, 204);
  assert.equal((await api('GET', '/api/bootstrap', { token: loginNew.body.token })).status, 401, 'deleted user token stops working');
  assert.equal((await api('DELETE', '/api/users/u-admin', { token: tokens.admin })).status, 400, 'cannot delete yourself');
  assert.equal((await api('PUT', '/api/users/u-admin', { token: tokens.admin, body: { name: 'A', role: 'agent' } })).status, 400, 'last admin stays admin');
});

test('deleting a client keeps its viewings and tasks (client link cleared)', async () => {
  const c = await api('POST', '/api/clients', { token: tokens.agent, body: { name: 'Temp', stage: 'Lead' } });
  const v = await api('POST', '/api/viewings', { token: tokens.agent, body: { client: c.body.id, property: 'P', date: '2030-03-03', time: '10:00', dur: 30, status: 'scheduled' } });
  await api('DELETE', `/api/clients/${c.body.id}`, { token: tokens.agent });
  const boot = (await api('GET', '/api/bootstrap', { token: tokens.agent })).body;
  assert.equal(boot.viewings.find((x) => x.id === v.body.id).client, '');
});

test('change password requires the current password', async () => {
  assert.equal((await api('POST', '/api/auth/change-password', { token: tokens.agent2, body: { current: 'wrong-wrong', next: 'a-brand-new-pass-1' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/change-password', { token: tokens.agent2, body: { current: 'Demo#Pass2026', next: 'a-brand-new-pass-1' } })).status, 200);
});

test('unknown API routes return JSON 404 and bad JSON returns 400', async () => {
  assert.equal((await api('GET', '/api/nope')).status, 404);
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});
