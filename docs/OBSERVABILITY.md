# Observability schema (deployment)

NovaSafe uses a **vendor-neutral JSON log schema (v1)** in application code.  
The full specification and Datadog migration map live in the backend repo:

**`novasafe-backend/docs/OBSERVABILITY.md`**

This deployment repo owns:

- Alloy collector (`infra/observability/alloy/`)
- Grafana dashboard (`infra/observability/grafana/dashboards/`)
- Runbook (`docs/LOGGING_GRAFANA.md`)

Applications must not embed Grafana- or Datadog-specific fields. The collector maps `logType` → Loki `log_type` today; Datadog Agent can map the same JSON to `log_type` tag later.
