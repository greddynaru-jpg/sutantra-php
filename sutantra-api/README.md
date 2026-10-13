# Sutantra Foods — API

Laravel 13 API for Sutantra Foods (bearer-token auth via Sanctum, MySQL). The
React frontend lives in `../sutantra-frontend` and consumes these endpoints.

This application is a from-scratch rebuild of the legacy Java/Spring Boot
backend; no Java code or runtime is required.

## Requirements

- PHP 8.3+ and Composer
- MySQL (database `db_sutantra_laravel`)

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
# configure DB_* , SANCTUM_STATEFUL_DOMAINS, and the keys below
php artisan serve            # http://127.0.0.1:8000
```

> Never commit `.env`. Only `.env.example` (keys, no secrets) is tracked.

### Configuration keys

| Key                        | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `UPLOADS_PATH`             | Absolute path to the shared media dir (`../uploads` by default).|
| `UPLOADS_MAX_SIZE_KB`      | Max image upload size in KB (default 5120).                     |
| `CORS_ALLOWED_ORIGINS`     | Comma-separated browser origins allowed to call the API.        |
| `SUPER_ADMIN_*`            | Seed values for the initial SUPER_ADMIN (see `config/sutantra.php`). |

## Media

Product / category / banner / logo images live **outside** both app folders in
`uploads/{logo,products,categories,banners}`. Database rows store relative
references (e.g. `products/abc.webp`); files are served through
`GET /api/media/{reference}`, so no web-server alias or `storage:link` is
needed. Uploads are validated against `config/uploads.php`.

## Roles

`SUPER_ADMIN`, `ADMIN`, `USER`. Enforced server-side by the `role:` middleware
(`EnsureRole`). Role landing pages are decided by the frontend.

## Error contract

All `api/*` requests receive JSON. In particular an unauthenticated request
returns **401** (never a redirect) and a forbidden one returns **403**.

## Endpoints

### Public

| Method | Path                          | Notes                                  |
| ------ | ----------------------------- | -------------------------------------- |
| GET    | `/api/test`                   | Health check                           |
| GET    | `/api/media/{path}`           | Serve an uploaded image                |
| GET    | `/api/catalog/categories`     | Active categories (with product count) |
| GET    | `/api/catalog/banners`        | Active homepage banners                |
| GET    | `/api/catalog/vision`         | Homepage vision / About                |
| GET    | `/api/catalog/policies`       | Active footer policies                 |
| GET    | `/api/catalog/policies/{slug}`| A single policy by slug                |
| GET    | `/api/catalog/products`       | Product listing (`?categoryId=`)       |

### Auth

| Method | Path                     | Notes                                        |
| ------ | ------------------------ | -------------------------------------------- |
| POST   | `/api/auth/login`        | Password-only; identifier = email **or** phone (10/min) |
| POST   | `/api/auth/register`     | Creates a `USER`                              |
| GET    | `/api/auth/me`           | Current profile                               |
| PUT    | `/api/auth/profile`      | Update profile                                |
| POST   | `/api/auth/logout`       | Revoke the current token                      |
| GET    | `/api/user`              | Legacy-compatible current profile             |

### Admin — ADMIN + SUPER_ADMIN

Every resource supports `GET` (list), `POST` (create), `POST/PUT/PATCH /{id}`
(update; POST is accepted so multipart image uploads work), and `DELETE /{id}`.

| Resource    | Base path               | Image field |
| ----------- | ----------------------- | ----------- |
| Products    | `/api/admin/products`   | `image`     |
| Categories  | `/api/admin/categories` | `image`     |
| Banners     | `/api/admin/banners`    | `image` (required on create) |
| Policies    | `/api/admin/policies`   | —           |
| Vision      | `/api/admin/vision`     | — (singleton `GET` / `PUT`) |

### Admin — SUPER_ADMIN only

| Method                | Path                  | Notes                          |
| --------------------- | --------------------- | ------------------------------ |
| GET/POST              | `/api/admin/users`    | List / create users            |
| POST/PUT/PATCH/{id}   | `/api/admin/users/{id}` | Update user, role, status, password |
| DELETE /{id}          | `/api/admin/users/{id}` | Delete (blocked for self / last super admin / accounts with orders) |

Writes send `multipart/form-data` (fields + optional `image`) or JSON for
resource-less endpoints. Deletions return **409** when the row is referenced by
products, carts or orders.

## Data-preservation

- Migrations are additive. Never run `migrate:fresh` — the schema is documented
  in `database/migrations` and evolves additively.
- `sutantra:import-legacy` imported the legacy data; legacy plaintext passwords
  were rehashed to bcrypt.

## Console commands

| Command                          | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `sutantra:import-legacy`         | Import legacy data from `db_sutantra`         |
| `sutantra:rehash-legacy-passwords` | Rehash any remaining plaintext passwords    |

Seeders: `SuperAdminSeeder`, `HomePageVisionSeeder`, `HomePagePolicySeeder`
(all idempotent).
