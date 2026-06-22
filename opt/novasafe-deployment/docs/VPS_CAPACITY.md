# VPS capacity & troubleshooting (4 GB Hostinger)

Your Hostinger VPS runs **7 Docker stacks**. On 4 GB RAM that is tight — CPU/RAM spikes to ~100% usually mean the Linux **OOM killer** stopped a container (often `novasafe-admin-api`).

## Why the blog page fails

```
novasafe.io/blog  →  mobile-api  →  /api/v1/blog/*  →  admin-api (internal)
```

If **admin-api is stopped**, core cannot proxy blog requests → **504 / Failed to fetch**.

The admin panel (Netlify) also needs admin-api running, but the **landing blog** fails specifically because of this chain.

---

## Immediate fix (SSH into VPS)

```bash
cd /opt/novasafe-deployment

# 1. See why admin-api died
docker logs --tail 100 novasafe-admin-api
docker inspect novasafe-admin-api --format '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}'

# 2. Check if OOM killed anything recently
sudo dmesg -T | grep -i 'killed process' | tail -20

# 3. Restart admin-api
./deploy.sh admin-api

# 4. Confirm mobile-api can reach it (on VPS)
curl -s http://127.0.0.1:8085/api/v1/blog/health
curl -s http://127.0.0.1:8085/api/v1/blog/posts?perPage=5

# 5. From outside
curl -s https://mobile-api.novasafe.io/api/v1/blog/health
```

### Required env on mobile-api `.env`

```env
ADMIN_API_URL=http://novasafe-admin-api:3130
```

Without this, blog proxy points at the wrong host even if admin-api is up.

---

## Memory budget (recommended limits)

| Container            | RAM limit | Notes                          |
|----------------------|-----------|--------------------------------|
| mobile-api (core)    | 768 MB    | Main API + blog proxy          |
| admin-api            | 384 MB    | Blog, RBAC, admin ops          |
| app                  | 512 MB    | SSR web app                    |
| auth                 | 384 MB    | SSR auth                       |
| landing              | 128 MB    | Static nginx                   |
| nginx (edge)         | 128 MB    | TLS reverse proxy              |
| **Total containers** | **~2.3 GB** | Leaves ~1.5 GB for OS + spike |

`docker-compose.yml` files now set `mem_limit` + `NODE_OPTIONS=--max-old-space-size=…` to cap Node heaps.

**Keep Portainer stopped** unless you are actively debugging — it uses ~200–400 MB.

---

## Reduce load on 4 GB

### Short term (free)

1. **Stop Portainer** when not in use (already stopped in your screenshot — good).
2. **Restart admin-api** after deploy (see above).
3. **Redeploy** with updated compose files (memory limits):  
   `./deploy.sh admin-api` and `./deploy.sh mobile-api`
4. **Reload nginx** after mobile-api CORS fix: `./deploy.sh nginx`
5. **Trim Docker** periodically:
   ```bash
   docker system prune -f
   docker image prune -a -f   # only when safe — re-pulls on next deploy
   ```

### Medium term

1. **Upgrade VPS to 8 GB** — simplest fix for 5 Node services + nginx.
2. **Move admin-api + blog** to a small second VPS or Railway/Fly (~$5/mo).
3. **Move landing to Netlify/Cloudflare Pages** (static) — removes one container from VPS.

### Long term

- Add **swap** (2 GB) as emergency buffer (slower but avoids hard OOM):
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

---

## Common admin-api crash causes

| Symptom in logs | Fix |
|-----------------|-----|
| `MongoDB env vars missing` | Fill `MONGODB_*` in `platform/admin-api/.env` |
| `ADMIN_JWT_SECRET` empty | Set 32+ char secret |
| `EADDRINUSE` | Port conflict — `docker rm -f novasafe-admin-api` then redeploy |
| `OOMKilled: true` | Memory limit hit — upgrade RAM or lower other services |
| Container exits immediately | `docker logs novasafe-admin-api` — usually Mongo or seed error |

---

## Health endpoints

| URL | Meaning |
|-----|---------|
| `https://admin-api.novasafe.io/health` | Admin API direct (admin panel) |
| `https://mobile-api.novasafe.io/api/v1/blog/health` | Blog proxy → admin-api |
| `https://mobile-api.novasafe.io/mobile/health` | Core + MongoDB |

All three should return success when the stack is healthy.
