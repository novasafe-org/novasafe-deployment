# Environments

> **Placeholder** — This document will define NovaSafe's AWS serverless environments.

Future contents will cover:

- **dev** — development and experimentation; lowest cost, permissive access
- **staging** — pre-production validation; mirrors production topology where practical
- **production** — live serverless stack; cut over incrementally from Docker/Nginx

Per-environment configuration will live under `environments/<name>/`. Account IDs, regions, and stack naming conventions will be documented here.
