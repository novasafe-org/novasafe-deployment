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

Access logs (schema v1):

```logql
{job="novasafe", log_type="access"} | json
```

Errors:

```logql
{job="novasafe", level="error"}
```

### 5. Import dashboard

Grafana → **Dashboards** → **Import** → upload  
`infra/observability/grafana/dashboards/novasafe-api-logs.json`

If you already imported an older version, re-import the same file (same UID `novasafe-api-logs`) and choose **Replace existing**.

**Important:** At the top, set **Datasource** to `grafanacloud-patientgelato620-logs` — **not** `usage-insights` or `alert-state-history`. Those are Grafana internal metrics, not your API logs.

**Dashboard layout (v4 — schema v1):**

| Section | Panels |
|---------|--------|
| Overview | Total, errors, warnings, HTTP requests, 5xx, avg latency (% change) |
| Trends | Stacked bars by level, donut, bar gauge by service |
| HTTP | Status class (2xx–5xx), p50/p95/p99 latency |
| Live logs | JSON table: Level, Service, Method, Path, Status, Duration, Trace ID, User ID |
| Matrix | Service × level counts |
| Errors | Detail log stream |
| Footer | Volume by service |

Filters: **Service**, **Environment**, **Log Level**, **Log Type** (`access` / `app` / `audit`).

## Vendor-neutral schema (Grafana today, Datadog tomorrow)

Apps emit **schema v1 JSON** (see `novasafe-backend/docs/OBSERVABILITY.md`). The collector (Alloy) only maps fields → Loki labels; **never change log shape per vendor**.

| JSON field | Loki label | Datadog tag (migration) |
|------------|------------|-------------------------|
| `level` | `level` | `status` |
| `logType` | `log_type` | `log_type` |
| `service` | `service` | `service` |
| `method`, `path`, `userId`, … | JSON only | attributes |

**Rollout order:** deploy backend images → `./deploy.sh observability` → re-import dashboard.

Legacy logs (plain-text line, `level=http`) age out of Loki in ~14 days after deploy.

## Grafana datasource (read this)

Your stack has multiple Loki-like datasources:

| Datasource | What it is |
|------------|------------|
| `grafanacloud-*-logs` | **Your app logs** — use this in Explore & dashboard |
| `grafanacloud-*-usage-insights` | Grafana Cloud billing/usage — **not your APIs** |
| `grafanacloud-*-alert-state-history` | Alert history — **not your APIs** |

**Logs Drilldown** showing `service=grafana` or `service=logs` is Grafana’s own telemetry, not NovaSafe.

In **Explore**, select `grafanacloud-patientgelato620-logs` and run:

```logql
{job="novasafe"}
```

## Log delay (why not instant?)

| Stage | Typical delay |
|-------|----------------|
| App writes to file | ~0s |
| Alloy tails file | ~1–5s (`file_match sync_period`) |
| Alloy batches push to Loki | ~1s (`batch_wait`) |
| Grafana Cloud indexes chunk | **15–90s** on free tier (normal) |
| Dashboard refresh | 5–30s depending on setting |

**Total:** often **20–60 seconds** from log line → visible in Explore. **2 minutes** can happen on free tier during load or first ingest.

For fastest view: **Explore → Loki → Live** (tail mode), datasource `*-logs`, query `{job="novasafe"}`.

Dashboard panels use aggregated queries (`count_over_time`) which lag more than raw log lines.


## Adding a new service (scalable)

1. Ensure the service writes JSON logs to a host-mounted directory (`app-%DATE%.log` pattern).
2. Copy `alloy/_template.alloy` → `alloy/<name>.alloy` (same folder as `main.alloy`).
3. Add a read-only volume in `docker-compose.yml`:
   ```yaml
   - /opt/novasafe-deployment/<path>/logs:/var/log/novasafe/<name>:ro
   ```
4. `./deploy.sh observability`

No changes to `main.alloy` are required — Alloy loads all `*.alloy` files in the `alloy/` directory (flat layout; subfolders are not loaded).

## Saved Explore queries (create in Grafana UI)

| Name | Query |
|------|-------|
| Mobile API — all | `{job="novasafe", service="mobile-api"}` |
| Admin API — all | `{job="novasafe", service="admin-api"}` |
| HTTP access | `{job="novasafe", log_type="access"} \| json` |
| All errors | `{job="novasafe", level="error"}` |
| HTTP 5xx | `{job="novasafe", log_type="access"} \| json \| statusCode >= 500` |

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
| No logs in Explore | `docker logs novasafe-alloy`; verify `.env` credentials; redeploy alloy config |
| Dashboard shows "No data" | Datasource must be `grafanacloud-*-logs`, not `usage-insights` |
| Logs Drilldown shows `grafana`/`logs` only | Wrong stream — that's Grafana internal, not `{job="novasafe"}` |
| Wrong service label | `service` label comes from Alloy config, not JSON `service` field |
| Admin-api empty files | Redeploy admin-api image after file-logger fix |
| Alloy `stat app-*.log` errors | Fixed via `local.file_match` — redeploy observability |
| Dashboard KPIs empty | Redeploy backend + Alloy; logs must be JSON schema v1 (not stripped plain text) |
| `log_type` label missing | Redeploy observability (`main.alloy` keeps full JSON + labels) |

## Related files

| Path | Role |
|------|------|
| `alloy/main.alloy` | Shared JSON parse + Loki push |
| `alloy/*.alloy` | Per-service file tailers (flat directory) |
| `docker-compose.yml` | Alloy container + volume mounts |
| `scripts/verify-alloy.sh` | Health check |
| `scripts/prune-old-log-archives.sh` | 90-day VPS cleanup |
| `scripts/backfill-loki.sh` | One-time historical push |
