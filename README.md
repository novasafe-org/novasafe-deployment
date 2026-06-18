<p align="center">
  <strong>NovaSafe Deployment</strong><br>
  <sub>Source of truth for VPS config — Docker, Nginx, deploy scripts.</sub>
</p>

---
### Sync Status

[![Deploy Changed Services](https://github.com/novasafe-org/novasafe-deployment/actions/workflows/deploy-on-change.yml/badge.svg)](https://github.com/novasafe-org/novasafe-deployment/actions/workflows/deploy-on-change.yml)


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

### 1. GitHub secrets (org level — must include **all** repos)

| Secret | Value |
|---|---|
| `SSH_USER` | `root` |
| `SSH_HOST` | `123.45.67.89` | **VPS public IP only** (not hostname, not panel URL) |
| `SSH_PASSWORD` | Root password |
| `DEPLOY_PATH` | `/opt/novasafe-deployment` |

> **Important:** Org secrets must be accessible by **`novasafe-deployment`** and every app repo — not just landing/app. If other repos deploy fine but `novasafe-deployment` fails, open **novasafe-deployment → Settings → Secrets → Actions** and delete any **repository-level** `SSH_*` secrets (they override org secrets). Especially remove a bad `SSH_PRIVATE_KEY` if you use password auth.

> **SSH_HOST** must be your static VPS IP only, e.g. `69.62.74.79` — no `http://`, no `root@`.

### 2. Enable reusable workflows (one-time org/repo setting)

`novasafe-deployment` → **Settings** → **Actions** → **General** → **Access**

Set: **"Accessible from repositories in the 'novasafe-org' organization"**

Without this, app repos get `workflow was not found` when calling `deploy-service.yml`.

### 3. Push this repo to `master`

Workflows must exist on GitHub **before** app repos can call them.

### 4. Copy `.env` + certs to the VPS (one time)

| File | VPS path |
|---|---|
| App / Auth / Mobile API `.env` | `platform/*/` and `mobile-api/` |
| Cloudflare origin cert/key | `infra/nginx/cloudflare/` |
| Portainer IP allowlist | `infra/nginx/conf.d/snippets/internal-docker.allowed_ips.conf` (edit in repo, syncs on deploy) |

### 5. Push any app repo

First deploy on a **fresh VPS** auto-runs `initial-setup` + `first-boot`.  
Services without `.env` are skipped until you copy them.

### 6. Update DNS

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
| https://internal-docker.novasafe.io | Portainer (IP-restricted) |

**Portainer redirecting to start.novasafe.io?** Usually `portainer.conf` is not on the VPS yet, or nginx was not reloaded. Run `./deploy.sh nginx` on the server. DNS must be an **A record** for `internal-docker` → VPS IP (not a CNAME to another subdomain). Check Cloudflare has no redirect rule for that hostname.

---

## Documentation

| Doc | Contents |
|---|---|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Architecture, flows, workflows, scripts, troubleshooting |
| [CERTIFICATE_SETUP.md](./CERTIFICATE_SETUP.md) | TLS setup |
| [RUN_LOCALLY_AND_PROD.md](./RUN_LOCALLY_AND_PROD.md) | Local dev vs prod |
| [MOBILE_API_DOMAIN.md](./MOBILE_API_DOMAIN.md) | Mobile API routing |
