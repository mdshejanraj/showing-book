'use strict';
// Listings, viewings and follow-up tasks: simple owner-scoped resources.
const { str, oneOf, date, time, int, bool } = require('../validate');
const { ownedRouter, checkClientOwner } = require('./owned');

const LISTING_STATUS = ['Coming soon', 'Active', 'Under offer', 'Sold'];
const VIEWING_STATUS = ['scheduled', 'done', 'cancelled'];
const nullIfEmpty = (v) => (v ? v : null);

const listingToApi = (r) => ({ id: r.id, address: r.address, price: r.price, status: r.status });
const viewingToApi = (r) => ({
  id: r.id, client: r.client_id || '', property: r.property, date: r.view_date, time: r.view_time,
  dur: r.dur_min, status: r.status, notes: r.notes, confirmed: !!r.confirmed, reminded: !!r.reminded,
});
const taskToApi = (r) => ({ id: r.id, title: r.title, due: r.due_date, client: r.client_id || '', done: !!r.done });

function listings(db, auth) {
  return ownedRouter(db, auth, {
    table: 'listings',
    fields: {
      address: { col: 'address', rule: str({ max: 200, required: true }) },
      price: { col: 'price', rule: str({ max: 40 }) },
      status: { col: 'status', rule: oneOf(LISTING_STATUS) },
    },
    toApi: listingToApi,
  });
}

function viewings(db, auth) {
  return ownedRouter(db, auth, {
    table: 'viewings',
    fields: {
      client: { col: 'client_id', rule: str({ max: 64 }), toDb: nullIfEmpty },
      property: { col: 'property', rule: str({ max: 200, required: true }) },
      date: { col: 'view_date', rule: date() },
      time: { col: 'view_time', rule: time() },
      dur: { col: 'dur_min', rule: int(15, 240) },
      status: { col: 'status', rule: oneOf(VIEWING_STATUS) },
      notes: { col: 'notes', rule: str({ max: 2000 }) },
      confirmed: { col: 'confirmed', rule: bool() },
      reminded: { col: 'reminded', rule: bool() },
    },
    beforeWrite: checkClientOwner,
    toApi: viewingToApi,
  });
}

function tasks(db, auth) {
  return ownedRouter(db, auth, {
    table: 'tasks',
    fields: {
      title: { col: 'title', rule: str({ max: 200, required: true }) },
      due: { col: 'due_date', rule: date() },
      client: { col: 'client_id', rule: str({ max: 64 }), toDb: nullIfEmpty },
      done: { col: 'done', rule: bool() },
    },
    beforeWrite: checkClientOwner,
    toApi: taskToApi,
  });
}

module.exports = { listings, viewings, tasks, listingToApi, viewingToApi, taskToApi };
