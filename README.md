# NovaSafe Deployment

Deployment config for NovaSafe SaaS: nginx, docker-compose, and server scripts. Phase-2 adds independent deployability, security hardening, and production readiness.

## Folder / repo layout (refactor reflected)

| Folder / repo        | Contents | Deploy as |
|----------------------|----------|-----------|
| **novasafe-landing** | Marketing site (Vite + React): Home, Pricing, About. CTAs → start.novasafe.io. | `landing` |
| **novasafe-auth**    | Auth app (Vite + React): Login, Signup, onboarding. API: `/api/v`. | `auth` |
| **novasafe-app**     | Main app: vault, dashboard, settings. Full SPA. | `app` |
| **novasafe-deployment** | Nginx config, docker-compose, certbot. | — |
| **novasafe-backend** | API (unchanged). | `backend` |

Build and push images for `landing` and `auth` from their repos, then point docker-compose to e.g. `ghcr.io/novasafe-org/novasafe-landing:latest` and `ghcr.io/novasafe-org/novasafe-auth:latest`.

## Domain & URL strategy

| Purpose              | URL                      |
|----------------------|--------------------------|
| Landing (SEO)        | https://novasafe.io      |
| Auth / Onboarding   | https://start.novasafe.io |
| Individual App      | https://app.novasafe.io |
| Team App            | https://\<company\>.novasafe.io |
| Portainer (internal) | https://internal-docker.novasafe.io (IP-restricted) |

- **Landing**: Marketing only; no auth; SEO-indexed.
- **Auth (start.\*)**: Login, signup, onboarding; short-lived; noindex.
- **App**: Vault, dashboard; noindex; backend only via `/api`.
- **Portainer**: Container monitoring at **https://internal-docker.novasafe.io**; access is restricted by IP (edit `nginx/conf/internal-docker.allowed_ips.conf`).
- **TLS**: Every hostname (novasafe.io, www, start, app, internal-docker) must be in the same certificate or you’ll see “Your connection isn’t private” on some domains. See **[CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md)**.

## Nginx

- Nginx loads all `.conf` files from `./nginx/conf/` (mounted as `/etc/nginx/conf.d`). Ensure `nginx/conf/novasafe.io.conf` and `nginx/conf/internal-docker.allowed_ips.conf` are present; the repo includes both.
- **Backend**: Not exposed publicly. All API traffic goes through nginx: `location /api/` → backend container (rewrite `/api` → backend path `/v`). Proxy timeouts (connect 10s, read/send 60s); `X-Powered-By` and `Server` from backend are stripped.
- **Frontend**: Three services — `landing`, `auth`, `app` — each proxied by hostname. Until `novasafe-landing` and `novasafe-auth` are built, `landing` and `auth` use the same image as `app` (see docker-compose comments).
- **Security headers** (HTTPS server blocks): HSTS (1y, includeSubDomains, preload), `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`; `server_tokens off`.

## Docker Compose

- **nginx**: Reverse proxy; 80/443; depends on landing, auth, app, backend.
- **portainer**: Portainer CE; no published ports; reachable only via nginx at `internal-docker.novasafe.io` (IP allow-list in `nginx/conf/internal-docker.allowed_ips.conf`).
- **landing**, **auth**, **app**: Each has a **healthcheck** (`GET /health` every 30s). Use `novasafe-ui` until separate landing/auth images exist.
- **backend**: No published ports; only reachable via nginx `/api`; has its own healthcheck (`/health`).
- **certbot**: TLS renewal.

## Independent deployability

- **Deploy one service**: Pull and recreate only that container so others keep running.
  ```bash
  docker compose pull app
  docker compose up -d --no-deps app
  ```
- **Image tags**: Compose uses `:latest`. For versioned releases, build and push e.g. `ghcr.io/novasafe-org/novasafe-ui:v1.2.0`, then in `docker-compose.yml` (or override) set `image: ghcr.io/novasafe-org/novasafe-ui:v1.2.0` for the service(s) you want to pin.
- **Healthchecks**: Orchestrators can use container health (landing/auth/app expose `/health`). Nginx does not wait for healthy upstreams by default; ensure backend is up before heavy traffic.

## Env and secrets

- **Backend**: All backend env (DB, JWT, etc.) live in deployment `.env`; loaded via `env_file: .env` for the `backend` service. Do not commit `.env`.
- **Frontend**: Landing/auth/app are static builds; no runtime env required at deploy time. Build-time env (e.g. `VITE_*`) are baked into the image in each repo’s CI.

## Rollback

- **Revert a frontend service**: Point the service’s `image` to the previous tag (e.g. `v1.1.0`), then `docker compose pull <service>` and `docker compose up -d --no-deps <service>`.
- **Revert nginx config**: Restore previous `novasafe.io.conf`, then `docker compose exec nginx nginx -s reload` or recreate the nginx container.
- **Revert backend**: Same as frontend; ensure DB/migrations are backward-compatible.

## Local development

- Local dev does **not** use subdomains; all UI on `http://localhost:<port>`.
- Production behavior (subdomains, `/api` base) is enabled only when `import.meta.env.PROD === true` in the frontend.
- **See [RUN_LOCALLY_AND_PROD.md](./RUN_LOCALLY_AND_PROD.md)** for: which folder to run for each app, ports, and where onboarding runs (app vs auth).

## SEO & security

- **Landing**: Indexed; no `X-Robots-Tag` restriction.
- **Auth & App**: `X-Robots-Tag: noindex, nofollow` set by nginx; frontend also sets `<meta name="robots" content="noindex, nofollow" />` via tenant detection.
- **Hardening**: HSTS, Referrer-Policy, Permissions-Policy, no server version leak, backend response headers stripped on `/api` proxy.

## HTTPS for all domains (certificate)

If only **https://novasafe.io** is secure and **app.novasafe.io**, **start.novasafe.io**, **internal-docker.novasafe.io** show “Your connection isn’t private”, the TLS certificate does not yet include those hostnames. Add them in one go, then reload nginx:

```bash
cd /path/to/novasafe-deployment

docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  --email YOUR_EMAIL \
  --expand \
  -d novasafe.io \
  -d www.novasafe.io \
  -d start.novasafe.io \
  -d app.novasafe.io \
  -d internal-docker.novasafe.io \
  --agree-tos --no-eff-email

docker compose exec nginx nginx -s reload
```

Replace `YOUR_EMAIL` with your Let’s Encrypt email. Full explanation and optional wildcard setup: **[CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md)**.

## Troubleshooting 502

- **502 Bad Gateway** usually means nginx cannot reach an upstream container. Check:
  1. **Containers running**: `docker compose ps` — `landing`, `auth`, `app`, `backend` should be Up. If any are Restarting or Exit, run `docker compose logs <service>`.
  2. **Nginx config loaded**: Ensure `nginx/conf/novasafe.io.conf` exists (it’s in this repo). The compose volume is `./nginx/conf:/etc/nginx/conf.d`; if that directory only had the IP allow-list, the main server blocks were not loaded.
  3. **Nginx upstream errors**: `docker compose logs nginx` — look for "upstream timed out" or "connection refused" to see which upstream failed.
  4. **Portainer**: If only `https://internal-docker.novasafe.io` returns 502, Portainer may be down; nginx does not depend on it, so the rest of the site still works.

## Troubleshooting 403 on internal-docker.novasafe.io

- **403 Forbidden** on `https://internal-docker.novasafe.io` means your client IP is not in the allow list. Edit `nginx/conf/internal-docker.allowed_ips.conf`: either add `allow YOUR_IP;` (and keep `deny all;`) or temporarily use `allow all;` for testing, then reload nginx: `docker compose exec nginx nginx -s reload`.
