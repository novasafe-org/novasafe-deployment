# Phase-2 Enterprise Hardening Summary

Phase-2 builds on the Phase-1 domain/API split with **independent deployability**, **security hardening**, and **production readiness**. No backend logic or schema changes.

## 1. Independent deployability

- **Healthchecks** for `landing`, `auth`, and `app`: each container exposes `/health` (added in frontend nginx.conf); Docker Compose healthcheck runs every 30s (wget to `http://127.0.0.1:80/health`). Orchestrators can use container health for rolling updates and failover.
- **App Dockerfile** (novasafe-app): `RUN apk add --no-cache wget` so the healthcheck works in the default nginx:alpine image.
- **Deploy single service**: `docker compose pull <service>` then `docker compose up -d --no-deps <service>` so only that service is updated; others keep running.
- **Versioned images**: Documented use of image tags (e.g. `:v1.2.0`) in README for rollback and staged releases.

## 2. Security hardening

**Nginx (novasafe.io.conf, all HTTPS server blocks):**

- `server_tokens off` — hide nginx version.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — HSTS.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()` — restrict browser features.
- Existing: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `X-Robots-Tag` (auth/app).

**API proxy (`location /api/`):**

- `proxy_connect_timeout 10s`, `proxy_send_timeout 60s`, `proxy_read_timeout 60s`.
- `proxy_hide_header X-Powered-By` and `proxy_hide_header Server` so backend stack/version are not leaked to clients.

**Frontend container (novasafe-app/nginx.conf):**

- `/health` endpoint for healthchecks (no auth, minimal response).
- `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` on the SPA.

## 3. Production readiness

- **Backend**: Already had healthcheck; unchanged. No public port; only `/api` via nginx.
- **Frontend services**: All three (landing, auth, app) now have healthchecks and a defined `/health` contract.
- **README**: Updated with deployability (single-service deploy, image tags), env/secrets, rollback steps, and security summary.

## Files changed

| Repo / path | Change |
|-------------|--------|
| **novasafe-app** | |
| `nginx.conf` | `/health` endpoint; security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy). |
| `Dockerfile` | `RUN apk add --no-cache wget` for healthcheck. |
| **novasafe-deployment** | |
| `novasafe.io.conf` | `server_tokens off`; HSTS; Referrer-Policy; Permissions-Policy; `/api` timeouts and `proxy_hide_header` for backend. |
| `docker-compose.yml` | Healthchecks for `landing`, `auth`, `app` (wget to `/health`). |
| `README.md` | Independent deployability, env matrix, rollback, security summary. |
| `PHASE2_HARDENING.md` | This summary. |

## Assumptions

- Orchestrator (Docker Compose or other) uses container health only for reporting/restart; nginx does not require “healthy” upstreams to start (default nginx behavior).
- Backend continues to serve `/health`; no change to backend code.
- When `novasafe-landing` and `novasafe-auth` ship as separate images, their Dockerfiles should expose `/health` the same way (or use the same nginx snippet) so existing healthchecks keep working.
