# CLAUDE.md – guide for AI coding tools

ShowingBook: CRM + viewing calendar for independent real estate agents. Node 22.13+ (Express + built-in node:sqlite) API, vanilla-JS ES-module front end, Capacitor-ready.

## Folder map
```
Project/
  package.json, package-lock.json     scripts: start, dev, test, db:init, db:seed, db:reset
  Dockerfile, capacitor.config.json
  server/
    src/index.js            boot: open DB, apply schema, first-admin bootstrap, listen
    src/app.js              Express app: helmet/CSP, CORS allow-list, routes, error handler
    src/config.js           env loading + validation (JWT_SECRET rules)
    src/db.js               node:sqlite open + schema/seed helpers
    src/validate.js         tiny input validators (str, oneOf, date, time, int, bool)
    src/http-error.js
    src/middleware/auth.js  JWT sign, requireAuth (loads user from DB), requireRole
    src/routes/             auth, bootstrap, clients, users (admin), resources (listings/viewings/tasks), owned (generic owner-scoped CRUD)
    scripts/db.js           init | seed | reset
    test/api.test.js        node:test API tests (in-memory SQLite)
  web/public/               static front end served by Express and by Capacitor
    index.html, css/styles.css, sw.js, manifest.webmanifest
    js/  main.js (boot) router.js api.js store.js dialog.js auth.js messages.js theme.js pwa.js util.js constants.js config.js
    js/views/ calendar leads listings tasks reports team
database/schema.sql, seed.sql   source of truth for the DB structure and demo data
docs/API.md
```

## Conventions
- **Auth**: every route except `POST /api/auth/login` and `GET /api/health` goes through `requireAuth`. Admin-only routes add `requireRole('admin')`.
- **Ownership**: every table has `owner_id`. All reads/updates/deletes use `WHERE id = ? AND owner_id = ?`. Use `routes/owned.js` for new owner-scoped resources instead of copy-pasting CRUD.
- **SQL**: always parameterised (`?`). Never build SQL from request values; column names come only from code constants.
- **Validation**: parse every body with `parseBody(body, rules)`; unknown fields are ignored.
- **Errors**: throw `HttpError(status, message)`; the error handler returns `{ "error": "..." }`.
- **Schema changes**: edit `database/schema.sql` (idempotent `CREATE ... IF NOT EXISTS`); for existing databases add a migration statement guarded for re-runs, and update `seed.sql` and the tests.
- **Front end**: no framework, no build step. Each view module exports an HTML-string renderer registered with `register(name, fn)` and wires its own delegated listeners on `#main`. Always escape with `esc()` when interpolating data into HTML. No inline scripts (CSP `script-src 'self'`).
- **Secrets**: never commit `.env`; every variable is documented in `.env.example`. Demo password `Demo#Pass2026` exists only in `seed.sql`.
- Keep files small (< ~200 lines); split instead of growing a file.

## Commands
```bash
cd Project
npm ci
npm run db:reset     # dev only: wipes and recreates the DB with demo data
npm run dev          # http://localhost:3000 with auto-restart
npm test             # node --test, no extra setup
```
