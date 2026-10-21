'use strict';
// One call that returns everything the signed-in user owns (used on app start).
const express = require('express');
const clients = require('./clients');
const { listingToApi, viewingToApi, taskToApi } = require('./resources');

module.exports = (db, auth) => {
  const router = express.Router();
  router.get('/', auth, (req, res) => {
    const id = req.user.id;
    const tagRows = db.prepare(`SELECT t.client_id, t.tag FROM client_tags t JOIN clients c ON c.id = t.client_id
                                WHERE c.owner_id = ? ORDER BY t.tag`).all(id);
    const tagMap = {};
    for (const r of tagRows) (tagMap[r.client_id] ||= []).push(r.tag);
    res.json({
      clients: db.prepare('SELECT * FROM clients WHERE owner_id = ? ORDER BY created_at, name').all(id).map((r) => clients.toApi(r, tagMap[r.id] || [])),
      viewings: db.prepare('SELECT * FROM viewings WHERE owner_id = ? ORDER BY view_date, view_time').all(id).map(viewingToApi),
      listings: db.prepare('SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at, address').all(id).map(listingToApi),
      tasks: db.prepare('SELECT * FROM tasks WHERE owner_id = ? ORDER BY due_date').all(id).map(taskToApi),
    });
  });
  return router;
};
