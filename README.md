<p align="center">
  <strong>NovaSafe Deployment</strong><br>
  <sub>Source of truth for VPS config — Docker, Nginx, deploy scripts.</sub>
</p>

---

## What is this?

App code lives in other repos. **This repo** holds everything the server needs: `docker-compose`, nginx, and `deploy.sh`.

```
App repo push  →  build image (GHCR)  →  shared deploy workflow  →  VPS
Deployment push  →  redeploy only changed services
```

**Full architecture, flows, and troubleshooting:** **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## Quick start

### 1. GitHub secrets (org level)

| Secret | Value |
|---|---|
| `SSH_USER` | `root` |
| `SSH_HOST` | Hostinger VPS IP |
| `SSH_PASSWORD` | Root password |
| `DEPLOY_PATH` | `/opt/novasafe-deployment` |

### 2. Push this repo to `master`

Workflows must exist before app repos can deploy.

### 3. Copy `.env` + certs to the VPS (one time)

| File | VPS path |
|---|---|
| App / Auth / Backend / Mobile API `.env` | `platform/*/` and `mobile-api/` |
| Cloudflare origin cert/key | `infra/nginx/cloudflare/` |

### 4. Push any app repo

First deploy on a **fresh VPS** auto-runs `initial-setup` + `first-boot`.  
Services without `.env` are skipped until you copy them.

### 5. Update DNS

Point Cloudflare A records to the new VPS IP.

---

## VPS paths

```
/opt/novasafe-deployment/       ← live config (compose, nginx, deploy.sh)
/opt/novasafe-deployment-repo/  ← git clone (for sync)
```

---

## Manual commands (on server)

```bash
cd /opt/novasafe-deployment
./deploy.sh sync          # pull latest config
./deploy.sh app           # redeploy one service
./deploy.sh status        # show containers
```

---

## Domains

| URL | Service |
|---|---|
| https://novasafe.io | Landing |
| https://start.novasafe.io | Auth |
| https://app.novasafe.io | App |
| https://mobile-api.novasafe.io | Mobile API |

---

## Documentation

| Doc | Contents |
|---|---|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Architecture, flows, workflows, scripts, troubleshooting |
| [CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md) | TLS setup |
| [RUN_LOCALLY_AND_PROD.md](./RUN_LOCALLY_AND_PROD.md) | Local dev vs prod |
| [MOBILE_API_DOMAIN.md](./MOBILE_API_DOMAIN.md) | Mobile API routing |
