# Sutantra Foods — Deployment Runbook

This document describes the **verified** production topology and the GitHub
Actions deployment pipeline. It intentionally contains no passwords, private
keys or tokens.

---

## 1. Verified production topology

Inspected over SSH on 2026-10-23 as `u368424636@147.93.101.77:65002`.

| Purpose | Verified path |
| --- | --- |
| Public site document root | `/home/u368424636/domains/sutantrafoods.in/public_html` |
| React build (`index.html` + `assets/`) | same document root |
| Laravel API front controller | `/home/u368424636/domains/sutantrafoods.in/public_html/sutantra-api/index.php` |
| Laravel application root | `/home/u368424636/sutantra-api/sutantra-api` |
| Laravel `vendor/` | `/home/u368424636/sutantra-api/sutantra-api/vendor` (server-side, never synced) |
| Laravel `.env` | `/home/u368424636/sutantra-api/sutantra-api/.env` (mode `600`, never synced) |
| Runtime media / uploads | `/home/u368424636/sutantra-storage/uploads` (`UPLOADS_PATH`) |
| Repository mirror on server | `/home/u368424636/sutantra-api` (contains `sutantra-api/`, `sutantra-frontend/`, `uploads/`) |
| Rollback backups | `/home/u368424636/backups` |

The API is served from `https://sutantrafoods.in/sutantra-api` — the same
origin as the frontend, so no CORS preflight is required in production.

### Domain note

`sutantra.in` currently has **no A record** (only an SOA and a `www` CNAME to
`ghs.google.com`). The live application is **`sutantrafoods.in`**. Nothing in
this repository or pipeline targets `sutantra.in`.

### Important: the server-side Git clone is a mirror, not the deployment mechanism

`/home/u368424636/sutantra-api` is a clone of this repository, but its
`origin` is HTTPS with no stored credentials, so it cannot pull on its own.
The pipeline writes Laravel source into its `sutantra-api/` subdirectory.
Do **not** run `git pull` in that directory — use the pipeline (or the manual
commands below) so the deployed tree and the backups stay consistent.

---

## 2. What the pipeline does and does not touch

Deployed:

- `sutantra-frontend/` → built with Vite, only `dist/index.html` and
  `dist/assets/` are uploaded.
- `sutantra-api/` → PHP source, `composer.json`, `composer.lock`, migrations,
  config, routes.

Never transferred or deleted:

- `.env` and `.env.*` (production secrets stay on the server)
- `vendor/` (installed on the server with Composer)
- `storage/` (logs, sessions, framework cache)
- `bootstrap/cache/*.php`
- `database/*.sqlite`
- `node_modules/`, `dist/`, `.git/`
- `sutantra-storage/uploads`, `public_html/sutantra-api`, `default.php`
- `~/backups`

Never executed:

- `php artisan migrate`, `db:seed`, `migrate:fresh`, `migrate:reset`
- `git reset --hard`, `git clean`, force-push
- `rsync --delete` against the document root or the Laravel root
  (only `public_html/assets/` is synced with `--delete`, because it contains
  generated, content-hashed build files and nothing else)

Post-deploy cache handling: `config:clear`, `config:cache`, `route:clear`,
`view:clear`. Route caching is deliberately **not** enabled because
`routes/api.php` contains a closure (`/api/test`) that cannot be serialised by
`route:cache`.

---

## 3. One-time GitHub setup

Repository → **Settings → Secrets and variables → Actions**.

### Secrets

| Name | Value |
| --- | --- |
| `SSH_HOST` | `147.93.101.77` |
| `SSH_PORT` | `65002` |
| `SSH_USER` | `u368424636` |
| `SSH_PRIVATE_KEY` | Full contents of the existing deploy private key (`~/.ssh/sutantrafoods_deploy`). Paste it in the GitHub UI; never commit or print it. |
| `SSH_KNOWN_HOSTS` | The **verified** ed25519 host-key line (below) |
| `SSH_HOST_FINGERPRINT` | `SHA256:jwqEb4Mypw0iMkAkX8wZJbGXmmV1lVaIcuu4884PIUE` |

Verified ed25519 host key (public information):

```text
[147.93.101.77]:65002 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH1hkLrLI51q+b7tCYhzV0DJCuWUzaGVUGwqqAZc9Rsi
```

The workflow fails closed: if the pinned key is absent or the fingerprint does
not match, the deployment stops before connecting. `StrictHostKeyChecking` is
never disabled.

To copy the private key to the clipboard without printing it (PowerShell):

```powershell
Get-Content -Raw "$env:USERPROFILE\.ssh\sutantrafoods_deploy" | Set-Clipboard
```

### Variables (optional)

| Name | Default | Purpose |
| --- | --- | --- |
| `ENABLE_SPA_FALLBACK` | unset | Set to `true` **after approval** to install `deploy/hostinger/public_html.htaccess`, which fixes 404s on direct visits to client-side routes such as `/products` and `/admin`. |

### Environment protection

The deploy job uses the `production` environment. Add a **required reviewer**
protection rule there (Settings → Environments → production) if you want a
manual approval gate for every live deployment.

---

## 4. Day-to-day deployment

```bash
git switch main
git pull --ff-only
git merge --no-ff chore/deployment-cleanup   # once approved
git push origin main
```

GitHub Actions then runs:

1. `npm ci` + `npm run build` (asserts `VITE_API_BASE_URL` is the production URL)
2. `composer validate --strict`, `composer install`, `php artisan test`,
   `php artisan route:list`
3. On `main` only: SSH preflight → server-side backups → Laravel source rsync →
   `composer install --no-dev` + cache rebuild → frontend asset rsync →
   atomic `index.html` swap → live health checks

A failed build or test never reaches the server. A failed health check fails
the job loudly; roll back using section 6.

### Safe manual validation (no production contact)

- Actions → **Build, Validate & Deploy to Hostinger** → **Run workflow**
- Leave `dry_run` checked (default) → only the build/test job runs.

Pull requests run the build/test job only.

---

## 5. Manual deployment (only if Actions is unavailable)

```bash
# Local: build the frontend
cd sutantra-frontend && npm ci && npm run build

# Backups (server)
ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77
mkdir -p ~/backups
TS=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf ~/backups/backend-$TS-manual.tar.gz -C ~/sutantra-api/sutantra-api \
  --exclude=./vendor --exclude=./storage --exclude=./bootstrap/cache \
  --exclude=./.env --exclude='./.env.*' .
tar -czf ~/backups/frontend-$TS-manual.tar.gz \
  -C ~/domains/sutantrafoods.in/public_html index.html assets
exit

# Laravel source (from the local repository)
rsync -rlptz --delay-updates -e "ssh -p 65002" \
  --exclude='.git/' --exclude='vendor/' --exclude='node_modules/' \
  --exclude='storage/' --exclude='bootstrap/cache/*.php' \
  --exclude='database/*.sqlite' \
  --include='.env.example' --exclude='.env' --exclude='.env.*' \
  sutantra-api/ u368424636@147.93.101.77:/home/u368424636/sutantra-api/sutantra-api/

ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77 \
  'cd ~/sutantra-api/sutantra-api && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction && php artisan config:clear && php artisan config:cache && php artisan route:clear && php artisan view:clear'

# Frontend assets, then the index swap
rsync -rz --delete -e "ssh -p 65002" sutantra-frontend/dist/assets/ \
  u368424636@147.93.101.77:/home/u368424636/domains/sutantrafoods.in/public_html/assets/
rsync -rz -e "ssh -p 65002" sutantra-frontend/dist/index.html \
  u368424636@147.93.101.77:/home/u368424636/domains/sutantrafoods.in/public_html/index.html.new
ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77 \
  'mv ~/domains/sutantrafoods.in/public_html/index.html.new ~/domains/sutantrafoods.in/public_html/index.html'
```

> The `--include='.env.example'` must appear before `--exclude='.env.*'` in
> rsync (first match wins), otherwise `.env.example` is skipped.

---

## 6. Rollback

Backups are created by every deployment in `~/backups`:

- `backend-<UTC timestamp>-<previous SHA>.tar.gz` — Laravel source only
  (no `vendor/`, `storage/`, `.env`, `bootstrap/cache`)
- `frontend-<UTC timestamp>.tar.gz` — previous `index.html` + `assets/`

List them:

```bash
ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77 \
  'ls -1t ~/backups/backend-*.tar.gz ~/backups/frontend-*.tar.gz | head -10'
```

Restore Laravel source (does not touch `.env`, uploads, storage or database):

```bash
ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77
tar -xzf ~/backups/backend-<timestamp>-<sha>.tar.gz -C ~/sutantra-api/sutantra-api
cd ~/sutantra-api/sutantra-api
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan config:clear && php artisan config:cache
php artisan route:clear && php artisan view:clear
```

Restore the previous frontend (old hashed assets + matching `index.html`):

```bash
ssh -i ~/.ssh/sutantrafoods_deploy -p 65002 u368424636@147.93.101.77 \
  'tar -xzf ~/backups/frontend-<timestamp>.tar.gz -C ~/domains/sutantrafoods.in/public_html'
```

Restoring a source archive does not delete files that were added after the
backup. If a release added files that must disappear, remove them explicitly
after reviewing the diff.

---

## 7. Verification

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://sutantrafoods.in/
curl -sS https://sutantrafoods.in/sutantra-api/api/test
curl -sS -o /dev/null -w '%{http_code}\n' https://sutantrafoods.in/sutantra-api/api/catalog/categories
```

Expected: `200`, `{"success":true,...}`, `200`.

Local checks:

```bash
cd sutantra-frontend && npm ci && npm run build
cd sutantra-api && composer validate --strict && php artisan route:list --except-vendor
```

The local PHP 8.5 build on this workstation lacks `pdo_sqlite`, so
`php artisan test` cannot run locally (99 tests fail with "could not find
driver"). CI provisions the SQLite driver, so the test suite runs there.

---

## 8. Cleanup record (2026-10-23)

| Removed | Location | Reason | Recovery |
| --- | --- | --- | --- |
| `dist/frontend-uploads.zip` | `D:\Sutantra\sutantra-frontend\dist` (ignored build output) | Redundant archive; verified contents were exactly `index.html` + the two hashed assets, identical to the build output. | Regenerate with `npm run build`; no unique data. |
| `index.php` | repository root | Hostinger PHP 8.5 diagnostic probe ("Welcome to PHP 8.5!"), not referenced by the app, the API or the pipeline. | `git show 017ca89:index.php` |
| `public_html/home/` | `/home/u368424636/domains/sutantrafoods.in/public_html/home` | Stray recursive upload path containing only one copy of Hostinger's `default.php`; no site/API/cron reference. | `~/backups/stray-public-html-home-20261023T025926Z.tar.gz` |
| `^Cnv` | `/home/u368424636/sutantra-api/sutantra-api/^Cnv` | 0-byte accidental file (interrupted-command artefact); verified empty, no references. | None needed (empty file); removed with `rm -f`. |

Intentionally retained:

- `sutantra-api/.env.backup-*` (4 files, mode `600`) — production config
  history. Moving them into `~/backups` is recommended but requires approval.
- `public_html/default.php` and `public_html/sutantra-api/default.php` —
  harmless Hostinger defaults, already backed up.
- `~/sutantra-api/uploads` — repository copy of the shared media; runtime uses
  `~/sutantra-storage/uploads`.
- `~/backups`, `~/backup-imagefix-20261015` — rollback material.
- `sutantra-api/vendor`, `storage`, `bootstrap/cache` — runtime.
- `uploads/` at repository root — canonical media source (62 tracked files).

---

## 9. Open items requiring approval

1. **Merge/push** of `chore/deployment-cleanup` into `main`.
2. **SPA fallback** deployment (`ENABLE_SPA_FALLBACK=true`) — fixes current
   `404` responses on `/products`, `/admin`, `/login`; changes document-root
   Apache config.
3. **Move or delete** the four `.env.backup-*` files in the production Laravel
   root.
4. **Rotate the production SUPER_ADMIN password.** The committed 6-digit value
   has been removed from `sutantra-api/.env.example` and the
   `config/sutantra.php` fallback, and the seeder now refuses to create an
   account with an empty password. The old value still exists in Git history,
   so changing the live account password is the only real remediation.
5. First live run of the new workflow.
