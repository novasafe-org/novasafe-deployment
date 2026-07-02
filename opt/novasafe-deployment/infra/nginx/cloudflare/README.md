# Cloudflare origin certificate (VPS only)

**Do not commit `origin.key` or `origin.crt` to git.**

Nginx reads these files from this directory on the server:

```
/opt/novasafe-deployment/infra/nginx/cloudflare/origin.crt
/opt/novasafe-deployment/infra/nginx/cloudflare/origin.key
```

## First-time setup

1. In Cloudflare: **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Copy the certificate and private key to the VPS paths above (`chmod 600 origin.key`)
3. Reload nginx: `./deploy.sh sync` or `docker compose exec nginx nginx -s reload`

See [CERTIFICATE_SETUP.md](../../../../CERTIFICATE_SETUP.md) and [DEPLOYMENT.md](../../../../DEPLOYMENT.md).

## If the private key was ever committed to git

1. **Rotate** the origin certificate in Cloudflare (revoke the old one, create a new pair)
2. Install the new files on the VPS only
3. Never add them to this repository
