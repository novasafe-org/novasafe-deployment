# TLS certificate setup (HTTPS for all domains)

## Why only one domain shows as secure

Your browser shows **"Your connection isn't private"** on `app.novasafe.io`, `start.novasafe.io`, `mobile-api.novasafe.io` because the **TLS certificate** currently only lists one (or a few) hostnames. Each hostname you serve over HTTPS must be listed in the certificate’s **Subject Alternative Names (SANs)**. If it’s missing, the browser treats it as insecure.

- **Working:** the hostname(s) that were in the cert when it was first issued (e.g. `novasafe.io`).
- **Not working:** any other hostname (e.g. `app.novasafe.io`, `start.novasafe.io`, `mobile-api.novasafe.io`) that was never added to the cert.

## Fix: add all hostnames to the same certificate

From your **novasafe-deployment** directory (so the same `docker-compose` and volumes are used), run certbot **once** with **all** the hostnames you use. Use `--expand` so Let’s Encrypt adds the new names to your existing cert (or creates one with all of them).

### 1. Ensure nginx and certbot volumes are correct

Your `docker-compose.yml` should have:

- nginx: `./nginx/certbot/www:/var/www/certbot` and `./nginx/certbot/conf:/etc/letsencrypt`
- certbot: same volumes

So when certbot writes the cert, nginx reads the same files.

### 2. Run certbot with all explicit hostnames

Replace `YOUR_EMAIL` with the email you use for Let’s Encrypt (e.g. `admin@novasafe.io`).

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
  -d mobile-api.novasafe.io \
  -d admin-api.novasafe.io \
  --agree-tos \
  --no-eff-email
```

- **First time:** certbot may create a new certificate with all these domains.
- **If you already have a cert** (e.g. only for `novasafe.io`): `--expand` adds the other domains to that cert.

### 3. Reload nginx

```bash
docker compose exec nginx nginx -s reload
```

After that, these should all show as secure (no “connection isn’t private”):

- https://novasafe.io  
- https://www.novasafe.io  
- https://start.novasafe.io  
- https://app.novasafe.io  
- https://mobile-api.novasafe.io  
- https://admin-api.novasafe.io  

### 4. Optional: wildcard for team subdomains (*.novasafe.io)

Your nginx config also serves **`<company>.novasafe.io`** (e.g. `acme.novasafe.io`). A single certificate can only cover:

- **Explicit names** (what we did above), or  
- A **wildcard** like `*.novasafe.io`.

You **cannot** get a wildcard cert with the **webroot** method. You need a **DNS challenge** so Let’s Encrypt can verify you control the domain via DNS.

To add a wildcard (so any `something.novasafe.io` is covered):

1. Use a DNS plugin, for example:
   - [certbot-dns-cloudflare](https://certbot-dns-cloudflare.readthedocs.io/)
   - [certbot-dns-route53](https://certbot-dns-route53.readthedocs.io/)
   - Or any [certbot DNS plugin](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal) for your DNS provider.

2. Issue a cert that includes the wildcard (and optionally the apex):
   ```bash
   certbot certonly --dns-<provider> \
     -d novasafe.io \
     -d "*.novasafe.io" \
     --email YOUR_EMAIL \
     --agree-tos --no-eff-email
   ```
   Then point nginx to that cert’s path (or copy the cert into `./nginx/certbot/conf/live/novasafe.io/` and reload nginx).

If you only have a few fixed team subdomains, you can instead add each one explicitly to the webroot cert, e.g.:

```bash
-d acme.novasafe.io
-d beta.novasafe.io
```

and so on, then reload nginx.

## Summary

| Problem | Cause | Fix |
|--------|--------|-----|
| Only https://novasafe.io is secure | Cert only has `novasafe.io` | Run certbot with `--expand` and all hostnames (step 2 above), then reload nginx |
| “Your connection isn’t private” on app/start/mobile-api/admin-api | Those hostnames not in cert | Same: one certbot run with all `-d` names, then reload nginx |
| Company subdomains (*.novasafe.io) not secure | Wildcard not in cert | Use DNS challenge and a cert with `*.novasafe.io`, or add each company subdomain explicitly |
