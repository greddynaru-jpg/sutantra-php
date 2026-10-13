# Sutantra Foods — Frontend

React (Vite) single-page app for Sutantra Foods. It talks to the Laravel API in
`../sutantra-api` over bearer-token authentication.

## Requirements

- Node.js 20+ (developed on Node 26)

## Setup

```bash
npm install
cp .env.example .env   # optional; defaults to the Vite dev proxy
npm run dev            # http://localhost:5173
```

`npm run build` produces a static bundle in `dist/`.

## Configuration

| Variable            | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Absolute API origin. Leave empty in development (Vite proxies `/api`).  |

In development `vite.config.js` proxies `/api/*` (including `/api/media/*`
image serving) to `http://127.0.0.1:8000`. In production set
`VITE_API_BASE_URL` to the deployed API origin.

## Authentication & roles

- Password-only login. The identifier is a registered **email or phone number**.
- The Sanctum bearer token is stored in `localStorage` (`sutantra_token`) and
  sent as `Authorization: Bearer <token>`.
- Roles and their landing routes after login:

  | Role          | Landing route       |
  | ------------- | ------------------- |
  | `SUPER_ADMIN` | `/super-admin`      |
  | `ADMIN`       | `/admin`            |
  | `USER`        | `/products`         |

- The product listing is **public**; the cart and profile pages require login.

## Routes

| Path               | Access              | Notes                                        |
| ------------------ | ------------------- | -------------------------------------------- |
| `/`                | public              | Homepage: About (vision), banners, categories, policies footer |
| `/products`        | public              | Product listing; `?categoryId=<id>` filters |
| `/policies/:slug`  | public              | Policy detail                                |
| `/login`           | public              | Password-only login                          |
| `/register`        | public              | New `USER` registration                      |
| `/profile`         | authenticated       | Update email / phone / name                  |
| `/cart`            | authenticated       | Cart shell (orders phase)                    |
| `/admin`           | ADMIN, SUPER_ADMIN  | Admin dashboard shell                        |
| `/super-admin`     | SUPER_ADMIN         | Super Admin dashboard shell                  |

## Images

Product, category, banner and logo images live outside the app (in the shared
`uploads/` directory) and are referenced by relative path in the database. The
app builds URLs through `mediaUrl()` (`src/services/api.js`), which targets
`/api/media/{reference}`. Missing images fall back to inline SVG placeholders.

## Project layout

```
src/
  components/    Brand, SiteHeader
  contexts/      AuthContext (token, roles, login/logout)
  pages/         HomePage, ProductsPage, LoginPage, RegisterPage,
                 ProfilePage, PolicyDetailPage, CartPage,
                 AdminDashboardPage, SuperAdminDashboardPage
  services/api.js
  utils/mediaHelpers.js
  styles.css
```
