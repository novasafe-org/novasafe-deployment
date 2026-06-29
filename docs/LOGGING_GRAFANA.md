# NovaSafe centralized logging (Grafana Cloud + Alloy)

Ship API log files from the Hostinger VPS to **Grafana Cloud Loki** for search, dashboards, and alerts.  
**Hot storage:** Grafana Cloud (~14 days on free tier). **Cold storage:** zipped daily files on the VPS (~90 days).

## Architecture

```
mobile-api / admin-api  →  app-YYYY-MM-DD.log  →  Alloy (tail)  →  Grafana Cloud Loki
                              ↓ midnight
                         app-YYYY-MM-DD.log.gz  (kept on VPS)
```

| Layer | Retention | Purpose |
|-------|-----------|---------|
| Grafana Cloud Loki | ~14 days (free tier) | Real-time search, dashboards, alerts |
| VPS `.gz` archives | 90 days (`LOG_MAX_FILES` + prune cron) | Long-term archive, forensics |

## Quick start (VPS)

### 1. You — Grafana Cloud credentials

1. Open [Grafana Cloud](https://grafana.com/) → your stack (`patientgelato620.grafana.net`).
2. **Connections** → **Add new connection** → **Hosted logs (Loki)** (or **Collector setup**).
3. Create an API token with **logs:write** scope.
4. Note:
   - **URL:** `https://logs-prod-XXX.grafana.net/loki/api/v1/push`
   - **User / instance ID:** numeric (e.g. `123456`)
   - **Password:** token (`glc_...`)

### 2. You — Create `.env` on the VPS

```bash
ssh root@<vps-ip>
cd /opt/novasafe-deployment/infra/observability
cp .env.example .env
nano .env   # paste LOKI_URL, LOKI_USERNAME, LOKI_PASSWORD
chmod 600 .env
```

### 3. Deploy (CI or manual)

After this repo is pushed:

```bash
cd /opt/novasafe-deployment
./deploy.sh observability
```

Or wait for GitHub Actions when `infra/observability/**` changes.

### 4. Verify

```bash
bash /opt/novasafe-deployment/infra/observability/scripts/verify-alloy.sh
```

In Grafana → **Explore** → Loki:

```logql
{job="novasafe", service="mobile-api"}
```

Errors:

```logql
{job="novasafe"} | json | level="error"
```

### 5. Import dashboard

Grafana → **Dashboards** → **Import** → upload  
`infra/observability/grafana/dashboards/novasafe-api-logs.json`

## Adding a new service (scalable)

1. Ensure the service writes JSON logs to a host-mounted directory (`app-%DATE%.log` pattern).
2. Copy `alloy/services/_template.alloy` → `alloy/services/<name>.alloy` and set `service` + `__path__`.
3. Add a read-only volume in `docker-compose.yml`:
   ```yaml
   - /opt/novasafe-deployment/<path>/logs:/var/log/novasafe/<name>:ro
   ```
4. `./deploy.sh observability`

No changes to `main.alloy` are required — Alloy loads all files in `alloy/services/`.

## Saved Explore queries (create in Grafana UI)

| Name | Query |
|------|-------|
| Mobile API — all | `{job="novasafe", service="mobile-api"}` |
| Admin API — all | `{job="novasafe", service="admin-api"}` |
| All errors | `{job="novasafe"} \| json \| level="error"` |
| HTTP 5xx | `{job="novasafe"} \| json \| statusCode >= 500` |

## Backfill (optional)

Only for archives still inside Loki retention:

```bash
BACKFILL_DAYS=14 bash /opt/novasafe-deployment/infra/observability/scripts/backfill-loki.sh mobile-api
```

## VPS archive cleanup (optional cron)

```bash
# /etc/cron.d/novasafe-log-prune
0 3 * * * root /opt/novasafe-deployment/infra/observability/scripts/prune-old-log-archives.sh >> /var/log/novasafe-log-prune.log 2>&1
```

## Free tier monitoring

Grafana Cloud → **Usage** → watch Loki ingest (free tier ≈ 50 GB/month).  
Keep production at `LOG_LEVEL=info`; avoid `debug` in Loki.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No logs in Explore | `docker logs novasafe-alloy`; verify `.env` credentials |
| Wrong service label | `service` label comes from Alloy config, not JSON `service` field |
| Admin-api empty files | Redeploy admin-api image after file-logger fix |
| Alloy config change | `./deploy.sh observability` (recreates container) |

## Related files

| Path | Role |
|------|------|
| `alloy/main.alloy` | Shared JSON parse + Loki push |
| `alloy/services/*.alloy` | Per-service file tailers |
| `docker-compose.yml` | Alloy container + volume mounts |
| `scripts/verify-alloy.sh` | Health check |
| `scripts/prune-old-log-archives.sh` | 90-day VPS cleanup |
| `scripts/backfill-loki.sh` | One-time historical push |
