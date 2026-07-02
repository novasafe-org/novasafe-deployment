# Where to run NovaSafe — locally vs prod

**Production**: All frontends (landing, auth, app) stay **loosely coupled**. GitHub workflows and Nginx handle build/deploy and routing; each service runs independently. **Local**: **Landing** is independent; **Auth + App** are started together from the **app** folder so devs don't run each frontend separately.

---

## 1. Run locally

| What | Where | Command | URLs |
|------|--------|---------|------|
| **Landing** (optional, standalone) | `novasafe-landing` | `pnpm dev` or `npm run dev` | http://localhost:3060 |
| **Auth + App** (recommended for dev) | `novasafe-app` | `pnpm dev` | Auth: http://localhost:3061, App: http://localhost:3063 |
| **App only** | `novasafe-app` | `pnpm run dev:app` | http://localhost:3063 |
| **Backend** | `novasafe-backend` | `pnpm start:vault` or from `services/vault`: `pnpm dev` | http://localhost:5001 |

- **Landing** can run on its own (no auth/app needed). Use when working on marketing/SEO only.
- From **novasafe-app**, `pnpm dev` starts **both** auth (port 3061) and app (port 3063) in one terminal. Devs do **not** start auth and app independently. Requires `novasafe-auth` as a sibling folder (e.g. `../novasafe-auth`).
- **API strategy**: **Prod**: Frontends use relative `/api/v`; Nginx routes `/api` → backend. **Local**: Frontends call the backend directly (`http://127.0.0.1:5001/v`); no proxy (avoids proxy socket issues). Backend CORS allows `*`, so the browser can call it from localhost:3061/3063.

---

## 2. Run “full stack” locally

Rough order:

1. Start **backend**: from `novasafe-backend` run `pnpm start:vault`, or from `novasafe-backend/services/vault` run `pnpm dev` (listens on port 5001).
2. **Landing** (optional): from `novasafe-landing`, `pnpm dev` → http://localhost:3060.
3. **Auth + App**: from `novasafe-app`, `pnpm dev` → starts auth (http://localhost:3061) and app (http://localhost:3063) together.

- Visit **http://localhost:3060** for marketing; “Get Started” can go to **http://localhost:3061/login** (auth).
- Visit **http://localhost:3061** for login/signup; after login, redirect goes to app (e.g. http://localhost:3063/vault) or use backend `redirect_url`.
- Visit **http://localhost:3063** for vault/dashboard and **full onboarding** (see below).

---

## 3. Onboarding flow — where it lives

- **Full onboarding** (plan selection, email/OTP, create account, completion, redirect) lives in **novasafe-auth** (`/onboarding/create-account`, `/accept-invitation`).
- After login or onboarding completion, the user is redirected to **novasafe-app** (e.g. http://localhost:3063/vault).

So:

- **Locally**: Use **auth** for login and full onboarding:  
  http://localhost:3061/login  
  http://localhost:3061/onboarding/create-account  
  After success, redirect goes to app (http://localhost:3063/vault).
- **Prod**: Auth at https://start.novasafe.io; app at https://app.novasafe.io.

---

## 4. Production (deployed)

| App | Production URL | Served by |
|-----|----------------|-----------|
| **Landing** | https://novasafe.io | `landing` container (from `novasafe-landing` image when built) |
| **Auth** | https://start.novasafe.io | `auth` container (from `novasafe-auth` image when built) |
| **App** | https://app.novasafe.io, https://\<company\>.novasafe.io | `app` container (from `novasafe-app` / novasafe-ui image) |
| **Backend** | Not public; only via **/api** on auth/app domains | `backend` container |

- **Production**: All frontends stay loosely coupled; GitHub workflows and Nginx handle builds and routing. Landing, Auth, and App run as separate containers; each can be built and deployed from its own repo.
- **App** serves vault/dashboard only; **Auth** serves login, signup, and full onboarding.

---

## 5. Quick reference

| I want to… | Local | Prod |
|------------|--------|------|
| See marketing site | http://localhost:3060 (landing) | https://novasafe.io |
| Log in / sign up | http://localhost:3061 (auth) | https://start.novasafe.io |
| Full onboarding (create account flow) | http://localhost:3061/onboarding/create-account (auth) | https://start.novasafe.io/onboarding/create-account |
| Use vault / dashboard | http://localhost:3063 (app) | https://app.novasafe.io |

**Prod**: Landing, Auth, and App run independently; onboarding runs in **auth**. **Local**: Landing is independent; from **novasafe-app** run `pnpm dev` to start auth + app together.
