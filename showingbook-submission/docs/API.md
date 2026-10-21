# ShowingBook API

JSON over HTTP. All routes except login and health need `Authorization: Bearer <token>`.
Errors look like `{ "error": "message" }` with the usual status (400 validation, 401 not signed in, 403 wrong role, 404 not found, 409 conflict, 429 too many login attempts).

| Method and path | Role | Purpose |
|---|---|---|
| `GET /api/health` | public | liveness check |
| `POST /api/auth/login` `{email,password}` | public | returns `{token,user}` (rate limited) |
| `GET /api/auth/me` | any | current user |
| `POST /api/auth/change-password` `{current,next}` | any | change own password (min 10 chars) |
| `GET /api/bootstrap` | any | all of the caller's clients, viewings, listings, tasks |
| `POST /api/clients`, `PUT/DELETE /api/clients/:id` | any (own records) | leads: `name, phone, email, stage, budget, notes, fb, ig, li, ot, tags[]` |
| `POST /api/listings`, `PUT/DELETE /api/listings/:id` | any (own records) | `address, price, status` |
| `POST /api/viewings`, `PUT/DELETE /api/viewings/:id` | any (own records) | `client, property, date, time, dur, status, notes, confirmed, reminded` |
| `POST /api/tasks`, `PUT/DELETE /api/tasks/:id` | any (own records) | `title, due, client, done` |
| `GET /api/users` | admin | team list with record counts |
| `POST /api/users` `{email,name,role,password}` | admin | create user |
| `PUT /api/users/:id` `{name,role,password?}` | admin | edit user / reset password (last admin cannot be demoted) |
| `DELETE /api/users/:id` | admin | delete user and their records (not yourself) |

Records of other users answer `404`, never `403`, so their existence is not revealed.
