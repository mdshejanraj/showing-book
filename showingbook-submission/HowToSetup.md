# ShowingBook – setup guide

Two supported ways to run it: **A) a VPS** (Node.js + systemd + nginx) and **B) Docker**. Both need the same three things: a `.env` file, a database, and a first admin login.

Requirements: Node.js 22.13 or newer for option A; Docker with Compose v2 for option B.

---

## 0. Configure (both options)
```bash
cp .env.example .env
```
Edit `.env`:
1. `JWT_SECRET` – set a long random value. Generate one:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   (With `NODE_ENV=production` the server refuses to start without it.)
2. `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 10 characters) – the first admin account, created automatically on first start when the database has no users.
3. Leave the rest as is. Every variable is explained in `.env.example`.

`.env` holds secrets. Never commit it or put it in a ZIP.

---

## A) Install on a VPS (Ubuntu/Debian example)

### 1. Install Node.js and get the code
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo mkdir -p /opt/showingbook && sudo chown $USER /opt/showingbook
# upload / unzip this project into /opt/showingbook, then:
cd /opt/showingbook && cp .env.example .env && nano .env     # step 0
```

### 2. Install packages and create the database
```bash
cd /opt/showingbook/Project
npm ci --omit=dev
npm run db:init          # creates the empty database from database/schema.sql
```
The server also applies the schema on every start (it is idempotent), so `db:init` is optional but makes the first run explicit.

### 3. Run as a service
Make the data folder writable by the service user, then create `/etc/systemd/system/showingbook.service`:
```bash
sudo mkdir -p /opt/showingbook/data && sudo chown -R www-data /opt/showingbook/data
```
```ini
[Unit]
Description=ShowingBook
After=network.target

[Service]
WorkingDirectory=/opt/showingbook/Project
ExecStart=/usr/bin/node server/src/index.js
Restart=always
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now showingbook
journalctl -u showingbook -n 20      # should say: Created first admin account: ...
```
The app reads its secrets from `/opt/showingbook/.env` itself (make sure `www-data` can read it: `sudo chown www-data /opt/showingbook/.env && sudo chmod 600 /opt/showingbook/.env`).

### 4. First admin login
Open `http://SERVER:3000` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. Open the **Team** tab to add your agents, and change the admin password from the account button if you like.

*Want demo data instead?* On a throw-away test install run `npm run db:seed` (adds demo users and records, password `Demo#Pass2026`). **Never seed a real production database.**

### 5. HTTPS with nginx (required for the PWA install and service worker)
```nginx
server {
  server_name crm.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
sudo certbot --nginx -d crm.example.com
```
Then set `TRUST_PROXY=1` in `.env` and restart the service.

### Backups and updates
- Back up the SQLite file (`data/showingbook.db`, plus `-wal`/`-shm` if present): `cd Project && node -e "new (require('node:sqlite').DatabaseSync)('../data/showingbook.db').exec(\"VACUUM INTO '../data/backup.db'\")"` (or stop the service and copy the files).
- Update: replace the code, `cd Project && npm ci --omit=dev`, `sudo systemctl restart showingbook`.

---

## B) Install with Docker
```bash
cp .env.example .env          # step 0
docker compose up -d --build
docker compose logs -f        # look for "Created first admin account"
```
Open `http://SERVER:3000` and sign in. Data is kept in the `showingbook-data` volume (`/data/showingbook.db` in the container), so it survives rebuilds.

- Put nginx or Caddy in front for HTTPS (see the nginx block above, `proxy_pass http://127.0.0.1:3000`) and set `TRUST_PROXY=1`.
- Backup: `docker compose exec showingbook node -e "new (require('node:sqlite').DatabaseSync)('/data/showingbook.db').exec(\"VACUUM INTO '/data/backup.db'\")"` then copy `/data/backup.db` out with `docker compose cp`.
- Update: `git pull` (or replace the files), then `docker compose up -d --build`.

---

## Branding changes
| What | Where |
|---|---|
| Colours (teal / brass, light and dark) | the `:root` variables at the top of `Project/web/public/css/styles.css` |
| Logo in the header | the inline `<svg class="logo">` in `Project/web/public/index.html` |
| Favicon and app icons | `Project/web/public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| App name and PWA colours | `Project/web/public/manifest.webmanifest` |
| Fonts | the Google Fonts `<link>` in `index.html` (then update the `font-family` rules in `styles.css`) |

After changing front-end files, increase the version in `Project/web/public/sw.js` (`showingbook-v3` → `v4`) so installed apps refresh.

---

## Android / iOS apps (Capacitor)
The native apps are the same web app, talking to your deployed server.

1. Deploy the server with HTTPS first (above).
2. Edit `Project/web/public/js/config.js` → `export const API_BASE = 'https://crm.example.com';`
3. In `.env` set `CORS_ORIGIN=https://localhost,capacitor://localhost` and restart the server.
4. Edit `Project/capacitor.config.json` → set your own `appId` (reverse domain, e.g. `com.yourcompany.showingbook`).
5. Build:
```bash
cd Project
npm ci
npx cap add android          # and: npx cap add ios   (iOS needs a Mac with Xcode)
npx cap sync
npx cap open android         # or: npx cap open ios
```
6. Optional – generate all native icon sizes from `Project/resources/` (icon.png, icon-foreground.png, icon-background.png):
   `npx @capacitor/assets generate --iconBackgroundColor '#2D6A6E'`

Note: the page's Content-Security-Policy (`<meta>` in `index.html`) allows HTTPS API servers. If you test against a plain `http://` development server from a phone, add it to `connect-src` while testing.

---

## Run the tests
```bash
cd Project && npm test
```

## Troubleshooting
- *"JWT_SECRET must be set..."* – edit `.env` as in step 0.
- *Cannot sign in on a fresh install* – there are no users yet. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` and restart (only applies while the database has no users).
- *Port already used* – change `PORT` in `.env`.
- *Too many sign-in attempts* – the login is rate limited to 10 attempts per 15 minutes per address.
- *"ExperimentalWarning: SQLite is an experimental feature"* in the log – harmless. The app uses Node's built-in `node:sqlite`, which avoids compiling native add-ons.
